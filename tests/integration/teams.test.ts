import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { ApiError } from '../../src/repositories/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

const MOCK_TEAM_LIST = {
    teams: [
        { name: 'tdd-git', scope: 'cliq', description: 'TDD', author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd'] },
    ],
    total: 1,
    limit: 50,
    offset: 0,
};

const MOCK_TEAM_DETAIL = {
    name: 'tdd-git', scope: 'cliq', description: 'TDD',
    author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd'],
    license: 'MIT', visibility: 'public',
    created_at: '2025-01-01', updated_at: '2025-02-01',
    versions: [{ version: '1.0.0', changelog: 'Initial', published_at: '2025-01-01' }],
    roles: [], workflow: { phases: [] }, agents: {},
    readme: '# TDD', cliq_version: null, tools: [],
};

describe('Teams integration', () => {
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

    describe('POST /v1/teams/get', () => {
        it('returns 200 with team list (public, no auth)', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce(MOCK_TEAM_LIST);

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.teams).toHaveLength(1);
            expect(res.body.data.teams[0].name).toBe('tdd-git');
            expect(res.body.data.total).toBe(1);
        });

        it('passes tag param through', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ teams: [], total: 0, limit: 50, offset: 0 });

            const res = await request(app)
                .post('/v1/teams/get')
                .set(CSRF)
                .send({ tag: 'owasp' });

            expect(res.status).toBe(200);
            const call = vi.mocked(ApiClient.prototype.post).mock.calls[0];
            expect(call[1]).toEqual({ tag: 'owasp' });
        });
    });

    describe('POST /v1/teams/get_by_id', () => {
        it('returns 200 with team detail', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce(MOCK_TEAM_DETAIL);

            const res = await request(app)
                .post('/v1/teams/get_by_id')
                .set(CSRF)
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('tdd-git');
            expect(res.body.data.versions).toHaveLength(1);
        });

        it('returns 422 on missing name', async () => {
            const res = await request(app)
                .post('/v1/teams/get_by_id')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(422);
            expect(res.body.error.code).toBe('invalid_params');
        });

        it('returns 404 when backend says not_found', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(new ApiError('not_found', 'Team not found', 404));

            const res = await request(app)
                .post('/v1/teams/get_by_id')
                .set(CSRF)
                .send({ name: 'nonexistent' });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/teams/download', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/download')
                .set(CSRF)
                .send({ name: 'tdd-git' });

            expect(res.status).toBe(401);
        });

        it('returns download data for authenticated user', async () => {
            const now = Math.floor(Date.now() / 1000);
            session_store._sessions.set('dl-sid', {
                session_id: 'dl-sid',
                user_id: 1, username: 'alice', email: 'a@test.com', role: 'user',
                token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
                created_at: now, last_active: now, expires_at: now + 3600,
            });

            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ filename: 'tdd-git-1.0.0.zip', data_base64: 'ZIPDATA' });

            const res = await request(app)
                .post('/v1/teams/download')
                .set(CSRF)
                .set('Cookie', 'test_sid=dl-sid')
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.filename).toBe('tdd-git-1.0.0.zip');
            expect(res.body.data.data_base64).toBe('ZIPDATA');
        });

        it('returns download data for CLI/daemon Bearer PAT (no cookie)', async () => {
            const user_uuid = '11111111-1111-4111-8111-111111111111';
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ valid: true, user_id: user_uuid })
                .mockResolvedValueOnce({
                    id: user_uuid,
                    username: 'alice',
                    display_name: 'Alice',
                    email: 'a@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                })
                .mockResolvedValueOnce({ scopes: [] })
                .mockResolvedValueOnce({ filename: 'tdd-git-1.0.0.zip', data_base64: 'ZIPDATA' });

            const res = await request(app)
                .post('/v1/teams/download')
                .set(CSRF)
                .set('Authorization', 'Bearer cliq_tok_from_cli')
                .set('X-Client', 'cli')
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.filename).toBe('tdd-git-1.0.0.zip');
            expect(res.body.data.data_base64).toBe('ZIPDATA');
        });

        it('returns 422 on missing name', async () => {
            const now = Math.floor(Date.now() / 1000);
            session_store._sessions.set('dl-val-sid', {
                session_id: 'dl-val-sid',
                user_id: 1, username: 'alice', email: 'a@test.com', role: 'user',
                token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
                created_at: now, last_active: now, expires_at: now + 3600,
            });

            const res = await request(app)
                .post('/v1/teams/download')
                .set(CSRF)
                .set('Cookie', 'test_sid=dl-val-sid')
                .send({});

            expect(res.status).toBe(422);
        });
    });

    function make_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `s5-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: 1, username: 'alice', email: 'a@test.com', role: 'user',
            token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/teams/publish', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/publish')
                .set(CSRF)
                .send({ name: 'my-team', data_base64: 'abc', version: '1.0.0' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ name: 'my-team', scope: 'alice', version: '1.0.0' });

            const res = await request(app)
                .post('/v1/teams/publish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'my-team', data_base64: 'abc123', version: '1.0.0' });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.version).toBe('1.0.0');
        });

        it('returns 422 on invalid name', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/teams/publish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'INVALID', data_base64: 'abc' });

            expect(res.status).toBe(422);
        });

        it('returns 403 when backend rejects non-owner', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(new ApiError('forbidden', 'Not the author', 403));

            const res = await request(app)
                .post('/v1/teams/publish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'other-team', data_base64: 'abc', version: '2.0.0' });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /v1/teams/delete', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/delete')
                .set(CSRF)
                .send({ name: 'tdd-git' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/teams/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns 403 when backend rejects non-owner', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(new ApiError('forbidden', 'Not the author', 403));

            const res = await request(app)
                .post('/v1/teams/delete')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'other-team' });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /v1/teams/rename', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/rename')
                .set(CSRF)
                .send({ name: 'old', scope: 'alice', new_name: 'new-name' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ name: 'new-name', scope: 'alice' });

            const res = await request(app)
                .post('/v1/teams/rename')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'old-name', scope: 'alice', new_name: 'new-name' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('new-name');
        });

        it('returns 422 on invalid slug for new_name', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/teams/rename')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'old', scope: 'alice', new_name: 'INVALID' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/teams/unpublish', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .send({ name: 'tdd-git' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ status: 'draft', listed: false });

            const res = await request(app)
                .post('/v1/teams/unpublish')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.listed).toBe(false);
        });
    });


    describe('POST /v1/teams/get_versions', () => {
        it('returns 200 with versions (public, no auth)', async () => {
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' });

            const res = await request(app)
                .post('/v1/teams/get_versions')
                .set(CSRF)
                .send({ name: 'tdd-git', scope: 'cliq' });

            expect(res.status).toBe(200);
            expect(res.body.data.version).toBe('1.0.0');
        });

        it('returns 422 on missing name', async () => {
            const res = await request(app)
                .post('/v1/teams/get_versions')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/teams/create', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/teams/create')
                .set(CSRF)
                .send({ name: 'new-team', scope: 'alice' });
            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ id: 'uuid', name: 'new-team', status: 'draft' });

            const res = await request(app)
                .post('/v1/teams/create')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ name: 'new-team', scope: 'alice' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('draft');
        });
    });

});
