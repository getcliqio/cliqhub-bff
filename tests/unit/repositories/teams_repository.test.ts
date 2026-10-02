import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsRepository } from '../../../src/repositories/teams_repository.js';
import { ApiError } from '../../../src/errors/api_error.js';

const TEAM_UUID = '00000000-0000-4000-8000-000000000001';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
    post_body: vi.fn(),
};

describe('TeamsRepository', () => {
    let repo: TeamsRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new TeamsRepository(mock_client as any);
    });

    describe('get', () => {
        it('calls POST /v1/teams/get with params and token, returns Core PagedData', async () => {
            mock_client.post.mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0 });

            const result = await repo.get({ tag: 'ai', limit: 10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get', { tag: 'ai', limit: 10 }, 'jwt-abc');
            expect(result).toEqual({ items: [], total: 0, limit: 10, offset: 0 });
        });

        it('works without token', async () => {
            mock_client.post.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

            await repo.get({});

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get', {}, undefined);
        });

        it('forwards realm_id for realm roster', async () => {
            mock_client.post.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

            await repo.get({ realm_id: 'realm-1', limit: 50 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get', { realm_id: 'realm-1', limit: 50 }, 'jwt-abc');
        });

        it('forwards daemon_id for live inventory', async () => {
            mock_client.post.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

            await repo.get({ daemon_id: 'edge-1' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get', { daemon_id: 'edge-1' }, 'jwt-abc');
        });

        it('propagates ApiError from Core', async () => {
            mock_client.post.mockRejectedValue(ApiError.forbidden('nope'));
            await expect(repo.get({}, 'jwt')).rejects.toThrow(ApiError);
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/teams/get_by_id with name and scope', async () => {
            mock_client.post.mockResolvedValue({ name: 'tdd-git', scope: 'cliq' });

            const result = await repo.get_by_id({ name: 'tdd-git', scope: 'cliq' });

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get_by_id', { name: 'tdd-git', scope: 'cliq' }, undefined);
            expect(result.name).toBe('tdd-git');
        });
    });

    describe('get_versions', () => {
        it('calls POST /v1/teams/get_versions with latest_only', async () => {
            mock_client.post.mockResolvedValue({ name: 'tdd-git', scope: null, version: '1.0.0' });

            const result = await repo.get_versions({ name: 'tdd-git', latest_only: true });

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get_versions', { name: 'tdd-git', latest_only: true }, undefined);
            expect(result.version).toBe('1.0.0');
        });
    });

    describe('get_phases', () => {
        it('calls POST /v1/teams/get_phases', async () => {
            mock_client.post.mockResolvedValue({ team_id: TEAM_UUID, version_id: null, version: null, phases: [] });

            await repo.get_phases({ team_id: TEAM_UUID }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/get_phases', { team_id: TEAM_UUID }, 'jwt-abc');
        });
    });

    describe('download', () => {
        it('calls POST /v1/teams/download with token', async () => {
            mock_client.post.mockResolvedValue({ filename: 'tdd-1.0.0.zip', data_base64: 'abc', version: '1.0.0' });

            const result = await repo.download({ name: 'tdd-git', scope: 'cliq' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/teams/download', { name: 'tdd-git', scope: 'cliq' }, 'jwt-abc');
            expect(result.filename).toBe('tdd-1.0.0.zip');
        });
    });

    describe('writes', () => {
        it.each([
            ['create', '/v1/teams/create', { name: 't', scope: 'cliq' }],
            ['update', '/v1/teams/update', { team_id: TEAM_UUID, description: 'x' }],
            ['publish', '/v1/teams/publish', { name: 'my-team', data_base64: 'abc', version: '1.0.0' }],
            ['unpublish', '/v1/teams/unpublish', { name: 'tdd-git', scope: 'cliq' }],
            ['delete', '/v1/teams/delete', { name: 'tdd-git', scope: 'cliq' }],
            ['rename', '/v1/teams/rename', { name: 'old-name', scope: 'alice', new_name: 'new-name' }],
        ] as const)('%s calls POST %s with body and token', async (method, path, input) => {
            const vo = { id: TEAM_UUID, name: 'x', scope: 'alice', status: 'draft', version: null };
            mock_client.post.mockResolvedValue(vo);

            const result = await (repo as any)[method](input, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(path, input, 'jwt-abc');
            expect(result).toBe(vo);
        });
    });
});
