import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCenterService } from '../../../src/services/notification_center_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

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
        teams: { get: vi.fn().mockResolvedValue({ data: { rows: [{ slug: 'dev' }, { slug: 'ops' }] } }) },
    };
}

describe('NotificationCenterService.get', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => { m = mocks(); svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any); });

    it('composes rules across org + realm with scope, channel names and replaces', async () => {
        const dto = await svc.get('tok');
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
        await expect(svc.get('tok', { org_id: 'nope' })).rejects.toMatchObject({ status: 403 });
    });

    it('one realm failing keeps the rest and flags partial', async () => {
        m.control.realm_channels.mockRejectedValue(new ApiError('forbidden', 'Not a member', 403));
        const dto = await svc.get('tok');
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
        const dto = await svc.check('tok', { realm_id: 'r1' });
        const row = (e: string) => dto.rows.find((r) => r.event === e)!;
        expect(row('run.failed').winners.map((w) => w.rule_id)).toEqual(['realm-run']);
        expect(row('run.failed').replaced.map((w) => w.rule_id)).toEqual(['org-run']);
        expect(row('run.completed').winners.map((w) => w.selector)).toEqual(['run.*']);
        // Team rule does not apply without choosing the team.
        expect(row('hug.review_requested').winners).toEqual([]);
        expect(dto.teams).toEqual(['dev', 'ops']);
        expect(dto.realm).toMatchObject({ org_id: 'o1', org_slug: 'acme' });
    });

    it('with a team, its rules win', async () => {
        const dto = await svc.check('tok', { realm_id: 'r1', team_slug: 'dev' });
        expect(dto.rows.find((r) => r.event === 'hug.review_requested')!.winners).toEqual([
            { rule_id: 'team-hug', selector: 'hug.review_requested', tier: 'team', channel_id: 'c2', channel_name: '#prod-oncall' },
        ]);
    });

    it('realm lookup is the gate', async () => {
        m.control.realm_by_id.mockRejectedValue(new ApiError('not_found', 'Realm not found', 404));
        await expect(svc.check('tok', { realm_id: 'x' })).rejects.toMatchObject({ status: 404 });
    });
});

describe('NotificationCenterService.get — what the viewer can edit', () => {
    const viewer = { user_id: 'u1', site_admin: false };
    function with_role(role: string, perms: string[] | null, members: Array<{ member_type: string; member_id: string; role: string }> = []) {
        const m = mocks();
        m.orgs.get.mockResolvedValue({ orgs: [{ ...ORG, role }] });
        (m.orgs as any).list_roles = vi.fn().mockResolvedValue({ roles: perms ? [{ slug: role, permissions: perms, is_system: false }] : [] });
        (m.control as any).realm_members = vi.fn().mockResolvedValue(members);
        return { m, svc: new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any) };
    }

    it('owner can edit everything without a role lookup', async () => {
        const { m, svc } = with_role('owner', null);
        const dto = await svc.get('tok', {}, viewer);
        expect(dto.orgs[0].can_edit).toBe(true);
        expect(dto.realms[0].can_edit).toBe(true);
        expect((m.orgs as any).list_roles).not.toHaveBeenCalled();
    });

    it('operator: realm edits only', async () => {
        const { m, svc } = with_role('operator', ['rules.manage.realm', 'channels.manage.realm']);
        const dto = await svc.get('tok', {}, viewer);
        expect(dto.orgs[0].can_edit).toBe(false);
        expect(dto.realms[0].can_edit).toBe(true);
        expect((m.control as any).realm_members).not.toHaveBeenCalled();
    });

    it('member: view only, unless realm admin', async () => {
        const plain = with_role('member', ['inbox.view']);
        const dto = await plain.svc.get('tok', {}, viewer);
        expect([dto.orgs[0].can_edit, dto.realms[0].can_edit]).toEqual([false, false]);
        const admin = with_role('member', ['inbox.view'], [{ member_type: 'user', member_id: 'u1', role: 'admin' }]);
        expect((await admin.svc.get('tok', {}, viewer)).realms[0].can_edit).toBe(true);
        expect((admin.m.control as any).realm_members).toHaveBeenCalledWith('r1', 'tok');
    });

    it('site admin can edit everything', async () => {
        const { svc } = with_role('member', ['inbox.view']);
        const dto = await svc.get('tok', {}, { user_id: 'u1', site_admin: true });
        expect([dto.orgs[0].can_edit, dto.realms[0].can_edit]).toEqual([true, true]);
    });
});

describe('NotificationCenterService.set_rules', () => {
    it('writes one rule per event at the chosen level, as the bearer', async () => {
        const m = mocks();
        (m.control as any).set_rule = vi.fn().mockImplementation(async (b: { event: string }) => ({ id: `id-${b.event}` }));
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const out = await svc.set_rules('tok', { realm_id: 'r1', team_slug: 'dev', events: ['run.failed', 'run.crashed', 'run.failed'], channel_id: 'c2' });
        expect(out.saved.map((s) => s.event)).toEqual(['run.failed', 'run.crashed']);
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ realm_id: 'r1', team_slug: 'dev', event: 'run.crashed', channel_id: 'c2' }, 'tok');
        const org = await svc.set_rules('tok', { org_id: 'o1', events: ['*'], channel_id: 'c1' });
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
        expect(await svc.set_rules('tok', { org_id: 'o1', events: ['run.failed', 'bad'], channel_id: 'c1' })).toEqual({ saved: [{ event: 'run.failed', rule_id: 'ok' }], failed: [{ event: 'bad', error: 'Nope' }] });
        (m.control as any).set_rule.mockRejectedValue(new ApiError('forbidden', 'Admins only', 403));
        await expect(svc.set_rules('tok', { org_id: 'o1', events: ['a', 'b'], channel_id: 'c1' })).rejects.toMatchObject({ status: 403 });
    });
});

describe('NotificationCenterService.get — realm paging', () => {
    it('reads rules/channels only for the realms on the page; org data always', async () => {
        const m = mocks();
        m.control.realms_page.mockResolvedValue({ items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }, { id: 'rx', slug: 'other', name: 'x', org_slug: 'not-mine' }], total: 37 });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const dto = await svc.get('tok', { realm_q: 'pro', realm_limit: 10, realm_offset: 20 });
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
        const dto = await svc.get('tok', { realm_id: 'r1' });
        expect(m.control.realm_by_id).toHaveBeenCalledWith('r1', 'tok');
        expect(m.control.realms_page).not.toHaveBeenCalled();
        expect(dto.realms.map((r) => r.slug)).toEqual(['prod']);
    });

    it('realm search failing keeps org rules and flags partial', async () => {
        const m = mocks();
        m.control.realms_page.mockRejectedValue(new ApiError('upstream', 'Core down', 502));
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any, m.teams as any);
        const dto = await svc.get('tok');
        expect(dto.partial).toBe(true);
        expect(dto.realm_page).toMatchObject({ status: 'error', error: 'Core down' });
        expect(dto.rules.map((r) => r.id)).toEqual(['org-run']);
    });
});
