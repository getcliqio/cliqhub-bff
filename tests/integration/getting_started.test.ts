import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';

describe('POST /v1/getting_started/get', () => {
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
        const sid = `gs-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'alice', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600, ...extra });
        return sid;
    }
    function mock() {
        const api = vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 }] } as any;
            if (path === '/v1/teams/get') return { items: [{ name: 'tdd', scope: 'cliq' }], total: 1, offset: 0, limit: 1 } as any;
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string) => {
            if (path === '/internal/dashboard/realms') return { ok: true, realms: [{ id: 'r1', slug: 'prod', name: 'Prod', daemons: { online: 1, total: 1 } }] } as any;
            if (path === '/v1/runs/get') return { ok: true, data: { items: [], total: 0 } } as any;
            throw new Error(`unexpected ${path}`);
        });
        return { api, core };
    }

    it('401 without a session', async () => {
        expect((await request(app).post('/v1/getting_started/get').set(CSRF).send({})).status).toBe(401);
    });
    it('rejects unknown fields', async () => {
        const sid = sess();
        expect((await request(app).post('/v1/getting_started/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ x: 1 })).status).toBe(422);
    });
    it('composes progress in one response, as the effective user', async () => {
        const sid = sess({ user_token: 'tok-admin', target_token: 'tok-priya' });
        const { api, core } = mock();
        const res = await request(app).post('/v1/getting_started/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            done_count: 3, total: 4, partial: false,
            cli: { done: true },
            daemon: { done: true, online: 1, total: 1, realm: { org_slug: 'acme', slug: 'prod' } },
            team: { done: true, realm: { org_slug: 'acme', slug: 'prod' } },
            realm: { org_slug: 'acme', slug: 'prod' },
            run: { done: false, run_id: null },
        });
        const teams_call = api.mock.calls.find((c) => c[0] === '/v1/teams/get');
        expect(teams_call?.[1]).toEqual({ realm_id: 'r1', limit: 1 });
        for (const c of [...api.mock.calls, ...core.mock.calls]) expect(c[2]).toBe('tok-priya');
    });

    it('team not done when the realm roster page is empty', async () => {
        const sid = sess();
        const { api } = mock();
        api.mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 }] } as any;
            if (path === '/v1/teams/get') return { items: [], total: 0, offset: 0, limit: 1 } as any;
            throw new Error(`unexpected ${path}`);
        });
        const res = await request(app).post('/v1/getting_started/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ done_count: 2, team: { done: false, realm: null } });
    });
});
