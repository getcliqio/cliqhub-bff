/**
 * `POST /v1/realms/add_team`: one realm goes to Core unchanged (CLI, tokens); `realm_ids` is
 * checked realm by realm first, then installed one Core call per realm.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { stub_core, ok, fail, type CoreCall } from '../helpers/core_stub.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };
const ORG = '11111111-1111-4111-8111-111111111111';
const REALMS: Record<string, { id: string; slug: string; name: string; org_slug: string; owner_user_id: string }> = {
    r1: { id: 'r1', slug: 'prod', name: 'prod', org_slug: 'acme', owner_user_id: 'u-0' },
    r2: { id: 'r2', slug: 'staging', name: 'staging', org_slug: 'acme', owner_user_id: 'u-0' },
};

describe('POST /v1/realms/add_team', () => {
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
        const sid = `ti-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, { session_id: sid, user_id: 'u-1', username: 'a', email: 'a@t', role: 'user', user_token: 'tok-a', target_token: 'tok-a', act_as_user_id: 'u-1', token: 'tok-a', scopes_json: '[]', org_slugs_json: '[]', created_at: now, last_active: now, expires_at: now + 3600 });
        return sid;
    }
    /** Core for one org where u-1 is an operator; `staging_role` is u-1's role in realm r2. */
    function core(staging_role: string, add_team: (call: CoreCall) => ReturnType<typeof ok> = () => ({ status: 200, json: { ok: true, team_list: [] } })) {
        return stub_core({
            '/v1/orgs/get': ok({ orgs: [{ id: ORG, slug: 'acme', display_name: 'Acme', role: 'member', member_count: 2, scope_count: 1 }] }),
            '/v1/orgs/get_by_id': ok({
                id: ORG, slug: 'acme', display_name: 'Acme', status: 'active', owner: null, deleted_at: null, pending_owner_invite: null, my_role: 'member',
                members: [{ user_id: 'u-1', username: 'a', role: 'member', role_id: 'role-op', status: 'active' }],
                roles: [{ id: 'role-op', org_id: ORG, slug: 'operator', name: 'Operator', permissions: ['realms.teams.manage'], is_system: false, is_default: true, member_count: 1 }],
                scopes: [{ slug: 'acme' }], available_permissions: [], owner_only_permissions: [],
            }),
            '/v1/orgs/get_teams': ok({ items: [] }),
            '/v1/realms/get_by_id': (c) => ({ status: 200, json: { ok: true, realm: REALMS[c.body.realm_id as string] } }),
            '/v1/realms/get_members': (c) => ({ status: 200, json: { ok: true, members: [{ member_type: 'user', member_id: 'u-1', role: c.body.realm_id === 'r2' ? staging_role : 'operator' }] } }),
            '/v1/realms/add_team': add_team,
        });
    }

    it('one realm_id: forwarded to Core unchanged, Core’s body returned as is', async () => {
        const calls = core('operator');
        const res = await request(app).post('/v1/realms/add_team').set(CSRF).set('Authorization', 'Bearer pat-cli')
            .send({ realm_id: 'r1', scope: 'acme', slug: 'kyc' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, team_list: [] });
        // Only the install itself reaches Core's API (no pre-flight reads for one realm).
        const api = calls.filter((c) => !c.path.startsWith('/v1/auth/'));
        expect(api.map((c) => c.path)).toEqual(['/v1/realms/add_team']);
        expect(api[0].body).toEqual({ realm_id: 'r1', scope: 'acme', slug: 'kyc' });
        expect(api[0].headers.authorization).toBe('Bearer pat-cli');
    });

    it('realm_ids: checks every realm, then one Core install per realm', async () => {
        const calls = core('operator');
        const res = await request(app).post('/v1/realms/add_team').set(CSRF).set('Cookie', `test_sid=${sess()}`)
            .send({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'] });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(res.body.data).toEqual({ installed: [{ realm_id: 'r1', realm_slug: 'prod' }, { realm_id: 'r2', realm_slug: 'staging' }] });
        expect(calls.filter((c) => c.path === '/v1/realms/add_team').map((c) => c.body)).toEqual([
            { realm_id: 'r1', scope: 'acme', slug: 'kyc' }, { realm_id: 'r2', scope: 'acme', slug: 'kyc' },
        ]);
    });

    it('realm_ids with a realm the user only views: 403 install_blocked naming it; Core never asked to install', async () => {
        const calls = core('member');
        const res = await request(app).post('/v1/realms/add_team').set(CSRF).set('Cookie', `test_sid=${sess()}`)
            .send({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'] });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('install_blocked');
        expect(res.body.error.message).toMatch(/^Nothing was installed.*staging/);
        expect(res.body.error.details.failed).toEqual([{ realm_id: 'r2', realm_slug: 'staging', code: 'level_too_low', error: expect.any(String) }]);
        expect(calls.some((c) => c.path === '/v1/realms/add_team')).toBe(false);
    });

    it('realm_ids where Core refuses one: install_incomplete with what did and did not install', async () => {
        core('operator', (c) => (c.body.realm_id === 'r2' ? fail(403, 'forbidden', 'Not allowed in this realm') : { status: 200, json: { ok: true } }));
        const res = await request(app).post('/v1/realms/add_team').set(CSRF).set('Cookie', `test_sid=${sess()}`)
            .send({ scope: 'acme', slug: 'kyc', realm_ids: ['r1', 'r2'] });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('install_incomplete');
        expect(res.body.error.message).toContain('Installation was not successful on staging');
        expect(res.body.error.details.installed).toEqual([{ realm_id: 'r1', realm_slug: 'prod' }]);
    });

    it('realm_ids needs a signed-in user; a bare token is 401', async () => {
        core('operator');
        const res = await request(app).post('/v1/realms/add_team').set(CSRF).set('Authorization', 'Bearer pat-cli')
            .send({ scope: 'acme', slug: 'kyc', realm_ids: ['r1'] });
        expect(res.status).toBe(401);
    });
});
