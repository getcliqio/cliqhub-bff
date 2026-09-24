import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { hub_legacy_uuid } from '../helpers/hub_legacy_uuid.js';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { ApiError } from '../../src/repositories/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Admin integration', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => {
            return session_store._sessions.get(sid) ?? null;
        });
        session_store.create.mockImplementation(async (record: any) => {
            const sid = `mock-sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, { session_id: sid, ...record });
            return sid;
        });
        session_store.destroy.mockImplementation(async (sid: string) => {
            session_store._sessions.delete(sid);
        });
        session_store.touch.mockResolvedValue(undefined);
    });

    function make_admin_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `admin-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: hub_legacy_uuid(99), username: 'admin', email: 'admin@test.com', role: 'admin',
            token: 'jwt-admin', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    function make_user_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `user-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: hub_legacy_uuid(1), username: 'alice', email: 'alice@test.com', role: 'user',
            token: 'jwt-user', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    // ── audit ───────────────────────────────────────────────────────

    describe('POST /v1/reports/audit', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(403);
        });

        it('returns 200 with entries for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    entries: [
                        { id: hub_legacy_uuid(1), admin_id: hub_legacy_uuid(99), admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' },
                    ],
                    total: 1, limit: 50, offset: 0,
                });

            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.entries).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('accepts filter params', async () => {
            const sid = make_admin_session();
            const spy = vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ entries: [], total: 0, limit: 10, offset: 0 });

            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ action: 'user.suspend', limit: 10, offset: 0 });

            expect(res.status).toBe(200);
            const call_body = spy.mock.calls[0][1];
            expect(call_body).toMatchObject({ action: 'user.suspend', limit: 10 });
        });

        it('returns 422 on limit over 100', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ limit: 101 });

            expect(res.status).toBe(422);
        });

        it('returns 422 on negative offset', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/reports/audit')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ offset: -1 });

            expect(res.status).toBe(422);
        });
    });

    // ── list_users ──────────────────────────────────────────────────

    describe('POST /v1/users/get', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/get')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user without org_id', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(403);
        });

        it('allows org-scoped list for authenticated non-site-admin', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                users: [
                    { id: hub_legacy_uuid(2), username: 'bob', display_name: 'Bob', email: 'bob@test.com', role: 'user', suspended_at: null, created_at: '2025-01-02', org_role: 'member' },
                ],
                total: 1,
            });

            const res = await request(app)
                .post('/v1/users/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.users).toHaveLength(1);
        });

        it('returns 200 with users list for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                users: [
                    { id: hub_legacy_uuid(1), username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01' },
                    { id: hub_legacy_uuid(2), username: 'bob', display_name: 'Bob', email: 'bob@test.com', role: 'user', suspended_at: null, created_at: '2025-01-02' },
                ],
                total: 2,
            });

            const res = await request(app)
                .post('/v1/users/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ limit: 20, offset: 0 });

            expect(res.status).toBe(200);
            expect(res.body.data.users).toHaveLength(2);
            expect(res.body.data.total).toBe(2);
        });
    });

    // ── get_user ────────────────────────────────────────────────────

    describe('POST /v1/users/get_by_id', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/get_by_id')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(401);
        });

        it('returns 403 when backend denies access', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('forbidden', 'Account admin access required', 403),
            );

            const res = await request(app)
                .post('/v1/users/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(403);
        });

        it('returns 200 with user detail for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                id: hub_legacy_uuid(1), username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                scope_count: 2, team_count: 3, token_count: 1, draft_count: 0,
                orgs: [{ id: hub_legacy_uuid(10), slug: 'acme', display_name: 'Acme', role: 'admin' }],
            });

            const res = await request(app)
                .post('/v1/users/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('alice');
            expect(res.body.data.orgs).toHaveLength(1);
        });

        it('returns 404 when user not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'User not found', 404),
            );

            const res = await request(app)
                .post('/v1/users/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });
    });

    // ── create_user ─────────────────────────────────────────────────

    describe('POST /v1/users/new', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .send({ username: 'bob', email: 'bob@test.com', password: 'securepass' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'bob', email: 'bob@test.com', password: 'securepass' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                id: hub_legacy_uuid(10), username: 'bob', display_name: 'Bob', email: 'bob@test.com',
                role: 'user', suspended_at: null, created_at: '2025-06-01',
            });

            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'bob', email: 'bob@test.com', password: 'securepass' });

            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('bob');
        });

        it('returns 422 on invalid slug', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'INVALID USER!', email: 'bob@test.com', password: 'securepass' });

            expect(res.status).toBe(422);
        });

        it('returns 409 on duplicate', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'Username already taken', 409),
            );

            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'alice', email: 'alice@test.com', password: 'securepass' });

            expect(res.status).toBe(409);
        });
    });

    // ── update_user ─────────────────────────────────────────────────

    describe('POST /v1/users/update', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/update')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(1), display_name: 'Alice W' });
            expect(res.status).toBe(401);
        });

        it('returns 403 when backend denies non-org-admin', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('forbidden', 'Account admin access required', 403),
            );

            const res = await request(app)
                .post('/v1/users/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), display_name: 'Alice W' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ updated: true });

            const res = await request(app)
                .post('/v1/users/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), display_name: 'Alice W' });

            expect(res.status).toBe(200);
            expect(res.body.data.updated).toBe(true);
        });

        it('returns 404 when user not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'User not found', 404),
            );

            const res = await request(app)
                .post('/v1/users/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999), display_name: 'Ghost' });

            expect(res.status).toBe(404);
        });

        it('returns 409 on email conflict', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'Email already in use', 409),
            );

            const res = await request(app)
                .post('/v1/users/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), email: 'taken@test.com' });

            expect(res.status).toBe(409);
        });
    });

    // ── suspend_user ────────────────────────────────────────────────

    describe('POST /v1/users/suspend', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/suspend')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/suspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ suspended: true });

            const res = await request(app)
                .post('/v1/users/suspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5), reason: 'spam' });

            expect(res.status).toBe(200);
            expect(res.body.data.suspended).toBe(true);
        });

        it('returns 422 on self-suspension', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('invalid_params', 'Cannot suspend yourself', 422),
            );

            const res = await request(app)
                .post('/v1/users/suspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(99) });

            expect(res.status).toBe(422);
        });
    });

    // ── unsuspend_user ──────────────────────────────────────────────

    describe('POST /v1/users/unsuspend', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/unsuspend')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/unsuspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ suspended: false });

            const res = await request(app)
                .post('/v1/users/unsuspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(200);
            expect(res.body.data.suspended).toBe(false);
        });

        it('returns 404 when user not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'User not found', 404),
            );

            const res = await request(app)
                .post('/v1/users/unsuspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });
    });

    // ── delete_user ─────────────────────────────────────────────────

    describe('POST /v1/users/delete', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns 422 on self-deletion', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('invalid_params', 'Cannot delete yourself', 422),
            );

            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(99) });

            expect(res.status).toBe(422);
        });
    });

    // ── set_user_role ───────────────────────────────────────────────

    describe('POST /v1/users/set_role', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/set_role')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(1), role: 'admin' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/set_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), role: 'admin' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on successful role change', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ role: 'admin' });

            const res = await request(app)
                .post('/v1/users/set_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), role: 'admin' });

            expect(res.status).toBe(200);
            expect(res.body.data.role).toBe('admin');
        });

        it('returns 422 on self-demotion', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('invalid_params', 'Cannot demote yourself', 422),
            );

            const res = await request(app)
                .post('/v1/users/set_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(99), role: 'user' });

            expect(res.status).toBe(422);
        });

        it('returns 422 for invalid role', async () => {
            const sid = make_admin_session();

            const res = await request(app)
                .post('/v1/users/set_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), role: 'superadmin' });

            expect(res.status).toBe(422);
        });
    });

    // ── reset_user_password ─────────────────────────────────────────

    describe('POST /v1/users/reset_password', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(1), new_password: 'secure123' });
            expect(res.status).toBe(401);
        });

        it('returns 403 when backend denies non-org-admin', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('forbidden', 'Account admin access required', 403),
            );

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), new_password: 'secure123' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on successful password reset', async () => {
            const sid = make_admin_session();
            const post_spy = vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ reset: true });

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), new_password: 'newsecure123' });

            expect(res.status).toBe(200);
            expect(res.body.data.reset).toBe(true);
            expect(post_spy.mock.calls[0][0]).toBe('/internal/users/reset_password');
            expect(post_spy.mock.calls[0][1]).toEqual({
                user_id: hub_legacy_uuid(1), new_password: 'newsecure123',
            });
        });

        it('returns 422 for short password', async () => {
            const sid = make_admin_session();

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), new_password: 'short' });

            expect(res.status).toBe(422);
        });

        it('returns 404 when user not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'User not found', 404),
            );

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999), new_password: 'newsecure123' });

            expect(res.status).toBe(404);
        });
    });

    // ── list_teams ─────────────────────────────────────────────────

    describe('POST /v1/teams/get', () => {
        it('public catalog works without session (member handler)', async () => {
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [], total: 0,
            });
            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(200);
        });

        it('member session uses catalog handler (not admin-only 403)', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [], total: 0,
            });
            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(200);
        });

        it('returns 200 with teams list for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [{ id: hub_legacy_uuid(1), name: 'tdd-git', scope: 'cliq', listed: true }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });

        it('admin with mine uses product teams handler (scoped groups)', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                scopes: [{
                    slug: 'measureone',
                    display_name: 'MeasureOne',
                    scope_type: 'org',
                    visibility: 'private',
                    teams: [{ name: 'alpha', scope: 'measureone', latest_version: '1.0.0' }],
                }],
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ mine: true, group_by_scope: true });

            expect(res.status).toBe(200);
            expect(res.body.data.scopes).toHaveLength(1);
            expect(res.body.data.scopes[0].slug).toBe('measureone');
            const call = vi.mocked(ApiClient.prototype.post).mock.calls[0];
            expect(call[1]).toMatchObject({ mine: true, group_by_scope: true });
        });

        it('admin with query uses product catalog handler (CLI team search)', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [{ name: 'identify-scope', scope: 'measureone', latest_version: '1.0.0' }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ query: 'identify', limit: 20, offset: 0 });

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
            const call = vi.mocked(ApiClient.prototype.post).mock.calls[0];
            expect(call[1]).toMatchObject({ query: 'identify', limit: 20, offset: 0 });
        });
    });

    // ── publish / unpublish (replaces set_listed) ──────────────────

    // ── publish / unpublish (replaces set_listed) ──────────────────

    describe('POST /v1/teams/unpublish', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .send({ team_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(401);
        });

        it('returns 422 without name or team_id', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(422);
        });

        it('returns 200 on success with team_id', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                status: 'draft', listed: false,
            });

            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ team_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.listed).toBe(false);
        });

        it('returns 404 when team not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'Team not found', 404),
            );

            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ team_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/teams/publish (status flip / list)', () => {
        it('returns 200 when publishing by team_id', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                status: 'published', listed: true, version: '1.0.0',
            });

            const res = await request(app)
                .post('/v1/teams/publish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ team_id: hub_legacy_uuid(1), visibility: 'public' });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
        });
    });

    // ── admin get_tokens / revoke_token removed ────────────────────

    describe('POST /v1/users/get_tokens (removed)', () => {
        it('returns 404', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/users/get_tokens')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(404);
            expect(res.body.error?.code).toBe('not_found');
        });
    });

    describe('POST /v1/users/revoke_token (removed)', () => {
        it('returns 404', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/users/revoke_token')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ token_id: 'tok-1' });
            expect(res.status).toBe(404);
            expect(res.body.error?.code).toBe('not_found');
        });
    });

    // ── list_scopes ─────────────────────────────────────────────────

    describe('POST /v1/scopes/get', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/scopes/get')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/scopes/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(403);
        });

        it('returns 200 with scopes list for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                scopes: [{ id: hub_legacy_uuid(1), slug: 'alice', display_name: 'Alice', owner_id: hub_legacy_uuid(1), owner_username: 'alice', visibility: 'public', scope_type: 'user', team_count: 3, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/scopes/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.scopes).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });
    });

    // ── new_scope ────────────────────────────────────────────────

    describe('POST /v1/scopes/new', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/scopes/new')
                .set(CSRF)
                .send({ slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/scopes/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ id: hub_legacy_uuid(10), slug: 'newscope' });

            const res = await request(app)
                .post('/v1/scopes/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user' });

            expect(res.status).toBe(200);
            expect(res.body.data.slug).toBe('newscope');
        });

        it('returns 422 for invalid slug', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/scopes/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: '123abc', owner_username: 'alice', visibility: 'public', scope_type: 'user' });

            expect(res.status).toBe(422);
        });

        it('returns 409 for conflict', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'Scope already exists', 409),
            );

            const res = await request(app)
                .post('/v1/scopes/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'alice', owner_username: 'alice', visibility: 'public', scope_type: 'user' });

            expect(res.status).toBe(409);
        });
    });

    // ── update_scope ────────────────────────────────────────────────

    describe('POST /v1/scopes/update', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/scopes/update')
                .set(CSRF)
                .send({ scope_id: hub_legacy_uuid(1), visibility: 'private' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/scopes/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(1), visibility: 'private' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ updated: true });

            const res = await request(app)
                .post('/v1/scopes/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(1), visibility: 'private' });

            expect(res.status).toBe(200);
            expect(res.body.data.updated).toBe(true);
        });

        it('returns 404 when scope not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'Scope not found', 404),
            );

            const res = await request(app)
                .post('/v1/scopes/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(999), display_name: 'Ghost' });

            expect(res.status).toBe(404);
        });
    });

    // ── delete_scope ────────────────────────────────────────────────

    describe('POST /v1/scopes/delete', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/scopes/delete')
                .set(CSRF)
                .send({ scope_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/scopes/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/scopes/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns 422 when scope has teams', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('invalid_params', 'Cannot delete scope with 3 team(s)', 422),
            );

            const res = await request(app)
                .post('/v1/scopes/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(422);
        });
    });

    // ── list_orgs ───────────────────────────────────────────────────

    describe('POST /v1/orgs/get', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/get')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(401);
        });

        it('member can list own orgs (shared path)', async () => {
            const sid = make_user_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                orgs: [],
            });
            const res = await request(app)
                .post('/v1/orgs/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(200);
        });

        it('returns 200 with orgs list for admin', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                orgs: [{ id: hub_legacy_uuid(1), slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/orgs/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.orgs).toHaveLength(1);
            expect(res.body.data.total).toBe(1);
        });
    });

    // ── new_org ──────────────────────────────────────────────────

    describe('POST /v1/orgs/new', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .send({ slug: 'acme', admin_username: 'alice' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', admin_username: 'alice' });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ id: hub_legacy_uuid(5), slug: 'acme' });

            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', admin_username: 'alice' });

            expect(res.status).toBe(200);
            expect(res.body.data.slug).toBe('acme');
        });

        it('returns 422 for invalid slug', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: '123abc', admin_username: 'alice' });

            expect(res.status).toBe(422);
        });

        it('returns 409 for conflict', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'An org with that slug already exists', 409),
            );

            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', admin_username: 'alice' });

            expect(res.status).toBe(409);
        });
    });

    // ── delete_org ──────────────────────────────────────────────────

    describe('POST /v1/orgs/delete', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(403);
        });

        it('returns 200 on success', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns 404 org not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'Org not found', 404),
            );

            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });

        it('returns 422 org has teams', async () => {
            const sid = make_admin_session();
            vi.spyOn(ApiClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('invalid_params', 'Cannot delete org with 3 team(s)', 422),
            );

            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(422);
        });
    });
});
