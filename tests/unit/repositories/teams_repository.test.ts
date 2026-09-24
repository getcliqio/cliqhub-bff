import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsRepository } from '../../../src/repositories/teams_repository.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

describe('TeamsRepository', () => {
    let repo: TeamsRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new TeamsRepository(mock_client as any);
    });

    describe('get', () => {
        it('calls POST /v1/teams/get with params and optional token', async () => {
            mock_client.post.mockResolvedValue({ teams: [], total: 0, limit: 50, offset: 0 });

            const result = await repo.get({ tag: 'ai', limit: 10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get', { tag: 'ai', limit: 10 }, 'jwt-abc',
            );
            expect(result.total).toBe(0);
        });

        it('works without token', async () => {
            mock_client.post.mockResolvedValue({ teams: [], total: 0, limit: 50, offset: 0 });

            await repo.get({});

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get', {}, undefined,
            );
        });

        it('forwards realm_id for realm roster', async () => {
            mock_client.post.mockResolvedValue({ rows: [], total: 0 });

            await repo.get({ realm_id: 'realm-1', limit: 50 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get', { realm_id: 'realm-1', limit: 50 }, 'jwt-abc',
            );
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/teams/get_by_id with name and scope', async () => {
            mock_client.post.mockResolvedValue({ name: 'tdd-git', scope: 'cliq' });

            const result = await repo.get_by_id({ name: 'tdd-git', scope: 'cliq' });

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get_by_id', { name: 'tdd-git', scope: 'cliq' }, undefined,
            );
            expect(result.name).toBe('tdd-git');
        });
    });

    describe('download', () => {
        it('calls POST /v1/teams/download with token', async () => {
            mock_client.post.mockResolvedValue({ filename: 'tdd-1.0.0.zip', data_base64: 'abc' });

            const result = await repo.download({ name: 'tdd-git', scope: 'cliq' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/download', { name: 'tdd-git', scope: 'cliq' }, 'jwt-abc',
            );
            expect(result.filename).toBe('tdd-1.0.0.zip');
        });
    });

    describe('publish', () => {
        it('calls POST /v1/teams/publish with params and token', async () => {
            mock_client.post.mockResolvedValue({ name: 'my-team', scope: 'alice', version: '1.0.0' });

            const result = await repo.publish({ name: 'my-team', data_base64: 'abc', version: '1.0.0' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/publish',
                { name: 'my-team', data_base64: 'abc', version: '1.0.0' },
                'jwt-abc',
            );
            expect(result.version).toBe('1.0.0');
        });
    });

    describe('delete_team', () => {
        it('calls POST /v1/teams/delete with token', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_team({ name: 'tdd-git', scope: 'cliq' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/delete', { name: 'tdd-git', scope: 'cliq' }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });

    describe('rename', () => {
        it('calls POST /v1/teams/rename with token', async () => {
            mock_client.post.mockResolvedValue({ name: 'new-name', scope: 'alice' });

            const result = await repo.rename({ name: 'old-name', scope: 'alice', new_name: 'new-name' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/rename',
                { name: 'old-name', scope: 'alice', new_name: 'new-name' },
                'jwt-abc',
            );
            expect(result.name).toBe('new-name');
        });
    });

    describe('unpublish', () => {
        it('calls POST /v1/teams/unpublish with token', async () => {
            mock_client.post.mockResolvedValue({ status: 'draft', listed: false });

            const result = await repo.unpublish({ name: 'tdd-git', scope: 'cliq' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/unpublish', { name: 'tdd-git', scope: 'cliq' }, 'jwt-abc',
            );
            expect(result.listed).toBe(false);
        });
    });

    describe('create', () => {
        it('calls POST /v1/teams/create with token', async () => {
            mock_client.post.mockResolvedValue({ id: 'uuid', status: 'draft' });

            const result = await repo.create({ name: 't', scope: 'cliq' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/create', { name: 't', scope: 'cliq' }, 'jwt-abc',
            );
            expect(result.status).toBe('draft');
        });
    });


    describe('get_versions', () => {
        it('calls POST /v1/teams/get_versions with latest_only', async () => {
            mock_client.post.mockResolvedValue({ name: 'tdd-git', scope: null, version: '1.0.0' });

            const result = await repo.get_versions({ name: 'tdd-git' });

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get_versions', { name: 'tdd-git' },
            );
            expect(result.version).toBe('1.0.0');
        });
    });

});
