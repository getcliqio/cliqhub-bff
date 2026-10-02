import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { CoreClient } from '../../src/repositories/core_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';

describe('POST /v1/inbox/get', () => {
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
        const sid = `ib-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600, ...extra });
        return sid;
    }

    it('401 without session', async () => {
        expect((await request(app).post('/v1/inbox/get').set(CSRF).send({})).status).toBe(401);
    });

    it('rejects unknown fields', async () => {
        const sid = sess();
        expect((await request(app).post('/v1/inbox/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ nope: 1 })).status).toBe(422);
    });

    it('composes per org as the effective user', async () => {
        const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
        const api = vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 }] } as any;
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, body: any) => {
            if (path !== '/v1/notifications/get') throw new Error(`unexpected ${path}`);
            expect(body).toMatchObject({ org_id: ORG, types: ['run.failed'], limit: 21 });
            return { ok: true, data: { items: [{ id: 'n1', event: 'run.failed', title: 'Boom', message: null, realm_id: 'r1', realm_slug: 'prod', user_id: null, team: null, run_id: 'run-1', phase: null, severity: 'error', payload: {}, created_at: 5 }], total: 1, offset: 0, limit: 21 } } as any;
        });
        const res = await request(app).post('/v1/inbox/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ types: ['run.failed'], limit: 20 });
        expect(res.status).toBe(200);
        expect(res.body.data.items[0]).toMatchObject({ id: 'n1', org_slug: 'acme', realm_slug: 'prod' });
        for (const c of [...api.mock.calls, ...core.mock.calls]) expect(c[2]).toBe('tok-p');
    });
});
