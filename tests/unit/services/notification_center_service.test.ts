import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCenterService } from '../../../src/services/notification_center_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const VIEWER = { user_id: 'u1', site_admin: false };
const ORG = { id: 'o1', slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 };
const rule = (id: string, event: string, over: Record<string, unknown> = {}) => ({ id, event, channel_id: 'c1', realm_id: null, org_id: 'o1', team_slug: null, priority: 0, ...over });

function mocks() {
    return {
        orgs: { get: vi.fn().mockResolvedValue({ orgs: [ORG] }) },
        dash: { realms: vi.fn().mockResolvedValue({ realms: [{ id: 'r1', slug: 'prod', name: 'Prod' }] }) },
        control: {
            org_notification_rules: vi.fn().mockResolvedValue([rule('org-run', 'run.failed')]),
            realm_notification_rules: vi.fn().mockResolvedValue([
                rule('realm-run', 'run.*', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
                rule('team-hug', 'hug.review_requested', { realm_id: 'r1', org_id: null, team_slug: 'dev', channel_id: 'c2' }),
            ]),
            org_channels: vi.fn().mockResolvedValue([
                { id: 'c1', name: '#eng', realm_id: null, org_id: 'o1', user_id: null, destinations: [{ type: 'slack', webhook_url: 'https://h/x/1234' }], enabled: 1, rule_count: 1 },
                { id: 'c9', name: 'Mine', realm_id: null, org_id: 'o1', user_id: 'u1', destinations: [{ type: 'email', address: 'me@a.com' }], enabled: 0, rule_count: 0 },
            ]),
            realm_channels: vi.fn().mockResolvedValue([{ id: 'c2', name: '#prod-oncall', realm_id: 'r1', org_id: null, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 2 }]),
            event_types: vi.fn().mockResolvedValue(['run.failed', 'run.completed', 'hug.review_requested']),
            realm_by_id: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }),
            realms_page: vi.fn().mockResolvedValue({ items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 1 }),
        },
        // Core teams/get { realm_id } → PagedData<TeamData>; slug falls back to name.
        teams: { get: vi.fn().mockResolvedValue({ items: [{ slug: 'dev', name: 'dev', scope: null }, { name: 'ops', scope: null }], total: 2, offset: 0, limit: 200 }) },
    };
}

describe('NotificationCenterService.get', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => { m = mocks(); svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any); });

    it('composes rules across org + realm with scope, channel names and replaces', async () => {
        const dto = await svc.get({}, 'tok', VIEWER);
        expect(dto.rules.map((r) => [r.id, r.scope.kind, r.channel_name])).toEqual([
            // Sorted by selector ('run.*' < 'run.failed'), then broad → specific.
            ['team-hug', 'team', '#prod-oncall'], ['realm-run', 'realm', '#prod-oncall'], ['org-run', 'org', '#eng'],
        ]);
        expect(dto.rules.find((r) => r.id === 'realm-run')!.replaces).toEqual(['org-run']);
        expect(dto.rules.find((r) => r.id === 'team-hug')!.scope).toMatchObject({ realm_slug: 'prod', team_slug: 'dev', org_slug: 'acme' });
        expect(dto.channels.map((c) => [c.name, c.owner.kind, c.enabled])).toEqual([['#eng', 'org', true], ['#prod-oncall', 'realm', true], ['Mine', 'personal', false]]);
        expect(dto.channels[0].destinations[0].label).toBe('Slack webhook ••••1234');
        expect(dto.event_types).toHaveLength(3);
        expect(dto.partial).toBe(false);
        for (const fn of Object.values(m.control)) for (const c of (fn as any).mock.calls) expect(c.at(-1)).toBe('tok');
    });

    it('org filter must be a membership', async () => {
        await expect(svc.get({ org_id: 'nope' }, 'tok', VIEWER)).rejects.toMatchObject({ status: 403 });
    });

    it('one realm failing keeps the rest and flags partial', async () => {
        m.control.realm_channels.mockRejectedValue(new ApiError('forbidden', 'Not a member', 403));
        const dto = await svc.get({}, 'tok', VIEWER);
        expect(dto.partial).toBe(true);
        expect(dto.realms[0]).toMatchObject({ status: 'error', error: 'Not a member' });
        expect(dto.rules.find((r) => r.id === 'realm-run')!.channel_name).toBeNull();
    });
});

