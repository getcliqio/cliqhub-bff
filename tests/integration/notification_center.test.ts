import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { CoreApiClient } from '../../src/repositories/core_api_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';

describe('notification center routes', () => {
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
        const sid = `nc-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600, ...extra });
        return sid;
    }
    function mock() {
        const api = vi.spyOn(ApiClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/orgs/get') return { orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 }] } as any;
            if (path === '/v1/teams/get') return { ok: true, data: { rows: [{ slug: 'dev' }], total: 1 } } as any;
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreApiClient.prototype, 'post').mockImplementation(async (path: string) => {
            switch (path) {
                case '/internal/dashboard/realms': return { ok: true, realms: [{ id: 'r1', slug: 'prod', name: 'Prod' }] } as any;
                case '/v1/realms/get': return { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 1 } } as any;
                case '/v1/orgs/get_notification_rules': return { ok: true, data: [{ id: 'o-r', event: 'run.failed', channel_id: 'c1', realm_id: null, org_id: ORG, team_slug: null, priority: 0 }] } as any;
                case '/v1/realms/get_notification_rules': return { ok: true, data: [] } as any;
                case '/v1/notification_channels/get': return { ok: true, data: [{ id: 'c1', name: '#eng', realm_id: null, org_id: ORG, user_id: null, destinations: [{ type: 'cliqhub' }], enabled: 1, rule_count: 1 }] } as any;
                case '/v1/events/types/list': return { ok: true, types: ['run.failed'] } as any;
                case '/v1/realms/get_by_id': return { ok: true, realm: { id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' } } as any;
                default: throw new Error(`unexpected ${path}`);
            }
        });
        return { api, core };
    }

    for (const [path, body] of [['/v1/notification_center/get', {}], ['/v1/notification_center/check', { realm_id: 'r1' }]] as const) {
        it(`${path}: 401 without session`, async () => {
            expect((await request(app).post(path).set(CSRF).send(body)).status).toBe(401);
        });
        it(`${path}: rejects unknown fields`, async () => {
            const sid = sess();
            expect((await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send({ ...body, nope: 1 })).status).toBe(422);
        });
        it(`${path}: composes as the effective user`, async () => {
            const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
            const { api, core } = mock();
            const res = await request(app).post(path).set(CSRF).set('Cookie', `test_sid=${sid}`).send(body);
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            for (const c of [...api.mock.calls, ...core.mock.calls]) expect(c[2]).toBe('tok-p');
        });
    }

    it('get returns rules with channel names', async () => {
        const sid = sess();
        mock();
        const res = await request(app).post('/v1/notification_center/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.body.data.rules[0]).toMatchObject({ id: 'o-r', channel_name: '#eng', scope: { kind: 'org', org_slug: 'acme' } });
    });

    it('/v1/notification_center/set_rules: validates level and loops Core as the effective user', async () => {
        const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
        const bad = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ events: ['run.failed'], channel_id: 'c1' });
        expect(bad.status).toBe(422);
        const core = vi.spyOn(CoreApiClient.prototype, 'post').mockImplementation(async (path: string, body: any) => {
            expect(path).toBe('/v1/orgs/set_notification_rules');
            return { ok: true, data: { id: `r-${body.event}` } } as any;
        });
        const res = await request(app).post('/v1/notification_center/set_rules').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG, events: ['run.failed', 'run.crashed'], channel_id: 'c1' });
        expect(res.status).toBe(200);
        expect(res.body.data.saved).toHaveLength(2);
        expect(core).toHaveBeenCalledTimes(2);
        for (const c of core.mock.calls) expect(c[2]).toBe('tok-p');
    });
});
