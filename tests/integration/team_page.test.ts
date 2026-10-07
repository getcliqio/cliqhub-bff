import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { CoreClient } from '../../src/repositories/core_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const TEAM = '11111111-1111-4111-8111-111111111111';

describe('POST /v1/team_list/get + /v1/team_page/get', () => {
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
        const sid = `tp-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600, ...extra });
        return sid;
    }

    it('401 without session; 422 on unknown fields / bad view', async () => {
        expect((await request(app).post('/v1/team_list/get').set(CSRF).send({})).status).toBe(401);
        const sid = sess();
        expect((await request(app).post('/v1/team_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ nope: 1 })).status).toBe(422);
        expect((await request(app).post('/v1/team_page/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ scope: 'a', name: 'b', view: 'x' })).status).toBe(422);
    });

    it('list composes as the effective user', async () => {
        const sid = sess({ user_token: 'tok-admin', target_token: 'tok-p' });
        const api = vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string, body: any) => {
            if (path === '/v1/teams/get' && body.mine) return { items: [{ id: TEAM, name: 'dev', scope: 'acme', description: '', status: 'published', latest_version: '1.0.0' }], total: 1 } as any;
            if (path === '/v1/teams/get' && body.realm_id) return { items: [{ slug: 'dev', label: '@acme/dev', version: '1.0.0', in_team_list: true, installed_count: 1 }], total: 1 } as any;
            if (path === '/v1/teams/get_phases') return { team_id: TEAM, version_id: 'v', version: '1.0.0', phases: [{ name: 'a', type: 'standard' }] } as any;
            throw new Error(`unexpected ${path}`);
        });
        const core = vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string) => {
            if (path === '/v1/realms/get') return { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }], total: 1 } } as any;
            throw new Error(`unexpected ${path}`);
        });
        const res = await request(app).post('/v1/team_list/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ status: 'all' });
        expect(res.status).toBe(200);
        expect(res.body.data.items[0]).toMatchObject({ name: 'dev', phase_types: ['standard'], installs: [expect.objectContaining({ realm_slug: 'prod' })] });
        for (const c of [...api.mock.calls, ...core.mock.calls]) expect(c[2]).toBe('tok-p');
    });

    it('page runs view asks Core runs/get for the team by name', async () => {
        const sid = sess();
        vi.spyOn(CoreClient.prototype, 'post').mockImplementation(async (path: string) => {
            if (path === '/v1/teams/get_by_id') return { id: TEAM, name: 'dev', scope: 'acme', versions: [{ version: '1.0.0' }], workflow: { phases: [] }, roles: [] } as any;
            throw new Error(`unexpected ${path}`);
        });
        const bodies: any[] = [];
        vi.spyOn(CoreClient.prototype, 'post_body').mockImplementation(async (path: string, body: any) => {
            if (path === '/v1/realms/get') return { ok: true, data: { items: [], total: 0 } } as any;
            if (path === '/v1/runs/get') { bodies.push(body); return { ok: true, data: { items: [], total: 4 } } as any; }
            throw new Error(`unexpected ${path}`);
        });
        const res = await request(app).post('/v1/team_page/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ scope: 'acme', name: 'dev', view: 'runs' });
        expect(res.status).toBe(200);
        expect(res.body.data.counts.runs).toBe(4);
        // Runs are found by the team's name (scope + slug), not a published version id.
        expect(bodies.length).toBeGreaterThan(0);
        expect(bodies.every((b) => b.team?.scope === 'acme' && b.team?.slug === 'dev' && !('team_id' in b) && !('org_id' in b))).toBe(true);
    });
});
