import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { hub_legacy_uuid } from '../helpers/hub_legacy_uuid.js';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

/**
 * Drafts are no longer a separate /v1/drafts/* plane.
 * Draft lifecycle is teams create / update / get(status=draft) / delete.
 */
describe('Teams draft surface (replaces /v1/drafts/*)', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => {
            return session_store._sessions.get(sid) ?? null;
        });
        session_store.create.mockImplementation(async (record: any) => {
            const sid = `mock-sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, { session_id: sid, ...record });
            return sid;
        });
        session_store.destroy.mockImplementation(async (sid: string) => {
            session_store._sessions.delete(sid);
        });
        session_store.touch.mockResolvedValue(undefined);
    });

    function make_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `draft-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: hub_legacy_uuid(1), username: 'alice', email: 'a@test.com', role: 'user',
            token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/teams/get (status=draft)', () => {
        it('returns 200 with draft teams (auth optional for catalog get)', async () => {
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [{ id: hub_legacy_uuid(1), name: 'draft-1', scope: 'alice', status: 'draft' }],
                total: 1, limit: 50, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({ status: 'draft', mine: true });
            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
        });

        it('returns 200 with draft teams', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                teams: [{ id: hub_legacy_uuid(1), name: 'draft-1', scope: 'alice', status: 'draft' }],
                total: 1, limit: 50, offset: 0,
            });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ status: 'draft', mine: true });

            expect(res.status).toBe(200);
            expect(res.body.data.teams).toHaveLength(1);
        });
    });

    describe('POST /v1/teams/create', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/create')
                .set(CSRF)
                .send({ name: 'draft-team', scope: 'alice' });
            expect(res.status).toBe(401);
        });

        it('returns 200 on create', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                id: hub_legacy_uuid(1), name: 'draft-team', scope: 'alice', status: 'draft',
            });

            const res = await request(app)
                .post('/v1/teams/create')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'draft-team', scope: 'alice', team_json: '{"phases":[]}' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('draft');
        });

        it('returns 422 when name missing', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/teams/create')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ scope: 'alice' });
            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/teams/update', () => {
        it('returns 422 without name or team_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/teams/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ description: 'x' });
            expect(res.status).toBe(422);
        });

        it('returns 200 on update', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({
                id: hub_legacy_uuid(1), name: 'draft-team', status: 'draft', version: '0.1.1',
            });

            const res = await request(app)
                .post('/v1/teams/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'draft-team', scope: 'alice', description: 'updated' });

            expect(res.status).toBe(200);
        });
    });

    describe('POST /v1/teams/delete', () => {
        it('returns 200 on delete', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post').mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/teams/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ team_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });
    });
});
