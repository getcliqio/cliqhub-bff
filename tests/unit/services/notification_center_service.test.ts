import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationCenterService } from '../../../src/services/notification_center_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const VIEWER = { user_id: 'u1', site_admin: false };
const ORG = { id: 'o1', slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 };
const rule = (id: string, event: string, over: Record<string, unknown> = {}) => ({ id, event, channel_id: 'c1', realm_id: null, org_id: 'o1', priority: 0, ...over });

function mocks() {
    return {
        orgs: { get: vi.fn().mockResolvedValue({ orgs: [ORG] }) },
        dash: { realms: vi.fn().mockResolvedValue({ realms: [{ id: 'r1', slug: 'prod', name: 'Prod' }] }) },
        control: {
            org_notification_rules: vi.fn().mockResolvedValue([rule('org-run', 'run.failed')]),
            realm_notification_rules: vi.fn().mockResolvedValue([
                rule('realm-run', 'run.*', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
                rule('realm-hug', 'hug.review_requested', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
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
    };
}

describe('NotificationCenterService.get', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => { m = mocks(); svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any); });

    it('composes rules across org + realm with scope and channel names; no rule replaces another', async () => {
        const dto = await svc.get({}, 'tok', VIEWER);
        expect(dto.rules.map((r) => [r.id, r.scope.kind, r.channel_name])).toEqual([
            // Sorted by selector ('run.*' < 'run.failed'), then broad → specific.
            ['realm-hug', 'realm', '#prod-oncall'], ['realm-run', 'realm', '#prod-oncall'], ['org-run', 'org', '#eng'],
        ]);
        expect(dto.rules.find((r) => r.id === 'realm-run')!.replaces).toEqual([]);
        expect(dto.rules.find((r) => r.id === 'realm-hug')!.scope).toEqual({ kind: 'realm', org_id: 'o1', org_slug: 'acme', realm_id: 'r1', realm_slug: 'prod' });
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

describe('NotificationCenterService.get — the org view lists every channel (C1)', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    const R2 = { id: 'r2', slug: 'staging', name: 'Staging', org_slug: 'acme' };
    beforeEach(() => {
        m = mocks();
        // The page shows r1; the whole org (every realm the viewer can see) is r1 + r2.
        m.control.realms_page.mockImplementation(async (p: { limit: number }) => (p.limit === 100
            ? { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }, R2], total: 2 }
            : { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 2 }));
        m.control.realm_channels.mockImplementation(async (realm_id: string) => (realm_id === 'r2'
            ? [{ id: 'c3', name: '#staging', realm_id: 'r2', org_id: null, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 0 }]
            : [{ id: 'c2', name: '#prod-oncall', realm_id: 'r1', org_id: null, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 2 }]));
        svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
    });

    it('channels of realms beyond the page are listed too, each with the realm it belongs to', async () => {
        const dto = await svc.get({ org_id: 'o1' }, 'tok', VIEWER);
        const staging = dto.channels.find((c) => c.name === '#staging')!;
        expect(staging.owner).toMatchObject({ kind: 'realm' });
        expect(JSON.stringify(staging)).toContain('staging');
        expect(dto.channels.map((c) => c.name)).toEqual(['#eng', '#prod-oncall', '#staging', 'Mine']);
        // Only the page's realms carry rules: r2's channels are listed, its rules are not read.
        expect(m.control.realm_notification_rules).toHaveBeenCalledTimes(1);
        expect(dto.partial).toBe(false);
    });

    it('a realm whose channels fail keeps the rest and flags partial', async () => {
        m.control.realm_channels.mockImplementation(async (realm_id: string) => {
            if (realm_id === 'r2') throw new ApiError('forbidden', 'Not a member', 403);
            return [{ id: 'c2', name: '#prod-oncall', realm_id: 'r1', org_id: null, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 2 }];
        });
        const dto = await svc.get({ org_id: 'o1' }, 'tok', VIEWER);
        expect(dto.channels.map((c) => c.name)).toContain('#prod-oncall');
        expect(dto.partial).toBe(true);
    });

    it('a realm view does not read other realms', async () => {
        await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        expect(m.control.realms_page).not.toHaveBeenCalled();
    });
});

describe('NotificationCenterService.get — the Events read (C2)', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => {
        m = mocks();
        m.control.event_types.mockResolvedValue(['run.failed', 'run.completed', 'hug.review_reminded', 'notification.unknown_channel']);
        m.control.org_notification_rules.mockResolvedValue([rule('org-run', 'run.failed', { system_key: 'org.run.failed' })]);
        m.control.realm_notification_rules.mockResolvedValue([
            rule('realm-hug', 'hug.*', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
            rule('realm-uc', 'notification.unknown_channel', { realm_id: 'r1', org_id: null, channel_id: 'c2', locked: true, lock_reason: 'Built in' }),
        ]);
        svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
    });
    const row = (dto: Awaited<ReturnType<NotificationCenterService['get']>>, e: string) =>
        dto.events!.flatMap((g) => g.events).find((r) => r.event === e)!;

    it('org view: every event, grouped by family in catalog order; one with no rule is not sent', async () => {
        const dto = await svc.get({ org_id: 'o1' }, 'tok', VIEWER);
        expect(dto.events!.map((g) => [g.family, g.events.map((r) => r.event)])).toEqual([
            ['run', ['run.failed', 'run.completed']], ['hug', ['hug.review_reminded']], ['notification', ['notification.unknown_channel']],
        ]);
        expect(row(dto, 'run.failed')).toMatchObject({ sent: true, built_in: true, fixed: false, realm: [] });
        expect(row(dto, 'run.failed').org.map((r) => r.channel_name)).toEqual(['#eng']);
        expect(row(dto, 'run.completed')).toMatchObject({ sent: false, org: [], realm: [] });
    });

    it('realm view: the realm\'s own rules too (a wildcard reaches its family); the fixed rule is flagged', async () => {
        const dto = await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        expect(row(dto, 'hug.review_reminded')).toMatchObject({ sent: true, fixed: false });
        expect(row(dto, 'hug.review_reminded').realm.map((r) => [r.selector, r.channel_name])).toEqual([['hug.*', '#prod-oncall']]);
        expect(row(dto, 'notification.unknown_channel')).toMatchObject({ sent: true, fixed: true });
        expect(row(dto, 'run.failed').org.map((r) => r.rule_id)).toEqual(['org-run']);
    });

    it('no single org or realm in view → null', async () => {
        expect((await svc.get({}, 'tok', VIEWER)).events).toBeNull();
    });
});

describe('NotificationCenterService.check', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    beforeEach(() => { m = mocks(); svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any); });

    it('resolves every event for the realm; the org\'s rule and the realm\'s wildcard both apply; gaps are empty', async () => {
        const dto = await svc.check({ realm_id: 'r1' }, 'tok');
        const row = (e: string) => dto.rows.find((r) => r.event === e)!;
        expect(row('run.failed').winners.map((w) => w.rule_id)).toEqual(['org-run', 'realm-run']);
        expect(row('run.failed').replaced).toEqual([]);
        expect(row('run.completed').winners.map((w) => w.selector)).toEqual(['run.*']);
        expect(row('hug.review_requested').winners.map((w) => [w.rule_id, w.tier])).toEqual([['realm-hug', 'realm']]);
        // No team level: nothing about teams in the answer.
        expect(dto).not.toHaveProperty('teams');
        expect(dto.realm).toMatchObject({ org_id: 'o1', org_slug: 'acme' });
    });

    it('realm lookup is the gate', async () => {
        m.control.realm_by_id.mockRejectedValue(new ApiError('not_found', 'Realm not found', 404));
        await expect(svc.check({ realm_id: 'x' }, 'tok')).rejects.toMatchObject({ status: 404 });
    });
});

