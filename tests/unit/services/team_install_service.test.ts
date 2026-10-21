/**
 * Installing one team into several realms: pre-flight every realm (nothing installed when any
 * fails, each failure named), then one Core install per realm (a Core refusal names the realms
 * that did not get it).
 */
import { describe, it, expect, vi } from 'vitest';
import { TeamInstallService } from '../../../src/services/team_install_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const ORG = { id: 'o1', slug: 'acme', display_name: 'Acme', role: 'member', member_count: 3, scope_count: 1, status: 'active', owner: null, deleted_at: null };
const ROLES = {
    owner: { id: 'role-owner', slug: 'owner', name: 'Owner', permissions: [], is_system: true },
    operator: { id: 'role-op', slug: 'operator', name: 'Operator', permissions: ['realms.teams.manage', 'teams.install'], is_system: false },
    member: { id: 'role-mem', slug: 'member', name: 'Member', permissions: ['realms.view'], is_system: false },
};
const REALMS: Record<string, { id: string; slug: string; name: string; org_slug: string; owner_user_id: string }> = {
    r1: { id: 'r1', slug: 'prod', name: 'prod', org_slug: 'acme', owner_user_id: 'u-owner' },
    r2: { id: 'r2', slug: 'staging', name: 'staging', org_slug: 'acme', owner_user_id: 'u-owner' },
    r3: { id: 'r3', slug: 'sandbox', name: 'sandbox', org_slug: 'acme', owner_user_id: 'u-owner' },
};

function setup(opts: {
    role?: keyof typeof ROLES;
    realm_roles?: Record<string, string | null>;
    org_teams?: Array<{ scope: string; name: string }>;
    hidden?: string[];
    add_team?: (realm_id: string) => Promise<Record<string, unknown>>;
} = {}) {
    const role = ROLES[opts.role ?? 'operator'];
    const orgs = {
        get: vi.fn().mockResolvedValue({ orgs: [ORG] }),
        get_by_id: vi.fn().mockResolvedValue({
            id: 'o1', slug: 'acme', members: [{ user_id: 'u1', role_id: role.id, status: 'active' }],
            roles: Object.values(ROLES), scopes: [{ slug: 'acme' }],
        }),
    };
    const control = {
        realm_by_id: vi.fn(async (id: string) => {
            if (opts.hidden?.includes(id)) throw new ApiError('not_found', 'Realm not found', 404);
            return REALMS[id];
        }),
        realm_members: vi.fn(async (id: string) => {
            const r = (opts.realm_roles ?? {})[id];
            return r === null ? [] : [{ member_type: 'user', member_id: 'u1', role: r ?? 'operator' }];
        }),
        org_teams: vi.fn().mockResolvedValue((opts.org_teams ?? []).map((t) => ({ team_id: 't', own: false, ...t }))),
        add_team: vi.fn(async (b: { realm_id: string }) => (opts.add_team ? opts.add_team(b.realm_id) : { ok: true })),
    };
    const svc = new TeamInstallService(orgs as never, control as never);
    return { svc, control };
}
const viewer = { user_id: 'u1', site_admin: false };
const caught = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as ApiError; } throw new Error('expected a throw'); };

