/**
 * users/reset_password and users/change_password over HTTP: one route each,
 * two bodies, chosen per body by the route table — a public body works
 * signed out, the other keeps its session / site-admin rule — against a
 * stubbed Core (fetch).
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { stub_core, ok, fail, sign_in_routes } from '../helpers/core_stub.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Password routes (per-body auth)', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.create.mockImplementation(async (record: any) => {
            const sid = `mock-sid-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, { session_id: sid, ...record });
            return sid;
        });
        session_store.touch.mockResolvedValue(undefined);
        session_store.destroy_user.mockResolvedValue(undefined);
    });

    function make_session(role: 'user' | 'admin') {
        const now = Math.floor(Date.now() / 1000);
        const sid = `pw-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid, user_id: USER_ID, act_as_user_id: USER_ID, username: 'alice', email: 'alice@example.test',
            role, actor_role: role, user_token: 'cliq_tok_alice', target_token: 'cliq_tok_alice',
            scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/users/reset_password { email } — public "Forgot password"', () => {
        it('signed out: { requested: true }; Core gets just { email }, no bearer and no forwarded headers', async () => {
            const calls = stub_core({ '/internal/users/reset_password': ok({ requested: true }) });

            const res = await request(app).post('/v1/users/reset_password').set(CSRF)
                .set('X-Forwarded-For', '203.0.113.9')
                .send({ email: 'priya@example.test' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: { requested: true } });
            expect(calls).toHaveLength(1);
            expect(calls[0].body).toEqual({ email: 'priya@example.test' });
            expect(calls[0].headers.authorization).toBeUndefined();
            expect(calls[0].headers['x-forwarded-for']).toBeUndefined();
            expect(calls[0].headers['x-cliq-client-ip']).toBeUndefined();
            expect(calls[0].headers['x-cliq-internal-token']).toBeUndefined();
        });

        it('signed in as a non-admin: still the public path, without the caller\'s bearer', async () => {
            const sid = make_session('user');
            const calls = stub_core({ '/internal/users/reset_password': ok({ requested: true }) });

            const res = await request(app).post('/v1/users/reset_password').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ email: 'alice@example.test' });

            expect(res.status).toBe(200);
            expect(calls[0].headers.authorization).toBeUndefined();
        });

        it('a public body carrying user_id is refused (422) before Core', async () => {
            const calls = stub_core({});
            const res = await request(app).post('/v1/users/reset_password').set(CSRF)
                .send({ email: 'priya@example.test', user_id: USER_ID });
            expect(res.status).toBe(422);
            expect(calls).toHaveLength(0);
        });

        it('passes 429 rate_limited through', async () => {
            stub_core({ '/internal/users/reset_password': fail(429, 'rate_limited', 'Too many reset requests') });
            const res = await request(app).post('/v1/users/reset_password').set(CSRF).send({ email: 'priya@example.test' });
            expect(res.status).toBe(429);
            expect(res.body.error).toEqual({ code: 'rate_limited', message: 'Too many reset requests' });
        });
    });

    describe('POST /v1/users/reset_password { user_id } — site admin', () => {
        it('signed out → 401, member → 403, Core never called', async () => {
            const calls = stub_core({});
            expect((await request(app).post('/v1/users/reset_password').set(CSRF).send({ user_id: USER_ID })).status).toBe(401);
            const sid = make_session('user');
            expect((await request(app).post('/v1/users/reset_password').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ user_id: USER_ID })).status).toBe(403);
            expect(calls).toHaveLength(0);
        });

        it.each([
            ['deleted', { kind: 'user', id: USER_ID, deleted_at: '2026-09-01T00:00:00Z', was_active: true }],
            ['not_active', { status: 'suspended' }],
            ['not_active', { status: 'invited' }],
        ])('passes 409 %s through with details', async (code, details) => {
            const sid = make_session('admin');
            stub_core({ '/internal/users/reset_password': fail(409, code, code, details) });

            const res = await request(app).post('/v1/users/reset_password').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ user_id: USER_ID });

            expect(res.status).toBe(409);
            expect(res.body.error).toEqual({ code, message: code, details });
        });
    });

    describe('POST /v1/users/change_password { reset_token, new_password } — public', () => {
        const CHANGED = { user: { id: USER_ID, username: 'priya', status: 'active' }, sessions_revoked: 2 };

        it('signed out: sets the password without a bearer, ends old sessions, signs in with the new password', async () => {
            const calls = stub_core({
                '/internal/users/change_password': ok(CHANGED),
                ...sign_in_routes(USER_ID, 'priya', 'cliq_tok_priya_new'),
            });

            const res = await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ reset_token: 'reset-secret', new_password: 'newpass88' });

            expect(res.status).toBe(200);
            expect(res.body.data).toMatchObject(CHANGED);
            expect(res.body.data.session.user.username).toBe('priya');
            expect(JSON.stringify(res.body)).not.toContain('cliq_tok_priya_new');
            expect(res.headers['set-cookie']?.[0]).toContain('test_sid=');
            expect(calls[0]).toMatchObject({ path: '/internal/users/change_password', body: { reset_token: 'reset-secret', new_password: 'newpass88' } });
            expect(calls[0].headers.authorization).toBeUndefined();
            expect(calls[1]).toMatchObject({ path: '/internal/auth/authenticate_user', body: { username: 'priya', password: 'newpass88' } });
            expect(session_store.destroy_user).toHaveBeenCalledWith(USER_ID);
        });

        it('sign-in failing after the change: 200 without a session or cookie', async () => {
            stub_core({
                '/internal/users/change_password': ok(CHANGED),
                '/internal/auth/authenticate_user': fail(401, 'unauthorized', 'Invalid credentials'),
            });

            const res = await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ reset_token: 'reset-secret', new_password: 'newpass88' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: CHANGED });
            expect(res.headers['set-cookie']).toBeUndefined();
        });

        it.each([
            [410, 'expired', { expired_at: '2026-10-01T00:00:00Z' }],
            [409, 'not_pending', { status: 'used' }],
            [409, 'not_active', { status: 'suspended' }],
            [404, 'not_found', undefined],
        ])('passes %s %s through, no session', async (status, code, details) => {
            const calls = stub_core({ '/internal/users/change_password': fail(status, code, code, details) });

            const res = await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ reset_token: 'reset-secret', new_password: 'newpass88' });

            expect(res.status).toBe(status);
            expect(res.body.error).toEqual({ code, message: code, ...(details ? { details } : {}) });
            expect(res.headers['set-cookie']).toBeUndefined();
            expect(calls).toHaveLength(1);
        });

        it('password rules and a mixed body are refused (422) before Core', async () => {
            const calls = stub_core({});
            expect((await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ reset_token: 'reset-secret', new_password: 'short' })).status).toBe(422);
            expect((await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ reset_token: 'reset-secret', current_password: 'x', new_password: 'newpass88' })).status).toBe(422);
            expect(calls).toHaveLength(0);
        });
    });

    describe('POST /v1/users/change_password { current_password, new_password } — signed in', () => {
        it('signed out → 401 before Core', async () => {
            const calls = stub_core({});
            const res = await request(app).post('/v1/users/change_password').set(CSRF)
                .send({ current_password: 'old', new_password: 'newpass88' });
            expect(res.status).toBe(401);
            expect(calls).toHaveLength(0);
        });

        it('signed in: Core gets the bearer; no new session', async () => {
            const sid = make_session('user');
            const calls = stub_core({
                '/internal/users/change_password': ok({ user: { id: USER_ID, username: 'alice', status: 'active' }, sessions_revoked: 1 }),
            });

            const res = await request(app).post('/v1/users/change_password').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ current_password: 'old', new_password: 'newpass88' });

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ user: { id: USER_ID, username: 'alice', status: 'active' }, sessions_revoked: 1 });
            expect(calls[0].headers.authorization).toBe('Bearer cliq_tok_alice');
            expect(calls).toHaveLength(1);
        });
    });
});

describe('POST /v1/users/reset_password { email } — per-address limit', () => {
    beforeEach(() => vi.restoreAllMocks());

    const forgot = (app: Express, ip?: string) => {
        const r = request(app).post('/v1/users/reset_password').set(CSRF);
        return (ip ? r.set('X-Forwarded-For', ip) : r).send({ email: 'priya@example.test' });
    };

    it('the 11th request from one address within the hour is 429 rate_limited before Core', async () => {
        const { app } = create_test_app();
        const calls = stub_core({ '/internal/users/reset_password': ok({ requested: true }) });

        for (let i = 0; i < 10; i++) expect((await forgot(app)).status).toBe(200);
        const res = await forgot(app);

        expect(res.status).toBe(429);
        expect(res.body.ok).toBe(false);
        expect(res.body.error).toMatchObject({ code: 'rate_limited', message: expect.any(String), details: { retry_after_seconds: expect.any(Number) } });
        expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
        expect(calls).toHaveLength(10);
    });

    it('without TRUST_PROXY, X-Forwarded-For is ignored: every caller behind one proxy shares its address', async () => {
        const { app } = create_test_app();
        stub_core({ '/internal/users/reset_password': ok({ requested: true }) });
        for (let i = 0; i < 10; i++) await forgot(app, `203.0.113.${i}`);
        expect((await forgot(app, '198.51.100.7')).status).toBe(429);
    });

    it('with TRUST_PROXY set, each forwarded client address has its own limit', async () => {
        const { app } = create_test_app({ trust_proxy: 'loopback' });
        stub_core({ '/internal/users/reset_password': ok({ requested: true }) });
        for (let i = 0; i < 10; i++) expect((await forgot(app, '203.0.113.9')).status).toBe(200);
        expect((await forgot(app, '203.0.113.9')).status).toBe(429);
        expect((await forgot(app, '198.51.100.7')).status).toBe(200);
    });

    it('Core\'s per-email 429 passes through unchanged', async () => {
        const { app } = create_test_app();
        stub_core({ '/internal/users/reset_password': fail(429, 'rate_limited', 'Too many requests for this email') });
        const res = await forgot(app);
        expect(res.status).toBe(429);
        expect(res.body).toEqual({ ok: false, error: { code: 'rate_limited', message: 'Too many requests for this email' } });
    });
});