describe('NotificationCenterService.get — what the viewer can edit', () => {
    const viewer = { user_id: 'u1', site_admin: false };
    // Core's seeded roles (auth/permissions.ts DEFAULT_ROLES): only the owner role is `is_system`;
    // the admin role holds every assignable permission, including `rules.manage` (org-wide rules).
    const ROLES = [
        { id: 'role-owner', org_id: 'o1', slug: 'owner', name: 'Owner', permissions: [], is_system: true, is_default: true, member_count: 1 },
        { id: 'role-admin', org_id: 'o1', slug: 'admin', name: 'Admin', permissions: ['channels.manage', 'channels.manage.realm', 'rules.manage', 'rules.manage.realm', 'org.settings'], is_system: false, is_default: true, member_count: 0 },
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
            scopes: [], roles: ROLES, available_permissions: [], owner_only_permissions: ['org.delete', 'org.transfer'],
        });
        (m.control as any).realm_members = vi.fn().mockResolvedValue(realm_members);
        return { m, svc: new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any) };
    }
    const flags = (dto: Awaited<ReturnType<NotificationCenterService['get']>>) =>
        ({ rules: dto.orgs[0].can_edit, channels: dto.orgs[0].can_edit_channels, realm: dto.realms[0].can_edit });

    it('owner role (found by role_id, whatever the legacy role says) edits everything', async () => {
        const { m, svc } = with_role('role-owner', 'admin');
        expect(flags(await svc.get({}, 'tok', viewer))).toEqual({ rules: true, channels: true, realm: true });
        expect((m.orgs as any).get_by_id).toHaveBeenCalledWith({ org_id: 'o1' }, 'tok');
    });

    it('admin (holds rules.manage): org rules, channels and realm edits', async () => {
        const { svc } = with_role('role-admin', 'admin');
        expect(flags(await svc.get({}, 'tok', viewer))).toEqual({ rules: true, channels: true, realm: true });
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
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const out = await svc.set_rules({ realm_id: 'r1', events: ['run.failed', 'run.crashed', 'run.failed'], channel_id: 'c2' }, 'tok');
        expect(out.saved.map((s) => s.event)).toEqual(['run.failed', 'run.crashed']);
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ realm_id: 'r1', event: 'run.crashed', channel_id: 'c2' }, 'tok');
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
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        expect(await svc.set_rules({ org_id: 'o1', events: ['run.failed', 'bad'], channel_id: 'c1' }, 'tok')).toEqual({
            removed: [],
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
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);

        await expect(svc.set_rules({ org_id: 'o1', events: ['invite.org.sent'], channel_id: 'c1' }, 'tok')).rejects.toBe(locked);

        expect(await svc.set_rules({ org_id: 'o1', events: ['invite.org.sent', 'invite.org.accepted'], channel_id: 'c1' }, 'tok')).toEqual({
            removed: [],
            saved: [{ event: 'invite.org.accepted', rule_id: 'ok' }],
            failed: [{ event: 'invite.org.sent', error: 'This rule is locked', code: 'locked', details: { system_key: 'invite.sent.invitee' } }],
        });
    });
});

