import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { stub_core, ok, fail } from '../helpers/core_stub.js';
import { CoreClient } from '../../src/repositories/core_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';

describe('notification center routes', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];
    beforeAll(() => { ({ app, session_store } = create_test_app()); });
    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.touch.mockResolvedValue(undefined);
    });
    function sess(extra: Record<string, unknown> = {}) {
        const now = Math.floor(Date.now() / 1000);
        const sid = `nc-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600, ...extra });
        return sid;
    }
    function mock() {
        const api = vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 1, scope_count: 1 }] } as any;
            if (path === '/v1/teams/get') return { ok: true, data: { rows: [{ slug: 'dev' }], total: 1 } } as any;
            if (path === '/v1/orgs/get_by_id') return {
                id: ORG, slug: 'acme', display_name: 'Acme', created_at: '2026-10-02T10:00:00.000Z', status: 'active', owner: { user_id: 'u-1', username: 'a', status: 'active' },
                deleted_at: null, pending_owner_invite: null, my_role: 'admin', scopes: [], available_permissions: [], owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
                members: [{ user_id: 'u-1', username: 'a', display_name: 'A', email: 'a@t', role: 'admin', role_id: 'role-owner', status: 'active', invited_at: null, joined_at: null, deleted_at: null }],
                roles: [{ id: 'role-owner', org_id: ORG, slug: 'owner', name: 'Owner', permissions: [], is_system: true, is_default: true, member_count: 1 }],
            } as any;
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string) => {
            switch (path) {
                case '/internal/dashboard/realms': return { ok: true, realms: [{ id: 'r1', slug: 'prod', name: 'Prod' }] } as any;
                case '/v1/realms/get': return { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 1 } } as any;
                case '/v1/orgs/get_notification_rules': return { ok: true, data: [{ id: 'o-r', event: 'run.failed', channel_id: 'c1', realm_id: null, org_id: ORG, team_slug: null, priority: 0 }] } as any;
                case '/v1/realms/get_notification_rules': return { ok: true, data: [] } as any;
                case '/v1/notification_channels/get': return { ok: true, data: [{ id: 'c1', name: '#eng', realm_id: null, org_id: ORG, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 1 }] } as any;
                case '/v1/events/types/list': return { ok: true, types: ['run.failed'] } as any;
                case '/v1/realms/get_by_id': return { ok: true, realm: { id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' } } as any;
                default: throw new Error(`unexpected ${path}`);
            }
        });
        return { api, core };
    }

    for (const [path, body] of [['/v1/notification_center/get', {}], ['/v1/notification_center/check', { realm_id: 'r1' }]] as const) {
        it(`${path}: 401 without session`, async () => {
            expect((await request(app).post(path).set(CSRF).send(body)).status).toBe(401);
        });
        it(`${path}: rejects unknown fields`, async () => {
            const sid = sess();
            expect((await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send({ ...body, nope: 1 })).status).toBe(422);
        });
        it(`${path}: composes as the effective user`, async () => {
            const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
            const { api, core } = mock();
            const res = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send(body);
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            for (const c of [...api.mock.calls, ...core.mock.calls]) expect(c[2]).toBe('tok-p');
        });
    }

    it('get returns rules with channel names', async () => {
        const sid = sess();
        mock();
        const res = await request(app).post('/v1/notification_center/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.body.data.rules[0]).toMatchObject({ id: 'o-r', channel_name: '#eng', scope: { kind: 'org', org_slug: 'acme' } });
    });

    it('/v1/notification_center/set_rules: validates level and loops Core as the effective user', async () => {
        const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
        const bad = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ events: ['run.failed'], channel_id: 'c1' });
        expect(bad.status).toBe(422);
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, body: any) => {
            expect(path).toBe('/v1/orgs/set_notification_rules');
            return { ok: true, data: { id: `r-${body.event}` } } as any;
        });
        const res = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG, events: ['run.failed', 'run.crashed'], channel_id: 'c1' });
        expect(res.status).toBe(200);
        expect(res.body.data.saved).toHaveLength(2);
        expect(core).toHaveBeenCalledTimes(2);
        for (const c of core.mock.calls) expect(c[2]).toBe('tok-p');
    });

    it('get carries locked, lock_reason, recipients and system_key of rules and channels', async () => {
        const sid = sess();
        const { core } = mock();
        const base = core.getMockImplementation()!;
        core.mockImplementation(async (path: string, ...rest: any[]) => {
            if (path === '/v1/orgs/get_notification_rules') return { ok: true, data: [{
                id: 'sys', event: 'invite.org.sent', channel_id: 'ch_email', realm_id: null, org_id: ORG, team_slug: null, priority: 0,
                recipients: ['invitee'], system_key: 'invite.sent.invitee', locked: true, lock_reason: 'Invites must reach the invited person.',
            }] } as any;
            if (path === '/v1/notification_channels/get') return { ok: true, data: [{
                id: 'ch_email', name: 'Email', realm_id: null, org_id: ORG, user_id: null,
                destinations: [{ type: 'email', provider: 'brevo' }], enabled: 1, system_key: 'org.email', locked: true, lock_reason: 'Org email is built in.', rule_count: 1,
            }] } as any;
            return base(path, ...rest);
        });

        const res = await request(app).post('/v1/notification_center/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});

        expect(res.status).toBe(200);
        expect(res.body.data.rules[0]).toMatchObject({
            id: 'sys', event: 'invite.org.sent', channel_name: 'Email', recipients: ['invitee'],
            system_key: 'invite.sent.invitee', locked: true, lock_reason: 'Invites must reach the invited person.',
        });
        expect(res.body.data.channels.find((c: any) => c.id === 'ch_email')).toMatchObject({ system_key: 'org.email', locked: true, lock_reason: 'Org email is built in.', enabled: true });
    });

    describe('get: org edit flags follow the viewer\'s role (Core orgs/get_by_id)', () => {
        const OWNER_ROLE = 'aaaaaaaa-0000-4000-8000-000000000001';
        const ADMIN_ROLE = 'aaaaaaaa-0000-4000-8000-000000000002';
        /** Core answers for one org where the viewer `u-1` holds `role_id`; `orgs/get { mine }` reports the legacy role `admin` for both. */
        function core_for(role_id: string) {
            return stub_core({
                '/v1/orgs/get': ok({ orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'admin', member_count: '1', scope_count: '1' }] }),
                '/v1/orgs/get_by_id': ok({
                    id: ORG, slug: 'acme', display_name: 'Acme', created_at: '2026-10-02T10:00:00.000Z', status: 'active',
                    owner: { user_id: 'u-0', username: 'founder', status: 'active' }, deleted_at: null, pending_owner_invite: null, my_role: 'admin',
                    members: [{ user_id: 'u-1', username: 'a', display_name: 'A', email: 'a@t', role: 'admin', role_id, status: 'active', invited_at: null, joined_at: '2026-10-02T10:00:00.000Z', deleted_at: null }],
                    scopes: [],
                    roles: [
                        { id: OWNER_ROLE, org_id: ORG, slug: 'owner', name: 'Owner', permissions: [], is_system: true, is_default: true, member_count: 1, created_at: '2026-10-02T10:00:00.000Z' },
                        { id: ADMIN_ROLE, org_id: ORG, slug: 'admin', name: 'Admin', permissions: ['org.settings', 'channels.manage', 'channels.manage.realm', 'rules.manage.realm'], is_system: false, is_default: true, member_count: 1, created_at: '2026-10-02T10:00:00.000Z' },
                    ],
                    available_permissions: ['org.settings', 'channels.manage', 'channels.manage.realm', 'rules.manage.realm'],
                    owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
                }),
                '/v1/orgs/get_notification_rules': ok([]),
                '/v1/notification_channels/get': ok([]),
                '/v1/realms/get': ok({ items: [], total: 0, offset: 0, limit: 10 }),
                '/v1/events/types/list': { status: 200, json: { ok: true, types: ['run.failed'] } },
            });
        }

        it('org admin: channels editable, org rules not (rules.manage is owner-only)', async () => {
            const sid = sess();
            const calls = core_for(ADMIN_ROLE);
            const res = await request(app).post('/v1/notification_center/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
            expect(res.status).toBe(200);
            expect(res.body.data.orgs[0]).toMatchObject({ id: ORG, can_edit: false, can_edit_channels: true });
            expect(calls.find((c) => c.path === '/v1/orgs/get_by_id')!.body).toEqual({ org_id: ORG });
        });

        it('org owner: rules and channels editable', async () => {
            const sid = sess();
            core_for(OWNER_ROLE);
            const res = await request(app).post('/v1/notification_center/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
            expect(res.body.data.orgs[0]).toMatchObject({ can_edit: true, can_edit_channels: true });
        });
    });

    it('set_rules: Core 409 locked passes through unchanged when every write is locked', async () => {
        const sid = sess();
        stub_core({ '/v1/orgs/set_notification_rules': fail(409, 'locked', 'This rule is locked', { system_key: 'invite.sent.invitee' }) });

        const res = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ org_id: ORG, events: ['invite.org.sent'], channel_id: 'c1' });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ ok: false, error: { code: 'locked', message: 'This rule is locked', details: { system_key: 'invite.sent.invitee' } } });
    });

    it('set_rules: a locked event next to a saved one is reported with its code and details', async () => {
        const sid = sess();
        stub_core({
            '/v1/orgs/set_notification_rules': (call) => call.body.event === 'invite.org.sent'
                ? fail(409, 'locked', 'This rule is locked', { system_key: 'invite.sent.invitee' })
                : ok({ id: 'r-accepted' }),
        });

        const res = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ org_id: ORG, events: ['invite.org.sent', 'invite.org.accepted'], channel_id: 'c1' });

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            saved: [{ event: 'invite.org.accepted', rule_id: 'r-accepted' }],
            failed: [{ event: 'invite.org.sent', error: 'This rule is locked', code: 'locked', details: { system_key: 'invite.sent.invitee' } }],
        });
    });

    it('set_rules: Core 422 for a non-member recipient passes through with its details', async () => {
        const sid = sess();
        const details = { field: 'recipients', not_members: ['u-9'] };
        stub_core({ '/v1/orgs/set_notification_rules': fail(422, 'invalid_params', 'Recipients must be members of the organization', details) });

        const res = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ org_id: ORG, events: ['run.failed'], channel_id: 'c1' });

        expect(res.status).toBe(422);
        expect(res.body).toEqual({ ok: false, error: { code: 'invalid_params', message: 'Recipients must be members of the organization', details } });
    });

    it.each([
        ['/v1/orgs/set_notification_rules', 422, 'invalid_params', { field: 'recipients', not_members: ['u-9'] }],
        ['/v1/notification_channels/create', 400, 'bad_request', undefined],
        ['/v1/notification_channels/update', 404, 'not_found', undefined],
        ['/v1/notification_channels/remove', 409, 'conflict', undefined],
        ['/v1/realms/set_notification_rules', 403, 'forbidden', undefined],
    ])('%s: Core %i %s reaches the SPA with its code', async (path, status, code, details) => {
        const sid = sess();
        stub_core({ [path]: fail(status, code, `${code} from Core`, details) });

        const res = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG });

        expect(res.status).toBe(status);
        expect(res.body.ok).toBe(false);
        expect(res.body.error).toMatchObject({ code, message: `${code} from Core`, ...(details ? { details } : {}) });
    });
});
