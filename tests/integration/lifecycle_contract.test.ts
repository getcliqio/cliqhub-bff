/**
 * Org and user lifecycle routes over HTTP against a stubbed Core (fetch):
 * org status / owner / pending owner invite / member status in the reads,
 * user status in the user list, the org page composed in one call, soft
 * deletes, and Core's lifecycle errors (`deleted`, `owns_orgs`, `not_active`,
 * `account_deleted`) passed through with their details.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { stub_core, ok, fail } from '../helpers/core_stub.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const DELETED_USER = { kind: 'user', id: USER_ID, deleted_at: '2026-09-01T00:00:00Z', was_active: true };

const OWNER_ROLE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const INVITE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** Core `orgs/get_by_id` for an org waiting for an owner invited by email (no username yet). */
const ORG_DETAIL = {
    id: ORG_ID, slug: 'measureone', display_name: 'MeasureOne', created_at: '2026-10-02T10:12:00.000Z',
    status: 'waiting_for_owner', owner: { user_id: USER_ID, username: null, status: 'invited' }, deleted_at: null,
    pending_owner_invite: { invite_id: INVITE_ID, email: 'sapan@example.test', expires_at: '2026-10-16T10:12:00.000Z' },
    my_role: 'site_admin',
    members: [
        { user_id: USER_ID, username: null, display_name: 'Sapan', email: 'sapan@example.test', role: 'admin', role_id: OWNER_ROLE_ID, status: 'pending', invited_at: '2026-10-02T10:12:00.000Z', joined_at: null, deleted_at: null },
        { user_id: '22222222-2222-4222-8222-222222222222', username: 'bob', display_name: 'Bob', email: 'bob@example.test', role: 'member', role_id: null, status: 'deleted', invited_at: null, joined_at: '2026-01-01T00:00:00.000Z', deleted_at: '2026-09-01T00:00:00.000Z' },
    ],
    scopes: [{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', slug: 'measureone', display_name: 'MeasureOne', visibility: 'public', member_count: '0', team_count: '0' }],
    roles: [{ id: OWNER_ROLE_ID, org_id: ORG_ID, slug: 'owner', name: 'Owner', permissions: [], is_system: true, is_default: true, member_count: 1, created_at: '2026-10-02T10:12:00.000Z' }],
    available_permissions: ['org.settings', 'channels.manage'],
    owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
};

describe('Org / user lifecycle contract (Core stubbed at fetch)', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.touch.mockResolvedValue(undefined);
        session_store.destroy_user.mockResolvedValue(undefined);
    });

    function make_session(role: 'user' | 'admin') {
        const now = Math.floor(Date.now() / 1000);
        const sid = `lc-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid, user_id: USER_ID, act_as_user_id: USER_ID, username: 'root', email: 'root@example.test',
            role, actor_role: role, user_token: 'cliq_tok_root', target_token: 'cliq_tok_root',
            scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    it('orgs/get_by_id: status, owner (no username yet), pending owner invite, deleted_at and member states', async () => {
        const sid = make_session('admin');
        stub_core({ '/v1/orgs/get_by_id': ok(ORG_DETAIL) });

        const res = await request(app).post('/v1/orgs/get_by_id').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_ID });

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            status: 'waiting_for_owner', owner: { user_id: USER_ID, username: null, status: 'invited' }, deleted_at: null,
            pending_owner_invite: { invite_id: INVITE_ID, email: 'sapan@example.test', expires_at: '2026-10-16T10:12:00.000Z' },
            owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
        });
        expect(res.body.data.members.map((m: any) => [m.username, m.status, m.role_id, m.deleted_at])).toEqual([
            [null, 'pending', OWNER_ROLE_ID, null], ['bob', 'deleted', null, '2026-09-01T00:00:00.000Z'],
        ]);
    });

    it('orgs/get_by_id: no open owner invite → pending_owner_invite null', async () => {
        const sid = make_session('admin');
        stub_core({ '/v1/orgs/get_by_id': ok({ ...ORG_DETAIL, status: 'active', owner: { user_id: USER_ID, username: 'sapan', status: 'active' }, pending_owner_invite: null }) });

        const res = await request(app).post('/v1/orgs/get_by_id').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_ID });

        expect(res.body.data).toMatchObject({ status: 'active', owner: { username: 'sapan' }, pending_owner_invite: null });
    });

    it('orgs/get (site admin): status filter and include_deleted reach Core; rows carry status / owner / deleted_at', async () => {
        const sid = make_session('admin');
        const calls = stub_core({
            '/v1/orgs/get': ok({
                orgs: [{
                    id: ORG_ID, slug: 'measureone', display_name: 'MeasureOne', member_count: 1, scope_count: 1, created_at: '2026-10-02',
                    owner_count: '1', status: 'deleted', owner: { username: 'sapan', status: 'active' }, deleted_at: '2026-10-02T11:00:00.000Z',
                }, {
                    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', slug: 'newco', display_name: 'NewCo', member_count: '0', scope_count: '1', created_at: '2026-10-02',
                    owner_count: '0', status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null,
                }],
                total: 1, limit: 25, offset: 0,
            }),
        });

        const res = await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ query: 'measure', status: 'deleted', include_deleted: true, limit: 25 });

        expect(res.status).toBe(200);
        expect(calls[0].body).toEqual({ query: 'measure', limit: 25, status: 'deleted', include_deleted: true });
        expect(res.body.data.orgs[0]).toMatchObject({ status: 'deleted', owner: { username: 'sapan', status: 'active' }, deleted_at: '2026-10-02T11:00:00.000Z' });
        expect(res.body.data.orgs[1]).toMatchObject({ status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null });
    });

    it('org_page/get: members and pending invites in one call', async () => {
        const sid = make_session('admin');
        const invite = {
            invite_id: INVITE_ID, email: 'sapan@example.test', role: 'owner', kind: 'owner', status: 'pending',
            inviter: { id: USER_ID, display_name: 'Root' }, send_count: 1, last_sent_at: '2026-10-02T10:12:00Z',
            expires_at: '2026-10-16T10:12:00Z', created_at: '2026-10-02T10:12:00Z',
            deliveries: [{ kind: 'sent', sent_at: '2026-10-02T10:12:00Z', email_sent: true, provider_message_id: '<x@relay.example.test>' }],
        };
        const calls = stub_core({
            '/v1/orgs/get_by_id': ok(ORG_DETAIL),
            '/v1/invitations/get': ok({ target_type: 'org', org_id: ORG_ID, invites: [invite], total: 1, page: 1, page_size: 100 }),
            '/v1/permissions/list': ok({ permissions: ['rules.manage'], owner_only: ['rules.manage'] }),
        });

        const res = await request(app).post('/v1/org_page/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_ID });

        expect(res.status).toBe(200);
        expect(res.body.data.org.members).toHaveLength(2);
        expect(res.body.data.org.pending_owner_invite).toEqual(ORG_DETAIL.pending_owner_invite);
        expect(res.body.data.invites).toEqual([invite]);
        expect(res.body.data.partial).toBe(false);
        expect(calls.find((c) => c.path === '/v1/invitations/get')!.body)
            .toEqual({ target_type: 'org', org_id: ORG_ID, status: 'pending', sort: '-created_at', page: 1, page_size: 100 });
    });

    it('orgs/delete: soft delete answer { id, deleted_at }', async () => {
        const sid = make_session('admin');
        stub_core({ '/internal/orgs/delete': ok({ id: ORG_ID, deleted_at: '2026-10-02T11:00:00Z' }) });

        const res = await request(app).post('/v1/orgs/delete').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_ID });

        expect(res.body).toEqual({ ok: true, data: { id: ORG_ID, deleted_at: '2026-10-02T11:00:00Z' } });
    });

    it.each([
        ['/v1/orgs/new', '/internal/orgs/new', { slug: 'measureone', owner: { email: 'sapan@example.test' } }, { kind: 'org', id: ORG_ID, deleted_at: '2026-09-01T00:00:00Z', was_active: true }],
        ['/v1/users/new', '/internal/users/new', { username: 'priya', email: 'priya@example.test' }, DELETED_USER],
    ])('%s: 409 deleted passes through with details (for the Reactivate prompt)', async (route, core_path, body, details) => {
        const sid = make_session('admin');
        stub_core({ [core_path]: fail(409, 'deleted', 'That name belongs to a deleted record', details) });

        const res = await request(app).post(route).set(CSRF).set('Cookie', `test_sid=${sid}`).send(body);

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ ok: false, error: { code: 'deleted', message: 'That name belongs to a deleted record', details } });
    });

    it('users/new reactivate: 422 on a different username passes through with details.field', async () => {
        const sid = make_session('admin');
        const message = 'This email belongs to a deleted user with a different username';
        const calls = stub_core({ '/internal/users/new': fail(422, 'invalid_params', message, { field: 'username' }) });

        const res = await request(app).post('/v1/users/new').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ username: 'other', email: 'priya@example.test', reactivate: true });

        expect(calls[0].body).toEqual({ username: 'other', email: 'priya@example.test', reactivate: true });
        expect(res.status).toBe(422);
        expect(res.body).toEqual({ ok: false, error: { code: 'invalid_params', message, details: { field: 'username' } } });
    });

    it('users/delete: 409 owns_orgs passes through with the orgs, sessions kept', async () => {
        const sid = make_session('admin');
        const details = { orgs: [{ slug: 'measureone' }] };
        stub_core({ '/internal/users/delete': fail(409, 'owns_orgs', 'Transfer or delete these orgs first.', details) });

        const res = await request(app).post('/v1/users/delete').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ user_id: USER_ID });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ ok: false, error: { code: 'owns_orgs', message: 'Transfer or delete these orgs first.', details } });
        expect(session_store.destroy_user).not.toHaveBeenCalled();
    });

    it('users/delete: success ends the user\'s BFF sessions', async () => {
        const sid = make_session('admin');
        stub_core({ '/internal/users/delete': ok({ deleted: true }) });

        const res = await request(app).post('/v1/users/delete').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ user_id: USER_ID });

        expect(res.body).toEqual({ ok: true, data: { deleted: true } });
        expect(session_store.destroy_user).toHaveBeenCalledWith(USER_ID);
    });

    it('users/get (site admin): include_deleted reaches Core; rows carry status, deleted_at and a null username for an invitee', async () => {
        const sid = make_session('admin');
        const rows = [
            { id: USER_ID, username: null, display_name: 'Sapan', email: 'sapan@example.test', role: 'user', suspended_at: null, created_at: '2026-10-02T10:12:00.000Z', status: 'invited', deleted_at: null },
            { id: '22222222-2222-4222-8222-222222222222', username: 'bob', display_name: 'Bob', email: 'bob@example.test', role: 'user', suspended_at: null, created_at: '2026-01-01T00:00:00.000Z', status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z' },
        ];
        const calls = stub_core({ '/v1/users/get': ok({ users: rows, total: 2, limit: 50, offset: 0 }) });

        const res = await request(app).post('/v1/users/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ query: 'b', include_deleted: true });

        expect(res.status).toBe(200);
        expect(calls[0].body).toEqual({ query: 'b', include_deleted: true });
        expect(res.body.data).toEqual({ users: rows, total: 2, limit: 50, offset: 0 });
    });

    it('session/create: an invited account (no password yet) gets the plain 401, no cookie', async () => {
        stub_core({ '/internal/auth/authenticate_user': fail(401, 'unauthorized', 'Invalid credentials') });

        const res = await request(app).post('/v1/session/create').set(CSRF).send({ username: 'priya', password: 'whatever1' });

        expect(res.status).toBe(401);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.details).toBeUndefined();
        expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('session/create: 403 account_deleted passes through, no cookie', async () => {
        stub_core({ '/internal/auth/authenticate_user': fail(403, 'account_deleted', 'This account was deleted. Contact your admin.') });

        const res = await request(app).post('/v1/session/create').set(CSRF).send({ username: 'bob', password: 'whatever1' });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ ok: false, error: { code: 'account_deleted', message: 'This account was deleted. Contact your admin.' } });
        expect(res.headers['set-cookie']).toBeUndefined();
    });
});