describe('NotificationCenterService.set_rules — items, on/off and removals (Replace, Turn off, Reset)', () => {
    it('removes first, then writes each listed rule with its own channel and on/off', async () => {
        const m = mocks();
        const order: string[] = [];
        (m.control as any).remove_rule = vi.fn().mockImplementation(async (id: string) => { order.push(`rm:${id}`); return true; });
        (m.control as any).set_rule = vi.fn().mockImplementation(async (b: { event: string; channel_id: string }) => { order.push(`set:${b.channel_id}`); return { id: `id-${b.channel_id}` }; });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const out = await svc.set_rules({
            realm_id: 'r1',
            remove: ['00000000-0000-4000-8000-000000000001'],
            items: [{ event: 'run.failed', channel_id: 'c1', enabled: false }, { event: 'run.failed', channel_id: 'c2' }],
        }, 'tok');
        expect(order[0]).toBe('rm:00000000-0000-4000-8000-000000000001');
        expect((m.control as any).remove_rule).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', true, 'tok');
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ realm_id: 'r1', event: 'run.failed', channel_id: 'c1', enabled: false }, 'tok');
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ realm_id: 'r1', event: 'run.failed', channel_id: 'c2' }, 'tok');
        expect(out).toEqual({ removed: ['00000000-0000-4000-8000-000000000001'], saved: [{ event: 'run.failed', rule_id: 'id-c1' }, { event: 'run.failed', rule_id: 'id-c2' }], failed: [] });
    });

    it('a removal only (Reset) writes nothing; `enabled` with events switches them all', async () => {
        const m = mocks();
        (m.control as any).remove_rule = vi.fn().mockResolvedValue(true);
        (m.control as any).set_rule = vi.fn().mockResolvedValue({ id: 'x' });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        expect(await svc.set_rules({ org_id: 'o1', remove: ['00000000-0000-4000-8000-000000000002'] }, 'tok')).toEqual({ removed: ['00000000-0000-4000-8000-000000000002'], saved: [], failed: [] });
        expect((m.control as any).remove_rule).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002', false, 'tok');
        expect((m.control as any).set_rule).not.toHaveBeenCalled();
        await svc.set_rules({ org_id: 'o1', events: ['run.failed'], channel_id: 'c1', enabled: false }, 'tok');
        expect((m.control as any).set_rule).toHaveBeenCalledWith({ org_id: 'o1', event: 'run.failed', channel_id: 'c1', enabled: false }, 'tok');
    });
});

