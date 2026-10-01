import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreApiClient } from '../../src/repositories/core_api_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';
const AG = '22222222-2222-4222-8222-222222222222';

describe('POST /v1/agent_list/get + /v1/agent_page/get', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];
    beforeAll(() => { ({ app, session_store } = create_test_app()); });
    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.touch.mockResolvedValue(undefined);
    });
    function sess() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `ap-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-p', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600 });
        return sid;
    }

    it('401 without session; 422 on bad input', async () => {
        expect((await request(app).post('/v1/agent_list/get').set(CSRF).send({ org_id: ORG })).status).toBe(401);
        const sid = sess();
        expect((await request(app).post('/v1/agent_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: 'nope' })).status).toBe(422);
        expect((await request(app).post('/v1/agent_page/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG, id: AG, view: 'x' })).status).toBe(422);
    });

    it('list composes over Core as the effective user; secrets stay masked', async () => {
        const sid = sess();
        const tokens: string[] = [];
        vi.spyOn(CoreApiClient.prototype, 'post').mockImplementation(async (path: string, body: any, token?: string) => {
            tokens.push(token ?? '');
            if (path === '/v1/agents/get') return { ok: true, data: [{ id: AG, name: 'jira', version: '1.2.0', description: '', agent_type: 'connector', is_system: true, created_at: 1, updated_at: 1, used_by: [] }] } as any;
            if (path === '/v1/agents/get_settings') return { ok: true, data: [{ id: AG, name: 'jira', version: '1.2.0', description: null, is_system: true, settings: { required: [{ key: 'api_token' }], optional: [] }, values: { api_token: 'ATATT3xFfGF0abcd1234x7Qa' }, source: { api_token: body.realm_id ? 'realm' : 'org' }, required_total: 1, required_configured: 1, all_required_configured: true }] } as any;
            if (path === '/v1/realms/get') return { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 1 } } as any;
            throw new Error(`unexpected ${path}`);
        });
        const res = await request(app).post('/v1/agent_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ org_id: ORG });
        expect(res.status).toBe(200);
        expect(res.body.data.items[0]).toMatchObject({ name: 'jira', setup: { ready: true }, overrides: [{ realm_slug: 'prod', keys: ['api_token'] }] });
        expect(JSON.stringify(res.body)).not.toContain('ATATT3');
        expect(new Set(tokens)).toEqual(new Set(['tok-p']));
    });
});
