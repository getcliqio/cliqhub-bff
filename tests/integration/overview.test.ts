import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { ApiError } from '../../src/errors/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';

describe('POST /v1/overview/get', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.touch.mockResolvedValue(undefined);
    });

    function make_session(extra: Record<string, unknown> = {}) {
        const now = Math.floor(Date.now() / 1000);
        const sid = `ov-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: 'u-1', username: 'alice', email: 'a@test.com', role: 'user',
            user_token: 'tok-alice', target_token: 'tok-alice', act_as_user_id: 'u-1',
            token: 'tok-alice', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
            ...extra,
        });
        return sid;
    }

    function mock_core() {
        const orgs = vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') {
                return { orgs: [
                    { id: ORG_A, slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 3, scope_count: 1 },
                    { id: ORG_B, slug: 'beta', display_name: 'Beta', role: 'member', member_count: 9, scope_count: 1 },
                ] } as any;
            }
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, body: any) => {
            if (path === '/internal/dashboard/summary') {
                return { ok: true, counts: { active_runs: 1, awaiting_input: 0, failed_24h: 0, completed_24h: 2, daemons_online: 1, daemons_total: 1 }, live_runs: [], pending_reviews: [
                    { review_id: `rev-${body.org_id.slice(0, 2)}`, title: 'Approve', requested_at: body.org_id === ORG_A ? 2 : 1, status: 'pending' },
                ] } as any;
            }
            if (path === '/internal/dashboard/realms') {
                return { ok: true, realms: [{ id: `realm-${body.org_id.slice(0, 2)}`, slug: 'prod', name: 'Prod', pending_reviews: 1, runs: { active: 1, awaiting_input: 0 }, daemons: { online: 1, total: 1 } }] } as any;
            }
            if (path === '/v1/notifications/get') {
                return { ok: true, data: { items: [{ id: `n-${body.org_id.slice(0, 2)}`, event: 'run.failed', title: 'Boom', message: null, realm_id: 'r', realm_slug: 'prod', user_id: null, team: null, run_id: null, phase: null, severity: 'error', payload: {}, created_at: 100 }], total: 1 } } as any;
            }
            throw new Error(`unexpected ${path}`);
        });
        return { orgs, core };
    }

    it('returns 401 without a session', async () => {
        const res = await request(app).post('/v1/overview/get').set(CSRF).send({});
        expect(res.status).toBe(401);
    });

    it('rejects a request without the CSRF header', async () => {
        const sid = make_session();
        const res = await request(app).post('/v1/overview/get').set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects unknown body fields', async () => {
        const sid = make_session();
        const res = await request(app).post('/v1/overview/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG_A });
        expect(res.status).toBe(422);
    });

    it('composes every org in one response with the { ok, data } envelope', async () => {
        const sid = make_session();
        const { orgs, core } = mock_core();
        const res = await request(app).post('/v1/overview/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.data.orgs.map((o: any) => [o.slug, o.role])).toEqual([['acme', 'owner'], ['beta', 'member']]);
        expect(res.body.data.totals).toMatchObject({ orgs: 2, realms: 2, pending_reviews: 2, active_runs: 2 });
        expect(res.body.data.needs_you.map((i: any) => i.org_slug)).toEqual(['acme', 'beta']);
        // Browser made one call; BFF made 1 org list + 2 × (2 rollups + 1 inbox summary), all with the session token.
        expect(orgs).toHaveBeenCalledTimes(1);
        expect(orgs.mock.calls[0][1]).toEqual({ mine: true });
        expect(core).toHaveBeenCalledTimes(6);
        expect(res.body.data.inbox).toMatchObject({ new_count: 2, capped: false, status: 'ok' });
        expect(res.body.data.inbox.latest).toHaveLength(2);
        for (const call of core.mock.calls) expect(call[2]).toBe('tok-alice');
    });

    it('uses the impersonated token during admin take-over', async () => {
        const sid = make_session({ user_token: 'tok-admin', target_token: 'tok-priya', act_as_user_id: 'u-priya' });
        const { orgs, core } = mock_core();
        await request(app).post('/v1/overview/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(orgs.mock.calls[0][2]).toBe('tok-priya');
        for (const call of core.mock.calls) expect(call[2]).toBe('tok-priya');
    });

    it('returns 403 when filtering to an org the user is not in', async () => {
        const sid = make_session();
        mock_core();
        const res = await request(app).post('/v1/overview/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
            .send({ org_ids: ['99999999-9999-4999-8999-999999999999'] });
        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
    });

    it('surfaces an org list failure as an error envelope', async () => {
        const sid = make_session();
        vi.spyOn(CoreClient.prototype, 'post').mockRejectedValue(new ApiError('unauthorized', 'Token expired', 401));
        const res = await request(app).post('/v1/overview/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ ok: false, error: { code: 'unauthorized' } });
    });
});