describe('NotificationCenterService.check', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => { m = mocks(); svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any); });

    it('resolves every event for the realm; realm wildcard replaces the org rule; gaps are empty', async () => {
        const dto = await svc.check({ realm_id: 'r1' }, 'tok');
        const row = (e: string) => dto.rows.find((r) => r.event === e)!;
        expect(row('run.failed').winners.map((w) => w.rule_id)).toEqual(['realm-run']);
        expect(row('run.failed').replaced.map((w) => w.rule_id)).toEqual(['org-run']);
        expect(row('run.completed').winners.map((w) => w.selector)).toEqual(['run.*']);
        // Team rule does not apply without choosing the team.
        expect(row('hug.review_requested').winners).toEqual([]);
        expect(dto.teams).toEqual(['dev', 'ops']);
        expect(m.teams.get).toHaveBeenCalledWith({ realm_id: 'r1', limit: 200 }, 'tok');
        expect(dto.realm).toMatchObject({ org_id: 'o1', org_slug: 'acme' });
    });

    it('with a team, its rules win', async () => {
        const dto = await svc.check({ realm_id: 'r1', team_slug: 'dev' }, 'tok');
        expect(dto.rows.find((r) => r.event === 'hug.review_requested')!.winners).toEqual([
            { rule_id: 'team-hug', selector: 'hug.review_requested', tier: 'team', channel_id: 'c2', channel_name: '#prod-oncall' },
        ]);
    });

    it('realm lookup is the gate', async () => {
        m.control.realm_by_id.mockRejectedValue(new ApiError('not_found', 'Realm not found', 404));
        await expect(svc.check({ realm_id: 'x' }, 'tok')).rejects.toMatchObject({ status: 404 });
    });
});

