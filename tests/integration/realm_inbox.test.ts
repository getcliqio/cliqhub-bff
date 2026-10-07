import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { ApiError } from '../../src/errors/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('BFF realm composition routes', () => {
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
        const sid = `ri-${Math.random().toString(36).slice(2)}`;
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
        // `orgs/get { mine }` (run detail resolves the realm's org for the events read).
        vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: 'org-1', slug: 'acme' }] } as any;
            throw new Error(`unexpected ${path}`);
        });
        return vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, body: any) => {
            if (path === '/v1/realms/get_by_id') return { ok: true, realm: { id: 'realm-1', slug: 'prod', name: 'Prod', org_slug: 'acme' } } as any;
            if (path === '/v1/reviews/get') return { ok: true, data: { items: [{ review_id: 'rev-1', run_id: 'r1', title: 'Approve', requested_at: 3, status: 'pending' }], total: 1 } } as any;
            if (path === '/v1/notifications/get') return { ok: true, data: { items: [{ id: 'n1', event: 'run.started', run_id: 'r1', created_at: 1, payload: {} }], total: 1 } } as any;
            if (path === '/v1/runs/get') {
                if (body.parent_run_id) return { ok: true, data: { items: [{ run_id: 'c1', state: 'failed', parent_run_id: 'r1', parent_phase: 'plan', team_label: '@cliq/sub' }], total: 1 } } as any;
                if (body.query) return { ok: true, data: { items: [{ run_id: 'r1', state: 'awaiting_input', team_label: '@cliq/dev' }], total: 1 } } as any;
                if (body.state === 'awaiting_input') return { ok: true, data: { items: [{ run_id: 'r1', state: 'awaiting_input', last_updated_at: 5 }], total: 1 } } as any;
                return { ok: true, data: { items: [], total: 0 } } as any;
            }
            if (path === '/v1/runs/get_by_id') return { ok: true, data: body.run_id === 'r1' ? { run_id: 'r1', realm_id: 'realm-1', state: 'awaiting_input', ...(body.with_history ? { history: [{ type: 'run.started', at: 1, from_phase: null, phase: null, error: null, actor: null }] } : {}) } : null } as any;
            if (path === '/v1/runs/get_status') return { ok: true, data: [{ phase: 'plan', status: 'completed' }] } as any;
            if (path === '/v1/artifacts/get') return { ok: true, data: [{ artifact_id: 'a1', run_id: 'r1', phase: 'plan', name: 'plan.md', description: null, mime_type: 'text/markdown', size_bytes: 12, download_url: 'https://r2/x', created_at: 4 }] } as any;
            throw new Error(`unexpected ${path}`);
        });
    }

    for (const [path, body] of [['/v1/realm_inbox/get', { org_slug: 'acme', slug: 'prod' }], ['/v1/run_detail/get', { run_id: 'r1' }]] as const) {
        describe(path, () => {
            it('returns 401 without a session', async () => {
                const res = await request(app).post(path).set(CSRF).send(body);
                expect(res.status).toBe(401);
            });

            it('rejects a request without the CSRF header', async () => {
                const sid = make_session();
                const res = await request(app).post(path).set('Cookie', `test_sid=${sid}`).send(body);
                expect(res.status).toBeGreaterThanOrEqual(400);
            });

            it('rejects unknown and missing fields', async () => {
                const sid = make_session();
                const extra = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send({ ...body, realm_id: 'x' });
                expect(extra.status).toBe(422);
                const empty = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
                expect(empty.status).toBe(422);
            });

            it('uses the impersonated token for every Core read during take-over', async () => {
                const sid = make_session({ user_token: 'tok-admin', target_token: 'tok-priya', act_as_user_id: 'u-priya' });
                const core = mock_core();
                const res = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send(body);
                expect(res.status).toBe(200);
                expect(core.mock.calls.length).toBeGreaterThan(1);
                for (const call of core.mock.calls) expect(call[2]).toBe('tok-priya');
            });
        });
    }

    it('realm inbox composes one { ok, data } response from five Core reads', async () => {
        const sid = make_session();
        const core = mock_core();
        const res = await request(app).post('/v1/realm_inbox/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_slug: 'acme', slug: 'prod' });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.data.realm).toEqual({ id: 'realm-1', slug: 'prod', name: 'Prod', org_slug: 'acme' });
        expect(res.body.data.items.map((i: any) => i.kind)).toEqual(['input', 'review']);
        expect(res.body.data.counts).toEqual({ reviews: 1, awaiting_input: 1, failed_24h: 0, running: 0 });
        expect(core.mock.calls.map((c) => c[0]).sort()).toEqual(['/v1/realms/get_by_id', '/v1/reviews/get', '/v1/runs/get', '/v1/runs/get', '/v1/runs/get']);
    });

    it('realm inbox passes a Core 403 through as an error envelope', async () => {
        const sid = make_session();
        vi.spyOn(CoreClient.prototype, 'post_body').mockRejectedValue(new ApiError('forbidden', 'Not a realm member', 403));
        const res = await request(app).post('/v1/realm_inbox/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_slug: 'acme', slug: 'prod' });
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ ok: false, error: { code: 'forbidden' } });
    });

    it('run detail composes run + phases + labels + realm + reviews + artifacts', async () => {
        const sid = make_session();
        mock_core();
        const res = await request(app).post('/v1/run_detail/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ run_id: 'r1' });
        expect(res.status).toBe(200);
        expect(res.body.data.run).toMatchObject({ run_id: 'r1', team_label: '@cliq/dev' });
        expect(res.body.data.phases).toHaveLength(1);
        expect(res.body.data.realm.slug).toBe('prod');
        expect(res.body.data.reviews.map((r: any) => r.id)).toEqual(['rev-1']);
        expect(res.body.data.artifacts).toEqual([{ artifact_id: 'a1', source: 'file', kind: 'file', content_preview: null, phase: 'plan', name: 'plan.md', description: null, mime_type: 'text/markdown', size_bytes: 12, created_at: 4 }]);
        expect(res.body.data.sections.artifacts.status).toBe('ok');
        expect(res.body.data.attempts).toEqual([{ n: 1, started_at: 1, from_phase: null, ended_at: null, state: 'running', failed_phase: null, error: null, resumed_by: null }]);
        expect(res.body.data.attempts_source).toBe('events');
        expect(res.body.data.children.map((c: any) => [c.run_id, c.parent_phase, c.state])).toEqual([['c1', 'plan', 'failed']]);
        expect(res.body.data.parent).toBeNull();
        expect(res.body.data.partial).toBe(false);
    });

    it('run detail 404s for an unknown run', async () => {
        const sid = make_session();
        mock_core();
        const res = await request(app).post('/v1/run_detail/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ run_id: 'missing' });
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ ok: false, error: { code: 'not_found' } });
    });
});
