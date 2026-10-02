/**
 * Invitations over HTTP against a stubbed Core (fetch): request bodies as
 * Core receives them, responses as the SPA receives them, sessions only on
 * accept, and Core errors (code + details) passed through unchanged.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { stub_core, ok, fail, identity_routes } from '../helpers/core_stub.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const INVITE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ITEM = {
    invite_id: INVITE_ID, email: 'priya@example.test', role: 'member', kind: 'org', status: 'pending',
    inviter: { id: USER_ID, display_name: 'Sapan' }, send_count: 2, last_sent_at: '2026-10-03T10:20:00Z',
    expires_at: '2026-10-16T10:20:00Z', created_at: '2026-10-02T10:20:00Z',
    deliveries: [
        { kind: 'sent', sent_at: '2026-10-02T10:20:00Z', email_sent: true, provider_message_id: '<a@relay.example.test>' },
        { kind: 'sent', sent_at: '2026-10-03T10:20:00Z', email_sent: true, provider_message_id: '<b@relay.example.test>' },
    ],
};

describe('Invitations integration (Core stubbed at fetch)', () => {
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
    });

    function make_session(role: 'user' | 'admin' = 'user') {
        const now = Math.floor(Date.now() / 1000);
        const sid = `inv-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid, user_id: USER_ID, act_as_user_id: USER_ID, username: 'sapan', email: 'sapan@example.test',
            role, actor_role: role, user_token: 'cliq_tok_sapan', target_token: 'cliq_tok_sapan',
            scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/invitations/create', () => {
        it('needs a session', async () => {
            const calls = stub_core({});
            const res = await request(app).post('/v1/invitations/create').set(CSRF)
                .send({ target_type: 'org', org_id: ORG_ID, email: 'priya@example.test' });
            expect(res.status).toBe(401);
            expect(calls).toHaveLength(0);
        });

        it('role owner + reactivate reach Core; the answer has resent / email_sent / invite_url and no token', async () => {
            const sid = make_session('admin');
            const calls = stub_core({
                '/v1/invitations/create': ok({
                    invite_id: INVITE_ID, status: 'pending', email: 'priya@example.test', role: 'owner',
                    expires_at: '2026-10-16T10:20:00Z', resent: true, email_sent: false,
                    invite_url: 'https://app.example.test/invite/fake', token: 'must-not-leak',
                }),
            });

            const res = await request(app).post('/v1/invitations/create').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ target_type: 'org', org_id: ORG_ID, email: 'priya@example.test', role: 'owner', reactivate: true });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: {
                invite_id: INVITE_ID, status: 'pending', email: 'priya@example.test', role: 'owner',
                expires_at: '2026-10-16T10:20:00Z', resent: true, email_sent: false,
                invite_url: 'https://app.example.test/invite/fake',
            } });
            expect(calls[0].path).toBe('/v1/invitations/create');
            expect(calls[0].body).toEqual({ target_type: 'org', org_id: ORG_ID, email: 'priya@example.test', role: 'owner', reactivate: true });
            expect(calls[0].headers.authorization).toBe('Bearer cliq_tok_sapan');
        });

        it('rejects role owner on a realm and operator on an org (422, Core not called)', async () => {
            const sid = make_session();
            const calls = stub_core({});
            const realm = await request(app).post('/v1/invitations/create').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ target_type: 'realm', realm_id: 'prod', email: 'p@example.test', role: 'owner' });
            const org = await request(app).post('/v1/invitations/create').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ target_type: 'org', org_id: ORG_ID, email: 'p@example.test', role: 'operator' });
            expect(realm.status).toBe(422);
            expect(org.status).toBe(422);
            expect(calls).toHaveLength(0);
        });

        it.each([
            [409, 'already_member', 'Already a member', { user_id: USER_ID }],
            [409, 'deleted', 'That email belongs to a deleted user', { kind: 'user', id: USER_ID, deleted_at: '2026-09-01T00:00:00Z', was_active: true }],
        ])('passes %s %s through with details', async (status, code, message, details) => {
            const sid = make_session();
            stub_core({ '/v1/invitations/create': fail(status, code, message, details) });

            const res = await request(app).post('/v1/invitations/create').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ target_type: 'org', org_id: ORG_ID, email: 'priya@example.test' });

            expect(res.status).toBe(status);
            expect(res.body).toEqual({ ok: false, error: { code, message, details } });
        });
    });

    describe('POST /v1/invitations/get', () => {
        it('status / query / sort / page reach Core with target_type; one page of items with deliveries and paging', async () => {
            const sid = make_session();
            const calls = stub_core({
                '/v1/invitations/get': ok({ target_type: 'org', org_id: ORG_ID, invites: [ITEM], total: 26, page: 2, page_size: 25 }),
            });

            const res = await request(app).post('/v1/invitations/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ org_id: ORG_ID, status: 'pending', query: 'priya', sort: '-created_at', page: 2, page_size: 25 });

            expect(res.status).toBe(200);
            expect(calls[0].body).toEqual({ target_type: 'org', org_id: ORG_ID, status: 'pending', query: 'priya', sort: '-created_at', page: 2, page_size: 25 });
            expect(res.body.data).toEqual({ target_type: 'org', org_id: ORG_ID, invites: [ITEM], total: 26, page: 2, page_size: 25 });
        });

        it('an unexpected field from Core (e.g. a token) never reaches the browser', async () => {
            const sid = make_session();
            stub_core({
                '/v1/invitations/get': ok({ target_type: 'org', org_id: ORG_ID, invites: [{ ...ITEM, token: 'must-not-leak' }], total: 1, page: 1, page_size: 25 }),
            });

            const res = await request(app).post('/v1/invitations/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_ID });

            expect(res.body.data.invites).toEqual([ITEM]);
            expect(JSON.stringify(res.body)).not.toContain('must-not-leak');
        });

        it('rejects an unknown status and a body without org_id / realm_id', async () => {
            const sid = make_session();
            stub_core({});
            expect((await request(app).post('/v1/invitations/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ org_id: ORG_ID, status: 'cancelled' })).status).toBe(422);
            expect((await request(app).post('/v1/invitations/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ status: 'pending' })).status).toBe(422);
        });
    });

    describe('POST /v1/invitations/revoke', () => {
        it('{ invite_id } → { invite_id, status: revoked }', async () => {
            const sid = make_session();
            const calls = stub_core({ '/v1/invitations/revoke': ok({ invite_id: INVITE_ID, status: 'revoked' }) });

            const res = await request(app).post('/v1/invitations/revoke').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ invite_id: INVITE_ID });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: { invite_id: INVITE_ID, status: 'revoked' } });
            expect(calls[0].body).toEqual({ invite_id: INVITE_ID });
        });

        it('passes 409 not_pending through with its status', async () => {
            const sid = make_session();
            stub_core({ '/v1/invitations/revoke': fail(409, 'not_pending', 'The invite is not pending', { status: 'accepted' }) });

            const res = await request(app).post('/v1/invitations/revoke').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ invite_id: INVITE_ID });

            expect(res.status).toBe(409);
            expect(res.body.error).toEqual({ code: 'not_pending', message: 'The invite is not pending', details: { status: 'accepted' } });
        });
    });

    describe('POST /v1/invitations/get_by_token (public)', () => {
        const PREVIEW = {
            invite_id: INVITE_ID, kind: 'owner', status: 'expired',
            org: { slug: 'measureone', display_name: 'MeasureOne' }, realm: null, role: 'owner',
            inviter: { display_name: 'Sapan' }, invitee_email: 'priya@example.test', account_exists: false,
            expires_at: '2026-10-16T10:12:00Z',
        };

        it('works signed out and maps the preview (an expired invite is 200 with its status)', async () => {
            const calls = stub_core({ '/v1/invitations/get_by_token': ok(PREVIEW) });

            const res = await request(app).post('/v1/invitations/get_by_token').set(CSRF).send({ token: 'invite-secret' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: PREVIEW });
            expect(calls[0].body).toEqual({ token: 'invite-secret' });
            expect(calls[0].headers.authorization).toBeUndefined();
        });

        it('unknown token → 404 not_found', async () => {
            stub_core({ '/v1/invitations/get_by_token': fail(404, 'not_found', 'Invite not found') });
            const res = await request(app).post('/v1/invitations/get_by_token').set(CSRF).send({ token: 'nope' });
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('not_found');
        });
    });

    describe('POST /v1/invitations/accept (public)', () => {
        const ACCEPTED = {
            decision: 'accept',
            user: { id: USER_ID, username: 'priya', status: 'active', created: true },
            org: { id: ORG_ID, slug: 'measureone' }, realm: null,
            membership: { role: 'member', status: 'active' },
        };

        it('accept as a new person: session cookie set, sign-in data under `session`, Core\'s PAT never in the body', async () => {
            const calls = stub_core({
                '/v1/invitations/accept': ok({ ...ACCEPTED, token: 'cliq_tok_priya' }),
                ...identity_routes(USER_ID, 'priya'),
            });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF)
                .send({ token: 'invite-secret', decision: 'accept', username: 'priya', password: 'secret123', display_name: 'Priya N' });

            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']?.[0]).toContain('test_sid=');
            expect(res.body.data).toMatchObject(ACCEPTED);
            expect(res.body.data.session.user.username).toBe('priya');
            expect(JSON.stringify(res.body)).not.toContain('cliq_tok_priya');
            expect(calls[0].body).toEqual({ token: 'invite-secret', decision: 'accept', username: 'priya', password: 'secret123', display_name: 'Priya N' });
        });

        it('accept by a reactivated invitee: Core keeps their username, the session is theirs', async () => {
            // The invited account already had a username; Core ignores the one sent and returns the kept one.
            stub_core({
                '/v1/invitations/accept': ok({ ...ACCEPTED, user: { ...ACCEPTED.user, username: 'priya-n' }, token: 'cliq_tok_priya' }),
                ...identity_routes(USER_ID, 'priya-n'),
            });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF)
                .send({ token: 'invite-secret', decision: 'accept', username: 'priya', password: 'secret123' });

            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']?.[0]).toContain('test_sid=');
            expect(res.body.data.user).toEqual({ id: USER_ID, username: 'priya-n', status: 'active', created: true });
            expect(res.body.data.session.user.username).toBe('priya-n');
        });

        it('accept as a new person from the CLI: the bearer token comes back under `session`', async () => {
            stub_core({ '/v1/invitations/accept': ok({ ...ACCEPTED, token: 'cliq_tok_priya' }), ...identity_routes(USER_ID, 'priya') });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF).set('X-Client', 'cli')
                .send({ token: 'invite-secret', decision: 'accept', username: 'priya', password: 'secret123' });

            expect(res.status).toBe(200);
            expect(res.body.data.session).toMatchObject({ token: 'cliq_tok_priya', scopes: ['priya'] });
        });

        it('accept signed in: Core gets the caller\'s bearer, no new session', async () => {
            const sid = make_session();
            const calls = stub_core({ '/v1/invitations/accept': ok({ ...ACCEPTED, user: { ...ACCEPTED.user, created: false } }) });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ token: 'invite-secret', decision: 'accept' });

            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']).toBeUndefined();
            expect(res.body.data).not.toHaveProperty('session');
            expect(calls[0].headers.authorization).toBe('Bearer cliq_tok_sapan');
        });

        it('decline: { decision: decline }, never a session', async () => {
            const calls = stub_core({ '/v1/invitations/accept': ok({ decision: 'decline', token: 'cliq_tok_x' }) });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF).send({ token: 'invite-secret', decision: 'decline' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ ok: true, data: { decision: 'decline' } });
            expect(res.headers['set-cookie']).toBeUndefined();
            expect(calls).toHaveLength(1);
        });

        it('decision is required', async () => {
            const calls = stub_core({});
            const res = await request(app).post('/v1/invitations/accept').set(CSRF).send({ token: 'invite-secret' });
            expect(res.status).toBe(422);
            expect(calls).toHaveLength(0);
        });

        it.each([
            [410, 'expired', 'The invite has expired', { expired_at: '2026-10-16T10:20:00Z' }],
            [409, 'not_pending', 'The invite was already used', { status: 'accepted' }],
            [409, 'conflict', 'Username taken', { kind: 'user', field: 'username', holder: { id: USER_ID, slug: 'priya' } }],
            [401, 'sign_in_required', 'Sign in to accept', { invitee_email: 'priya@example.test' }],
            [403, 'email_mismatch', 'Signed in as someone else', { invitee_email: 'priya@example.test' }],
            [403, 'account_deleted', 'This account was deleted', undefined],
        ])('passes %s %s through with details, no session', async (status, code, message, details) => {
            stub_core({ '/v1/invitations/accept': fail(status, code, message, details) });

            const res = await request(app).post('/v1/invitations/accept').set(CSRF)
                .send({ token: 'invite-secret', decision: 'accept', username: 'priya', password: 'secret123' });

            expect(res.status).toBe(status);
            expect(res.body).toEqual({ ok: false, error: { code, message, ...(details ? { details } : {}) } });
            expect(res.headers['set-cookie']).toBeUndefined();
        });
    });
});