describe('NotificationCenterService.get — what the viewer can edit', () => {
    const viewer = { user_id: 'u1', site_admin: false };
    // Core's seeded roles (auth/permissions.ts DEFAULT_ROLES): only the owner role is `is_system`;
    // the admin role holds every assignable permission, which excludes the owner-only `rules.manage`.
    const ROLES = [
        { id: 'role-owner', org_id: 'o1', slug: 'owner', name: 'Owner', permissions: [], is_system: true, is_default: true, member_count: 1 },
        { id: 'role-admin', org_id: 'o1', slug: 'admin', name: 'Admin', permissions: ['channels.manage', 'channels.manage.realm', 'rules.manage.realm', 'org.settings'], is_system: false, is_default: true, member_count: 0 },
        { id: 'role-operator', org_id: 'o1', slug: 'operator', name: 'Operator', permissions: ['rules.manage.realm', 'channels.manage.realm'], is_system: false, is_default: true, member_count: 0 },
        { id: 'role-member', org_id: 'o1', slug: 'member', name: 'Member', permissions: ['inbox.view'], is_system: false, is_default: true, member_count: 0 },
    ];
    /** The viewer holds `role_id`; `legacy_role` is the `role` column `orgs/get { mine }` reports (an owner shows as `admin`). */
    function with_role(role_id: string, legacy_role: string, realm_members: Array<{ member_type: string; member_id: string; role: string }> = []) {
        const m = mocks();
        m.orgs.get.mockResolvedValue({ orgs: [{ ...ORG, role: legacy_role }] });
        (m.orgs as any).get_by_id = vi.fn().mockResolvedValue({
            id: 'o1', slug: 'acme', display_name: 'Acme', created_at: '2026-10-02T10:00:00Z', status: 'active',
            owner: null, deleted_at: null, pending_owner_invite: null, my_role: legacy_role,
            members: [{ user_id: 'u1', username: 'me', display_name: 'Me', email: 'me@example.test', role: legacy_role, role_id, status: 'active', invited_at: null, joined_at: '2026-10-02T10:00:00Z', deleted_at: null }],
            scopes: [], roles: ROLES, available_permissions: [], owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
        });
        (m.control as any).realm_members = vi.fn().mockResolvedValue(realm_members);
        return { m, svc: new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any) };
    }
    const flags = (dto: Awaited<ReturnType<NotificationCenterService['get']>>) =>
        ({ rules: dto.orgs[0].can_edit, channels: dto.orgs[0].can_edit_channels, realm: dto.realms[0].can_edit });

    it('owner role (found by role_id, whatever the legacy role says) edits everything', async () => {
        const { m, svc } = with_role('role-owner', 'admin');
        expect(flags(await svc.get({}, 'tok', viewer))).toEqual({ rules: true, channels: true, realm: true });
        expect((m.orgs as any).get_by_id).toHaveBeenCalledWith({ org_id: 'o1' }, 'tok');
    });

    it('admin: org channels and realm edits, but not org rules (owner-only)', async () => {
        const { svc } = with_role('role-admin', 'admin');
        expect(flags(await svc.get({}, 'tok', viewer))).toEqual({ rules: false, channels: true, realm: true });
    });

    it('operator: realm edits only', async () => {
        const { m, svc } = with_role('role-operator', 'member');
        expect(flags(await svc.get({}, 'tok', viewer))).toEqual({ rules: false, channels: false, realm: true });
        expect((m.control as any).realm_members).not.toHaveBeenCalled();
    });

    it('member: view only, unless realm admin', async () => {
        const plain = with_role('role-member', 'member');
        expect(flags(await plain.svc.get({}, 'tok', viewer))).toEqual({ rules: false, channels: false, realm: false });
        const admin = with_role('role-member', 'member', [{ member_type: 'user', member_id: 'u1', role: 'admin' }]);
        expect((await admin.svc.get({}, 'tok', viewer)).realms[0].can_edit).toBe(true);
        expect((admin.m.control as any).realm_members).toHaveBeenCalledWith('r1', 'tok');
    });

    it('a failed role read leaves the org editable (Core decides on write)', async () => {
        const { m, svc } = with_role('role-member', 'member');
        (m.orgs as any).get_by_id.mockRejectedValue(new ApiError('internal_error', 'boom', 500));
        const dto = await svc.get({}, 'tok', viewer);
        expect([dto.orgs[0].can_edit, dto.orgs[0].can_edit_channels]).toEqual([true, true]);
    });

    it('site admin can edit everything without a role read', async () => {
        const { m, svc } = with_role('role-member', 'member');
        expect(flags(await svc.get({}, 'tok', { user_id: 'u1', site_admin: true }))).toEqual({ rules: true, channels: true, realm: true });
        expect((m.orgs as any).get_by_id).not.toHaveBeenCalled();
    });
});