describe('NotificationCenterService.get — realm_events (each event as it stands in the realm)', () => {
    it('with realm_id: Default from the org, Both (the realm adds its own, wildcard too), Realm only, the realm\'s own off, Paused; locked and channel state carried', async () => {
        const m = mocks();
        m.control.org_notification_rules.mockResolvedValue([
            rule('o-run', 'run.failed'),
            rule('o-hug', 'hug.review_requested', { locked: true, lock_reason: 'Reviewers must hear' }),
            rule('o-done', 'run.completed', { enabled: false }),
            rule('o-dmn', 'daemon.offline'),
            rule('o-inv', 'invite.sent', { channel_id: 'c9' }),
        ]);
        m.control.realm_notification_rules.mockResolvedValue([
            rule('r-run', 'run.*', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
            rule('r-dmn', 'daemon.offline', { realm_id: 'r1', org_id: null, channel_id: 'c1', enabled: false }),
            rule('r-lld', 'custom.lld_approved', { realm_id: 'r1', org_id: null, channel_id: 'c2' }),
        ]);
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const dto = await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        const by = Object.fromEntries(dto.realm_events!.map((e) => [e.event, e]));
        expect(by['run.failed']).toMatchObject({ status: 'both', via: 'run.*' });
        expect(by['run.completed']).toMatchObject({ status: 'both', via: 'run.*' });
        expect(by['run.*']).toMatchObject({ status: 'realm_only', via: null });
        expect(by['custom.lld_approved']).toMatchObject({ status: 'realm_only' });
        // The realm switched its own rule off; the org's still sends.
        expect(by['daemon.offline']).toMatchObject({ status: 'default' });
        expect(by['hug.review_requested']).toMatchObject({ status: 'default', locked: true });
        expect(by['hug.review_requested'].org[0]).toMatchObject({ rule_id: 'o-hug', tier: 'org', channel_name: '#eng', channel_enabled: true, locked: true });
        // The org's personal-channel rule on a switched-off channel: still Default, the channel says it's off.
        expect(by['invite.sent']).toMatchObject({ status: 'default' });
        expect(by['invite.sent'].org[0]).toMatchObject({ channel_name: 'Mine', channel_enabled: false });
        // Without realm_id there are no realm rows.
        expect((await svc.get({}, 'tok', VIEWER)).realm_events).toBeNull();
    });

    it('the org paused every rule for an event → Paused', async () => {
        const m = mocks();
        m.control.org_notification_rules.mockResolvedValue([rule('o-done', 'run.completed', { enabled: false })]);
        m.control.realm_notification_rules.mockResolvedValue([]);
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const dto = await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        expect(dto.realm_events).toEqual([expect.objectContaining({ event: 'run.completed', status: 'paused', realm: [] })]);
        expect(dto.rules.find((r) => r.id === 'o-done')).toMatchObject({ enabled: false });
    });
});

describe('NotificationCenterService.get — realm paging', () => {
    it('reads rules/channels only for the realms on the page; org data always', async () => {
        const m = mocks();
        m.control.realms_page.mockResolvedValue({ items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }, { id: 'rx', slug: 'other', name: 'x', org_slug: 'not-mine' }], total: 37 });
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
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
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const dto = await svc.get({ realm_id: 'r1' }, 'tok', VIEWER);
        expect(m.control.realm_by_id).toHaveBeenCalledWith('r1', 'tok');
        expect(m.control.realms_page).not.toHaveBeenCalled();
        expect(dto.realms.map((r) => r.slug)).toEqual(['prod']);
    });

    it('realm search failing keeps org rules and flags partial', async () => {
        const m = mocks();
        m.control.realms_page.mockRejectedValue(new ApiError('upstream', 'Core down', 502));
        const svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
        const dto = await svc.get({}, 'tok', VIEWER);
        expect(dto.partial).toBe(true);
        expect(dto.realm_page).toMatchObject({ status: 'error', error: 'Core down' });
        expect(dto.rules.map((r) => r.id)).toEqual(['org-run']);
    });
});