describe('TeamInstallService.install', () => {
    it('all realms pass: installs into each, one Core call per realm, in order', async () => {
        const { svc, control } = setup();
        const res = await svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'] }, 'tok', viewer);
        expect(res.installed).toEqual([{ realm_id: 'r1', realm_slug: 'prod' }, { realm_id: 'r2', realm_slug: 'staging' }]);
        expect(control.add_team.mock.calls.map((c) => c[0])).toEqual([
            { realm_id: 'r1', scope: 'acme', slug: 'kyc' }, { realm_id: 'r2', scope: 'acme', slug: 'kyc' },
        ]);
    });

    it('a version given is what every realm records', async () => {
        const { svc, control } = setup();
        await svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'], version: '1.4.0' }, 'tok', viewer);
        expect(control.add_team.mock.calls.map((c) => c[0])).toEqual([
            { realm_id: 'r1', scope: 'acme', slug: 'kyc', version: '1.4.0' }, { realm_id: 'r2', scope: 'acme', slug: 'kyc', version: '1.4.0' },
        ]);
    });

    it('one realm where the viewer only views: nothing installed, that realm named with the reason', async () => {
        const { svc, control } = setup({ realm_roles: { r2: 'member' } });
        const err = await caught(svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'] }, 'tok', viewer));
        expect(err).toMatchObject({ code: 'install_blocked', status: 403 });
        expect(err.message).toMatch(/^Nothing was installed/);
        expect(err.message).toContain('staging');
        expect(err.details).toEqual({ failed: [{ realm_id: 'r2', realm_slug: 'staging', code: 'level_too_low', error: expect.stringMatching(/only view/) }] });
        expect(control.add_team).not.toHaveBeenCalled();
    });

    it('a role without realms.teams.manage, a realm the viewer is not in, a hidden realm: each named, nothing installed', async () => {
        const member = setup({ role: 'member' });
        const e1 = await caught(member.svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1'] }, 'tok', viewer));
        expect((e1.details as { failed: Array<{ code: string }> }).failed[0].code).toBe('missing_permission');

        const outsider = setup({ realm_roles: { r1: null }, hidden: ['r3'] });
        const e2 = await caught(outsider.svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2', 'r3'] }, 'tok', viewer));
        expect((e2.details as { failed: Array<{ realm_id: string; code: string }> }).failed.map((f) => [f.realm_id, f.code]))
            .toEqual([['r1', 'not_a_member'], ['r3', 'realm_not_found']]);
        expect(outsider.control.add_team).not.toHaveBeenCalled();
    });

    it('a team from another org’s scope that is not in this org needs teams.install', async () => {
        const { svc } = setup({ role: 'member', realm_roles: {} });
        // Even with realm rights, the member role holds neither realms.teams.manage nor teams.install.
        const err = await caught(svc.install({ scope: 'other', slug: 'kyc', realm_ids: ['r1'] }, 'tok', viewer));
        expect(err.code).toBe('install_blocked');
        const ok = setup({ org_teams: [{ scope: 'other', name: 'kyc' }] });
        await expect(ok.svc.install({ scope: 'other', slug: 'kyc', realm_ids: ['r1'] }, 'tok', viewer)).resolves.toBeTruthy();
    });

    it('org owner and site admin pass without a realm role', async () => {
        const owner = setup({ role: 'owner', realm_roles: { r1: null } });
        await expect(owner.svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1'] }, 'tok', viewer)).resolves.toBeTruthy();
        expect(owner.control.realm_members).not.toHaveBeenCalled();
        const admin = setup({ role: 'member', realm_roles: { r1: null } });
        await expect(admin.svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1'] }, 'tok', { user_id: 'u1', site_admin: true })).resolves.toBeTruthy();
    });

    it('Core refuses one realm after the pre-flight: the error says which realms did and did not get it', async () => {
        const { svc } = setup({
            add_team: async (id) => {
                if (id === 'r2') throw new ApiError('forbidden', 'Realm is archived', 409);
                return { ok: true };
            },
        });
        const err = await caught(svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2', 'r3'] }, 'tok', viewer));
        expect(err).toMatchObject({ code: 'install_incomplete', status: 409 });
        expect(err.message).toBe('Installed in prod and sandbox. Installation was not successful on staging — staging: Realm is archived');
        expect(err.details).toEqual({
            installed: [{ realm_id: 'r1', realm_slug: 'prod' }, { realm_id: 'r3', realm_slug: 'sandbox' }],
            failed: [{ realm_id: 'r2', realm_slug: 'staging', code: 'forbidden', error: 'Realm is archived' }],
        });
    });

    it('a pre-flight read that fails (not a refusal) leaves the realm to Core', async () => {
        const { svc, control } = setup();
        control.realm_members.mockRejectedValueOnce(new Error('timeout'));
        await expect(svc.install({ scope: 'acme', slug: 'kyc', realm_ids: ['r1'] }, 'tok', viewer)).resolves.toMatchObject({ installed: [{ realm_id: 'r1' }] });
    });
});
