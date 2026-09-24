import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { ApiError } from '../../src/repositories/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Account integration', () => {
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

    function make_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `account-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: 1, username: 'alice', email: 'a@test.com', role: 'user',
            token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    // ── update_profile ──────────────────────────────────────────────

    describe('POST /v1/users/update_profile', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .send({ display_name: 'New' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on display_name update', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    user: {
                        id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com',
                        role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                    },
                });

            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ display_name: 'Alice W' });

            expect(res.status).toBe(200);
            expect(res.body.data.user.display_name).toBe('Alice W');
            expect(res.body.data.user).not.toHaveProperty('suspended_at');
        });

        it('returns 200 on email update', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    user: {
                        id: 1, username: 'alice', display_name: 'Alice', email: 'new@test.com',
                        role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                    },
                });

            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ email: 'new@test.com' });

            expect(res.status).toBe(200);
            expect(res.body.data.user.email).toBe('new@test.com');
        });

        it('returns 200 on preferences-only update', async () => {
            const sid = make_session();
            const post_spy = vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    user: {
                        id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                        role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                    },
                });

            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ preferences: { theme: 'dark' } });

            expect(res.status).toBe(200);
            expect(post_spy.mock.calls[0][0]).toBe('/v1/users/update');
            expect(post_spy.mock.calls[0][1]).toEqual({ preferences: { theme: 'dark' } });
        });

        it('returns 422 when nothing to update', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(422);
        });

        it('returns 422 on empty display_name', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ display_name: '' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on display_name over 100 chars', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ display_name: 'x'.repeat(101) });

            expect(res.status).toBe(422);
        });

        it('returns 422 on invalid email format', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ email: 'not-an-email' });

            expect(res.status).toBe(422);
        });

        it('returns 409 on email conflict', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'Email already in use', 409),
                );

            const res = await request(app)
                .post('/v1/users/update_profile')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ email: 'taken@test.com' });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toContain('already in use');
        });
    });

    // ── change_password ─────────────────────────────────────────────

    describe('POST /v1/users/change_password', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .send({ current_password: 'old', new_password: 'newpass88' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            const post_spy = vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ message: 'Password changed' });

            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ current_password: 'correct', new_password: 'newpass88' });

            expect(res.status).toBe(200);
            expect(res.body.data.message).toBe('Password changed');
            expect(post_spy.mock.calls[0][0]).toBe('/internal/users/change_password');
            expect(post_spy.mock.calls[0][1]).toEqual({
                current_password: 'correct', new_password: 'newpass88',
            });
        });

        it('returns 422 on short new_password', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ current_password: 'old', new_password: 'short' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on empty current_password', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ current_password: '', new_password: 'newpass88' });

            expect(res.status).toBe(422);
        });

        it('returns 403 on wrong current password', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('forbidden', 'Current password is incorrect', 403),
                );

            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ current_password: 'wrong', new_password: 'newpass88' });

            expect(res.status).toBe(403);
            expect(res.body.error.message).toContain('incorrect');
        });

        it('returns 422 on missing new_password', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/change_password')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ current_password: 'old' });

            expect(res.status).toBe(422);
        });
    });

    // ── preferences routes removed ──────────────────────────────────

    describe('POST /v1/users/preferences/get (removed)', () => {
        it('returns 404', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/preferences/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});
            expect(res.status).toBe(404);
            expect(res.body.error?.code).toBe('not_found');
        });
    });

    describe('POST /v1/users/preferences/update (removed)', () => {
        it('returns 404', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/preferences/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ theme: 'dark' });
            expect(res.status).toBe(404);
            expect(res.body.error?.code).toBe('not_found');
        });
    });
});