describe('NotificationCenterService.change_destinations', () => {
    let m: ReturnType<typeof mocks>;
    let svc: NotificationCenterService;
    let set: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        m = mocks();
        set = vi.fn().mockImplementation(async (id: string, destinations: unknown[]) => ({ id, destinations }));
        (m.control as any).set_channel_destinations = set;
        svc = new NotificationCenterService(m.orgs as any, m.dash as any, m.control as any);
    });

    it('adding sends Core the full list (unmasked from Core) plus the new one; returns it masked', async () => {
        const out = await svc.change_destinations({ id: 'c1', org_id: 'o1', add_destination: { type: 'email', address: 'ops@a.com' } }, 'tok');
        expect(m.control.org_channels).toHaveBeenCalledWith('o1', 'tok');
        expect(set).toHaveBeenCalledWith('c1', [{ type: 'slack', webhook_url: 'https://h/x/1234' }, { type: 'email', address: 'ops@a.com' }], 'tok');
        expect(out.destinations.map((d) => d.type)).toEqual(['slack', 'email']);
        expect(JSON.stringify(out)).not.toContain('https://h/x');
    });

    it('removing takes out the one at that place; a realm channel is read from its realm', async () => {
        m.control.realm_channels.mockResolvedValue([{ id: 'c2', name: 'x', realm_id: 'r1', org_id: null, user_id: null, destinations: [{ type: 'cliqhub' }, { type: 'webhook', url: 'https://pd/hook' }], enabled: 1 }]);
        await svc.change_destinations({ id: 'c2', realm_id: 'r1', remove_destination: { index: 0, type: 'cliqhub' } }, 'tok');
        expect(set).toHaveBeenCalledWith('c2', [{ type: 'webhook', url: 'https://pd/hook' }], 'tok');
    });

    it('refuses: the last destination (422), a changed list (409), a channel not in that org or realm (404)', async () => {
        await expect(svc.change_destinations({ id: 'c1', org_id: 'o1', remove_destination: { index: 0, type: 'slack' } }, 'tok')).rejects.toMatchObject({ status: 422 });
        await expect(svc.change_destinations({ id: 'c1', org_id: 'o1', remove_destination: { index: 0, type: 'email' } }, 'tok')).rejects.toMatchObject({ status: 409 });
        await expect(svc.change_destinations({ id: 'c2', org_id: 'o1', add_destination: { type: 'cliqhub' } }, 'tok')).rejects.toMatchObject({ status: 404 });
        expect(set).not.toHaveBeenCalled();
    });
});