describe('NotificationCenterService.set_rules', () => {
    it('writes one rule per event at the chosen level, as the bearer', async () => {
        const m = mocks();
        (m.control as any).set_rule = vi.fn().mockImplementation(async (b: { event: string }) => ({ id: `id-${b.event}` }));
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const out = await svc.set_rules({ realm_id: 'r1', team_slug: 'dev', events: ['run.failed', 'run.crashed', 'run.failed'], channel_id: 'c2' }, 'tok');
        expect(out.saved.map((s) => s.event)).toEqual(['run.failed', 'run.crashed']);
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ realm_id: 'r1', team_slug: 'dev', event: 'run.crashed', channel_id: 'c2' }, 'tok');
        const org = await svc.set_rules({ org_id: 'o1', events: ['*'], channel_id: 'c1' }, 'tok');
        expect(org.saved).toEqual([{ event: '*', rule_id: 'id-*' }]);
        expect((m.control as any).set_rule).toHaveBeenLastCalledWith({ org_id: 'o1', event: '*', channel_id: 'c1' }, 'tok');
    });

    it('reports partial failures; throws when every write fails', async () => {
        const m = mocks();
        (m.control as any).set_rule = vi.fn().mockImplementation(async (b: { event: string }) => {
            if (b.event === 'bad') throw new ApiError('bad_request', 'Nope', 400);
            return { id: 'ok' };
        });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        expect(await svc.set_rules({ org_id: 'o1', events: ['run.failed', 'bad'], channel_id: 'c1' }, 'tok')).toEqual({
            saved: [{ event: 'run.failed', rule_id: 'ok' }],
            failed: [{ event: 'bad', error: 'Nope', code: 'bad_request', details: null }],
        });
        (m.control as any).set_rule.mockRejectedValue(new ApiError('forbidden', 'Admins only', 403));
        await expect(svc.set_rules({ org_id: 'o1', events: ['a', 'b'], channel_id: 'c1' }, 'tok')).rejects.toMatchObject({ status: 403 });
    });

    it('409 locked: thrown unchanged when every write is locked; per event with code and details otherwise', async () => {
        const m = mocks();
        const locked = new ApiError('locked', 'This rule is locked', 409, { system_key: 'invite.sent.invitee' });
        (m.control as any).set_rule = vi.fn().mockImplementation(async (b: { event: string }) => {
            if (b.event === 'invite.org.sent') throw locked;
            return { id: 'ok' };
        });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);

        await expect(svc.set_rules({ org_id: 'o1', events: ['invite.org.sent'], channel_id: 'c1' }, 'tok')).rejects.toBe(locked);

        expect(await svc.set_rules({ org_id: 'o1', events: ['invite.org.sent', 'invite.org.accepted'], channel_id: 'c1' }, 'tok')).toEqual({
            saved: [{ event: 'invite.org.accepted', rule_id: 'ok' }],
            failed: [{ event: 'invite.org.sent', error: 'This rule is locked', code: 'locked', details: { system_key: 'invite.sent.invitee' } }],
        });
    });
});

describe('NotificationCenterService.get — realm paging', () => {
    it('reads rules/channels only for the realms on the page; org data always', async () => {
        const m = mocks();
        m.control.realms_page.mockResolvedValue({ items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }, { id: 'rx', slug: 'other', name: 'x', org_slug: 'not-mine' }], total: 37 });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const dto = await svc.get({ realm_q: 'pro', realm_limit: 10, realm_offset: 20 }, 'tok', VIEWER);
        expect(m.control.realms_page).toHaveBeenCalledWith({ org_id: undefined, query: 'pro', limit: 10, offset: 20 }, 'tok');
        // Realms of orgs outside the view are dropped.
        expect(dto.realms.map((r) => r.id)).toEqual(['r1']);
        expect(m.control.realm_notification_rules).toHaveBeenCalledTimes(1);
        expect(dto.realm_page).toEqual({ offset: 20, limit: 10, total: 37, q: 'pro', status: 'ok', error: null });
        expect(m.control.org_notification_rules).toHaveBeenCalledWith('o1', 'tok');
        expect(m.dash.realms).not.toHaveBeenCalled();
    });

    it('realm view reads just that realm', async () => {
        const m = mocks();
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const dto = await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        expect(m.control.realm_by_id).toHaveBeenCalledWith('r1', 'tok');
        expect(m.control.realms_page).not.toHaveBeenCalled();
        expect(dto.realms.map((r) => r.slug)).toEqual(['prod']);
    });

    it('realm search failing keeps org rules and flags partial', async () => {
        const m = mocks();
        m.control.realms_page.mockRejectedValue(new ApiError('upstream', 'Core down', 502));
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const dto = await svc.get({}, 'tok', VIEWER);
        expect(dto.partial).toBe(true);
        expect(dto.realm_page).toMatchObject({ status: 'error', error: 'Core down' });
        expect(dto.rules.map((r) => r.id)).toEqual(['org-run']);
    });
});
