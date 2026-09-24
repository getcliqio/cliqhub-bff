import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Builder integration', () => {
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
        const sid = `builder-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: 1, username: 'alice', email: 'a@test.com', role: 'user',
            token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/teams/build', () => {
        it('returns 200 without session (public)', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    job_id: 'job-public-1',
                    status: 'pending',
                    stage: 'queued',
                });

            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'generate', intent: 'Build a TDD team' });

            expect(res.status).toBe(200);
            expect(res.body.data.job_id).toBe('job-public-1');
            expect(res.body.data.status).toBe('pending');
            expect(res.body.data).not.toHaveProperty('usage');
        });

        it('returns 200 with session token passed to backend', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    job_id: 'job-auth-1',
                    status: 'pending',
                    stage: 'queued',
                });

            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ action: 'generate', intent: 'Build a CI team' });

            expect(res.status).toBe(200);
            expect(res.body.data.job_id).toBe('job-auth-1');
        });

        it('returns 422 on empty intent', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'generate', intent: '' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on missing intent', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'generate' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on missing action', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ intent: 'Build a team' });

            expect(res.status).toBe(422);
        });

        it('improve_role returns 200 with improved content', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    name: 'dev', original_content: '# Dev',
                    improved_content: '# Better Dev', changes_summary: 'Better',
                });

            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({
                    action: 'improve_role',
                    role_name: 'dev', role_content: '# Dev Role',
                    team_name: 'my-team', team_description: 'A team',
                    phases: ['dev', 'test'],
                });

            expect(res.status).toBe(200);
            expect(res.body.data.improved_content).toBe('# Better Dev');
        });

        it('improve_role returns 422 on missing role_name', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({
                    action: 'improve_role',
                    role_content: '# Dev', team_name: 'test',
                    team_description: 'desc', phases: [],
                });

            expect(res.status).toBe(422);
        });

        it('validate returns 200 with validation result', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    valid: true, errors: [], warnings: [],
                });

            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'validate', team: { name: 'test', phases: [] } });

            expect(res.status).toBe(200);
            expect(res.body.data.valid).toBe(true);
        });

        it('validate returns 422 when team is null', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'validate', team: null });

            expect(res.status).toBe(422);
        });

        it('chat returns 200 with reply and actions', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    reply: 'Added a gate phase.',
                    actions: [{ type: 'ADD_PHASE', phase: { name: 'gate' } }],
                    usage: { tokens: 300 },
                });

            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({
                    action: 'chat',
                    team: { name: 'test' },
                    message: 'Add a gate phase',
                });

            expect(res.status).toBe(200);
            expect(res.body.data.reply).toBe('Added a gate phase.');
            expect(res.body.data.actions).toHaveLength(1);
            expect(res.body.data).not.toHaveProperty('usage');
        });

        it('chat returns 422 on empty message', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'chat', team: { name: 'test' }, message: '' });

            expect(res.status).toBe(422);
        });

        it('chat returns 422 on null team', async () => {
            const res = await request(app)
                .post('/v1/teams/build')
                .set(CSRF)
                .send({ action: 'chat', team: null, message: 'hello' });

            expect(res.status).toBe(422);
        });
    });
});
