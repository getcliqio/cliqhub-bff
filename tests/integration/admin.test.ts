import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { hub_legacy_uuid } from '../helpers/hub_legacy_uuid.js';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { ApiError } from '../../src/errors/api_error.js';

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
            vi.spyOn(CoreClient.prototype, 'post')
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
            const spy = vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                users: [
                    { id: hub_legacy_uuid(2), username: 'bob', display_name: 'Bob', email: 'bob@test.com', role: 'user', suspended_at: null, created_at: '2025-01-02', status: 'active', deleted_at: null, org_role: 'member' },
                ],
                total: 1, limit: 50, offset: 0,
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                users: [
                    { id: hub_legacy_uuid(1), username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01', status: 'active', deleted_at: null },
                    { id: hub_legacy_uuid(2), username: 'bob', display_name: 'Bob', email: 'bob@test.com', role: 'user', suspended_at: null, created_at: '2025-01-02', status: 'invited', deleted_at: null },
                ],
                total: 2, limit: 20, offset: 0,
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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                id: hub_legacy_uuid(1), username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01', status: 'active', deleted_at: null,
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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
                .send({ username: 'bob', email: 'bob@test.com' });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'bob', email: 'bob@test.com' });
            expect(res.status).toBe(403);
        });

        it('returns 200: an invited user and the setup link state; no password reaches Core', async () => {
            const sid = make_admin_session();
            const vo = {
                user: { id: hub_legacy_uuid(10), username: 'bob', email: 'bob@test.com', status: 'invited' },
                setup: { expires_at: '2026-10-09T10:00:00Z', email_sent: false, setup_url: 'https://app.example.test/reset/fake' },
            };
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce(vo);

            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'bob', email: 'bob@test.com', password: 'ignored-field', reactivate: true });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: vo });
            expect(post.mock.calls[0][0]).toBe('/internal/users/new');
            expect(post.mock.calls[0][1]).toEqual({ username: 'bob', email: 'bob@test.com', reactivate: true });
        });

        it('returns 422 on invalid slug', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'INVALID USER!', email: 'bob@test.com' });

            expect(res.status).toBe(422);
        });

        it('returns 409 on duplicate', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'Username already taken', 409),
            );

            const res = await request(app)
                .post('/v1/users/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'alice', email: 'alice@test.com' });

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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ updated: true });

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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            session_store.destroy_user.mockClear();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ suspended: true });

            const res = await request(app)
                .post('/v1/users/suspend')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5), reason: 'spam' });

            expect(res.status).toBe(200);
            expect(res.body.data.suspended).toBe(true);
            // The suspended user's BFF sessions end with it.
            expect(session_store.destroy_user).toHaveBeenCalledWith(hub_legacy_uuid(5));
        });

        it('returns 422 on self-suspension', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ suspended: false });

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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            session_store.destroy_user.mockClear();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
            // The deleted user's BFF sessions end with them.
            expect(session_store.destroy_user).toHaveBeenCalledWith(hub_legacy_uuid(5));
        });

        it('passes Core\'s 409 refusal through and keeps the sessions', async () => {
            const sid = make_admin_session();
            session_store.destroy_user.mockClear();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'Cannot delete user bob: User bob authored 2 team(s) — delete or transfer them first', 409),
            );

            const res = await request(app)
                .post('/v1/users/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(5) });

            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('conflict');
            expect(res.body.error.message).toMatch(/authored 2 team/);
            expect(session_store.destroy_user).not.toHaveBeenCalled();
        });

        it('returns 422 on self-deletion', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ role: 'admin' });

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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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

    describe('POST /v1/users/reset_password (site admin: { user_id })', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(401);
        });

        it('returns 403 for a non-admin before Core is called', async () => {
            const sid = make_user_session();
            const post = vi.spyOn(CoreClient.prototype, 'post');

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1) });
            expect(res.status).toBe(403);
            expect(post).not.toHaveBeenCalled();
        });

        it('returns 200 with the reset link state', async () => {
            const sid = make_admin_session();
            const vo = { reset_id: 'rst-1', expires_at: '2026-10-03T10:20:00Z', email_sent: true, reset_url: null };
            const post_spy = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce(vo);

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: vo });
            expect(post_spy.mock.calls[0][0]).toBe('/internal/users/reset_password');
            expect(post_spy.mock.calls[0][1]).toEqual({ user_id: hub_legacy_uuid(1) });
        });

        it('returns 422 for a typed password (admins send a reset email instead)', async () => {
            const sid = make_admin_session();

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), new_password: 'newsecure123' });

            expect(res.status).toBe(422);
        });

        it('returns 404 when user not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('not_found', 'User not found', 404),
            );

            const res = await request(app)
                .post('/v1/users/reset_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });
    });

    // ── list_teams ─────────────────────────────────────────────────

    describe('POST /v1/teams/get', () => {
        it('public catalog works without session (member handler)', async () => {
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                items: [], total: 0, offset: 0, limit: 50,
            });
            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(200);
            // No Core version known in this harness → catalog sort not offered.
            expect(res.body.data).toEqual({ teams: [], total: 0, limit: 50, offset: 0, sortable: [] });
        });

        it('member session uses catalog handler (not admin-only 403)', async () => {
            const sid = make_user_session();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                items: [], total: 0, offset: 0, limit: 50,
            });
            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(200);
            const call = vi.mocked(CoreClient.prototype.post).mock.calls[0];
            expect(call[0]).toBe('/v1/teams/get');
        });

        it('returns 200 with teams list for admin (same route, Core decides visibility)', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                items: [{ id: hub_legacy_uuid(1), name: 'tdd-git', scope: 'cliq', listed: true }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.teams[0]).toMatchObject({
                id: hub_legacy_uuid(1), name: 'tdd-git', slug: 'tdd-git', scope: 'cliq', listed: true,
                description: '', latest_version: '', install_count: 0, tags: [],
            });
            expect(res.body.data.total).toBe(1);
            expect(res.body.data.limit).toBe(20);
            expect(res.body.data.offset).toBe(0);
            const call = vi.mocked(CoreClient.prototype.post).mock.calls[0];
            expect(call[0]).toBe('/v1/teams/get');
            expect(call[1]).toEqual({});
        });

        it('admin with mine + group_by_scope forwards both and gets the paged list', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                items: [{ name: 'alpha', scope: 'measureone', latest_version: '1.0.0' }],
                total: 1, limit: 50, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ mine: true, group_by_scope: true });

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.teams[0]).toMatchObject({ name: 'alpha', scope: 'measureone', latest_version: '1.0.0' });
            expect(res.body.data.scopes).toBeUndefined();
            const call = vi.mocked(CoreClient.prototype.post).mock.calls[0];
            expect(call[1]).toMatchObject({ mine: true, group_by_scope: true });
        });

        it('admin with query uses product catalog handler (CLI team search)', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                items: [{ name: 'identify-scope', scope: 'measureone', latest_version: '1.0.0' }],
                total: 1, limit: 20, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ query: 'identify', limit: 20, offset: 0 });

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.teams[0].name).toBe('identify-scope');
            const call = vi.mocked(CoreClient.prototype.post).mock.calls[0];
            expect(call[1]).toMatchObject({ query: 'identify', limit: 20, offset: 0 });
        });

        it('returns 422 for limit over 200', async () => {
            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({ limit: 201 });
            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('invalid_params');
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
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
                .send({ slug: 'acme', owner: { user_id: hub_legacy_uuid(1) } });
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin user', async () => {
            const sid = make_user_session();
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', owner: { user_id: hub_legacy_uuid(1) } });
            expect(res.status).toBe(403);
        });

        it('returns 200 with the org (waiting for owner) and the owner invite', async () => {
            const sid = make_admin_session();
            const vo = {
                org: {
                    id: hub_legacy_uuid(5), slug: 'acme', display_name: 'Acme', status: 'waiting_for_owner',
                    owner: { user_id: hub_legacy_uuid(1), email: 'alice@test.com', status: 'active' },
                    created_at: '2026-10-02T10:12:00Z', reactivated: false,
                },
                owner_invite: {
                    invite_id: hub_legacy_uuid(50), role: 'owner', status: 'pending',
                    expires_at: '2026-10-16T10:12:00Z', email_sent: true, invite_url: null,
                },
            };
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce(vo);

            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', display_name: 'Acme', owner: { user_id: hub_legacy_uuid(1) } });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: vo });
            expect(post.mock.calls[0][0]).toBe('/internal/orgs/new');
            expect(post.mock.calls[0][1]).toEqual({ slug: 'acme', display_name: 'Acme', owner: { user_id: hub_legacy_uuid(1) } });
        });

        it('sends an email owner with reactivate, and drops admin_* fields', async () => {
            const sid = make_admin_session();
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({
                org: {
                    id: hub_legacy_uuid(5), slug: 'acme', display_name: 'Acme', status: 'waiting_for_owner',
                    owner: { user_id: hub_legacy_uuid(7), email: 'sapan@example.test', status: 'invited' },
                    created_at: '2026-10-02T10:12:00Z', reactivated: true,
                },
                owner_invite: {
                    invite_id: hub_legacy_uuid(50), role: 'owner', status: 'pending',
                    expires_at: '2026-10-16T10:12:00Z', email_sent: false, invite_url: 'https://app.example.test/invite/fake',
                },
            });

            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', owner: { email: 'sapan@example.test', display_name: 'Sapan' }, reactivate: true, admin_username: 'x' });

            expect(res.status).toBe(200);
            expect(post.mock.calls[0][1]).toEqual({ slug: 'acme', owner: { email: 'sapan@example.test', display_name: 'Sapan' }, reactivate: true });
            expect(res.body.data.org.reactivated).toBe(true);
            expect(res.body.data.owner_invite).toMatchObject({ email_sent: false, invite_url: 'https://app.example.test/invite/fake' });
        });

        it('returns 422 without an owner', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', admin_username: 'alice' });

            expect(res.status).toBe(422);
        });

        it('returns 422 for invalid slug', async () => {
            const sid = make_admin_session();
            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: '123abc', owner: { user_id: hub_legacy_uuid(1) } });

            expect(res.status).toBe(422);
        });

        it('returns 409 for conflict', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
                new ApiError('conflict', 'An org with that slug already exists', 409),
            );

            const res = await request(app)
                .post('/v1/orgs/new')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'acme', owner: { user_id: hub_legacy_uuid(1) } });

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
            vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ id: hub_legacy_uuid(1), deleted_at: '2026-10-02T11:00:00Z' });

            const res = await request(app)
                .post('/v1/orgs/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: { id: hub_legacy_uuid(1), deleted_at: '2026-10-02T11:00:00Z' } });
        });

        it('returns 404 org not found', async () => {
            const sid = make_admin_session();
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
            vi.spyOn(CoreClient.prototype, 'post').mockRejectedValueOnce(
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
