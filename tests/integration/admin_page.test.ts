import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('POST /v1/admin_home/get + /v1/admin_list/get', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];
    beforeAll(() => { ({ app, session_store } = create_test_app()); });
    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => session_store._sessions.get(sid) ?? null);
        session_store.touch.mockResolvedValue(undefined);
    });
    function sess(role: 'user' | 'admin') {
        const now = Math.floor(Date.now() / 1000);
        const sid = `adm-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role, user_token: 'tok-a', target_token: 'tok-p', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600 });
        return sid;
    }

    it('401 without session, 403 for non-site-admins (org admins included)', async () => {
        expect((await request(app).post('/v1/admin_home/get').set(CSRF).send({})).status).toBe(401);
        const sid = sess('user');
        expect((await request(app).post('/v1/admin_home/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({})).status).toBe(403);
        expect((await request(app).post('/v1/admin_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ kind: 'accounts' })).status).toBe(403);
    });

    it('422 on an unknown list kind', async () => {
        const sid = sess('admin');
        expect((await request(app).post('/v1/admin_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ kind: 'nope' })).status).toBe(422);
    });

    it('home composes over Core with the session token', async () => {
        const sid = sess('admin');
        const tokens = new Set<string>();
        vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, _b: any, token?: string) => {
            tokens.add(token ?? '');
            if (path === '/v1/orgs/get') return { ok: true, data: { orgs: [], total: 5 } } as any;
            if (path === '/internal/reports/audit') return { ok: true, data: { entries: [] } } as any;
            return { ok: true, data: { users: [], teams: [], total: 9 } } as any;
        });
        const res = await request(app).post('/v1/admin_home/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({});
        expect(res.status).toBe(200);
        expect(res.body.data.counts).toMatchObject({ accounts: 9, orgs: 5 });
        expect(res.body.data.core).toMatchObject({ api_version: 2 });
        expect([...tokens]).toEqual(['tok-p']);
    });

    it('list returns accounts rows', async () => {
        const sid = sess('admin');
        vi.spyOn(CoreClient.prototype, 'post_body').mockResolvedValue({ ok: true, data: { users: [{ id: 'u9', username: 'kim', email: 'k@x', role: 'admin' }], total: 1 } } as any);
        const res = await request(app).post('/v1/admin_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ kind: 'accounts', query: 'kim' });
        expect(res.status).toBe(200);
        expect(res.body.data.items[0]).toMatchObject({ id: 'u9', role: 'admin' });
    });

    it('accounts include_deleted reaches Core users/get; 422 when it is not a boolean', async () => {
        const sid = sess('admin');
        const spy = vi.spyOn(CoreClient.prototype, 'post_body').mockResolvedValue({ ok: true, data: { users: [], total: 0 } } as any);
        const res = await request(app).post('/v1/admin_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ kind: 'accounts', include_deleted: true });
        expect(res.status).toBe(200);
        expect(spy.mock.calls.find(([path]) => path === '/v1/users/get')![1]).toMatchObject({ include_deleted: true });
        expect((await request(app).post('/v1/admin_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ kind: 'accounts', include_deleted: 'yes' })).status).toBe(422);
    });
});
