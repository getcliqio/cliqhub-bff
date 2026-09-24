import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { ApiError } from '../../src/repositories/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

const ALICE_USER = {
    id: 1,
    username: 'alice',
    display_name: 'Alice',
    email: 'alice@test.com',
    role: 'user' as const,
    suspended_at: null,
    suspended_reason: '',
    created_at: '2025-01-01',
    preferences: {},
};

function seed_session(session_store: ReturnType<typeof create_test_app>['session_store'], sid: string, overrides: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    session_store._sessions.set(sid, {
        session_id: sid,
        user_id: 1,
        act_as_user_id: 1,
        username: 'alice',
        email: 'alice@test.com',
        role: 'user',
        actor_role: 'user',
        actor_username: 'alice',
        user_token: 'cliq_tok_user',
        target_token: 'cliq_tok_user',
        scopes_json: JSON.stringify(['alice']),
        org_slugs_json: JSON.stringify(['acme']),
        created_at: now,
        last_active: now,
        expires_at: now + 3600,
        ...overrides,
    });
}

describe('Auth / session integration', () => {
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
        session_store.update_act_as.mockImplementation(async (sid: string, fields: any) => {
            const existing = session_store._sessions.get(sid);
            if (existing) session_store._sessions.set(sid, { ...existing, ...fields });
        });
        session_store.restore_actor.mockImplementation(async (sid: string, fields: any) => {
            const existing = session_store._sessions.get(sid);
            if (existing) {
                session_store._sessions.set(sid, {
                    ...existing,
                    ...fields,
                    act_as_user_id: existing.user_id,
                    target_token: existing.user_token,
                });
            }
        });
    });

    describe('POST /v1/session/create', () => {
        it('returns 200 + set-cookie on valid credentials', async () => {
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                user: ALICE_USER,
                token: 'cliq_tok_abc',
                scopes: ['alice'],
                org_slugs: ['acme'],
            });

            const res = await request(app)
                .post('/v1/session/create')
                .set(CSRF)
                .send({ username: 'alice', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.user.username).toBe('alice');
            expect(res.body.data).not.toHaveProperty('token');
            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.headers['set-cookie'][0]).toContain('test_sid=');
        });

        it('returns target_token when X-Client: cli', async () => {
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                user: ALICE_USER,
                token: 'cliq_tok_cli',
                scopes: ['alice'],
                org_slugs: [],
            });

            const res = await request(app)
                .post('/v1/session/create')
                .set(CSRF)
                .set('X-Client', 'cli')
                .send({ username: 'alice', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body.data.token).toBe('cliq_tok_cli');
        });

        it('returns 401 on bad credentials', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(new ApiError('unauthorized', 'Invalid credentials', 401));

            const res = await request(app)
                .post('/v1/session/create')
                .set(CSRF)
                .send({ username: 'alice', password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('unauthorized');
        });

        it('returns 422 on missing username', async () => {
            const res = await request(app)
                .post('/v1/session/create')
                .set(CSRF)
                .send({ username: '', password: 'pass' });

            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('invalid_params');
        });
    });

    describe('POST /v1/session/get', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/session/get')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(401);
        });

        it('returns user data with valid session cookie', async () => {
            seed_session(session_store, 'known-sid');

            const res = await request(app)
                .post('/v1/session/get')
                .set(CSRF)
                .set('Cookie', 'test_sid=known-sid')
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.user.username).toBe('alice');
            expect(res.body.data.acting_as).toBeNull();
            expect(res.body.data.org_slugs).toEqual(['acme']);
        });
    });

    describe('POST /v1/session/delete', () => {
        it('clears cookie and returns ok', async () => {
            const res = await request(app)
                .post('/v1/session/delete')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.deleted).toBe(true);
        });

        it('destroys session so get returns 401', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    user: ALICE_USER,
                    token: 'cliq_tok_abc',
                    scopes: ['alice'],
                    org_slugs: [],
                })
                .mockResolvedValue({ ok: true }); // revoke

            const create_res = await request(app)
                .post('/v1/session/create')
                .set(CSRF)
                .send({ username: 'alice', password: 'password' });

            const cookie = create_res.headers['set-cookie'][0];

            await request(app)
                .post('/v1/session/delete')
                .set(CSRF)
                .set('Cookie', cookie)
                .send({});

            const get_res = await request(app)
                .post('/v1/session/get')
                .set(CSRF)
                .set('Cookie', cookie)
                .send({});

            expect(get_res.status).toBe(401);
        });
    });

    describe('POST /v1/auth/signup', () => {
        it('returns 201 + set-cookie on valid signup', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    token: 'cliq_tok_new',
                    user: { ...ALICE_USER, id: 2, username: 'bob' },
                })
                .mockResolvedValueOnce({
                    valid: true,
                    user_id: 2,
                })
                .mockResolvedValueOnce({
                    id: 2,
                    username: 'bob',
                    display_name: 'Bob',
                    email: 'bob@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                    orgs: [],
                })
                .mockResolvedValueOnce({ scopes: ['bob'] });

            const res = await request(app)
                .post('/v1/auth/signup')
                .set(CSRF)
                .send({ username: 'bob', email: 'bob@test.com', password: '12345678' });

            expect(res.status).toBe(201);
            expect(res.body.data.user.username).toBe('bob');
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('returns 422 on short password', async () => {
            const res = await request(app)
                .post('/v1/auth/signup')
                .set(CSRF)
                .send({ username: 'bob', email: 'bob@test.com', password: '1234567' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/auth/generate_token', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/auth/generate_token')
                .set(CSRF)
                .send({ type: 'user', name: 'CI' });

            expect(res.status).toBe(401);
        });

        it('creates token for authenticated user', async () => {
            seed_session(session_store, 'token-test-sid');
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ token: 'cliq_tok_new123', name: 'CI', id: 9, realm_ids: [] });

            const res = await request(app)
                .post('/v1/auth/generate_token')
                .set(CSRF)
                .set('Cookie', 'test_sid=token-test-sid')
                .send({ type: 'user', name: 'CI' });

            expect(res.status).toBe(201);
            expect(res.body.data.token).toBe('cliq_tok_new123');
        });

        it('creates token with Authorization Bearer (CLI PAT, no cookie)', async () => {
            const user_uuid = '11111111-1111-4111-8111-111111111111';
            // session_auth hydrates Bearer before the handler (validate → user → scopes).
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ valid: true, user_id: user_uuid })
                .mockResolvedValueOnce({
                    id: user_uuid,
                    username: 'alice',
                    display_name: 'Alice',
                    email: 'a@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                })
                .mockResolvedValueOnce({ scopes: [] })
                .mockResolvedValueOnce({ token: 'cliq_tok_bearer', name: 'cli-pat', id: 1, realm_ids: [] });

            const res = await request(app)
                .post('/v1/auth/generate_token')
                .set('Authorization', 'Bearer cliq_tok_from_cli')
                .set('X-Client', 'cli')
                .send({ type: 'user', name: 'cli-pat' });

            expect(res.status).toBe(201);
            expect(res.body.data.token).toBe('cliq_tok_bearer');
        });
    });

    describe('POST /v1/auth/revoke_token', () => {
        it('revokes token for authenticated user', async () => {
            seed_session(session_store, 'revoke-test-sid');
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/auth/revoke_token')
                .set(CSRF)
                .set('Cookie', 'test_sid=revoke-test-sid')
                .send({ type: 'user', token_id: 5 });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });
    });

    describe('POST /v1/auth/get_tokens', () => {
        it('returns token list for authenticated user', async () => {
            seed_session(session_store, 'list-test-sid');
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    tokens: [
                        { id: 1, name: 'CLI', created_at: '2025-01-01', last_used_at: null },
                        { id: 2, name: 'CI', created_at: '2025-02-01', last_used_at: '2025-03-01' },
                    ],
                });

            const res = await request(app)
                .post('/v1/auth/get_tokens')
                .set(CSRF)
                .set('Cookie', 'test_sid=list-test-sid')
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.tokens).toHaveLength(2);
        });
    });

    describe('legacy session auth routes (removed)', () => {
        it('POST /v1/auth/login returns 404', async () => {
            const res = await request(app)
                .post('/v1/auth/login')
                .set(CSRF)
                .send({ username: 'alice', password: 'password' });
            expect(res.status).toBe(404);
        });

        it('POST /v1/auth/me returns 404', async () => {
            const res = await request(app)
                .post('/v1/auth/me')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(404);
        });

        it('POST /v1/auth/logout returns 404', async () => {
            const res = await request(app)
                .post('/v1/auth/logout')
                .set(CSRF)
                .send({});
            expect(res.status).toBe(404);
        });
    });
});
