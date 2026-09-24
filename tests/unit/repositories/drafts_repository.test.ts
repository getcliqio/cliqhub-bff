import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftsRepository } from '../../../src/repositories/drafts_repository.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

describe('DraftsRepository (maps onto /v1/teams/*)', () => {
    let repo: DraftsRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new DraftsRepository(mock_client as any);
    });

    describe('get', () => {
        it('calls POST /v1/teams/get with mine+status=draft', async () => {
            mock_client.post.mockResolvedValue({ teams: [] });

            await repo.get('jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get', { mine: true, status: 'draft' }, 'jwt-abc',
            );
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/teams/get_by_id with team_id', async () => {
            mock_client.post.mockResolvedValue({
                id: 'uuid-1', name: 'Draft', author_id: 'u1', team_json: '{}',
                created_at: '2025-01-01', updated_at: '2025-01-02',
            });

            const result = await repo.get_by_id({ id: 'uuid-1' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get_by_id', { team_id: 'uuid-1' }, 'jwt-abc',
            );
            expect(result.id).toBe('uuid-1');
            expect(result.title).toBe('Draft');
        });
    });

    describe('new_draft', () => {
        it('calls POST /v1/teams/create', async () => {
            mock_client.post.mockResolvedValue({ id: 'uuid-42' });

            const result = await repo.new_draft(
                { team_json: '{"name":"My Team"}', title: 'Test' },
                'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/create',
                {
                    name: 'my-team',
                    scope: 'default',
                    description: 'Test',
                    team_json: '{"name":"My Team"}',
                },
                'jwt-abc',
            );
            expect(result.id).toBe('uuid-42');
        });
    });

    describe('update', () => {
        it('calls POST /v1/teams/update with team_id', async () => {
            mock_client.post.mockResolvedValue({ id: 'uuid-5' });

            const result = await repo.update(
                { id: 'uuid-5', team_json: '{}', title: 'Updated' },
                'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/update',
                {
                    team_id: 'uuid-5',
                    description: 'Updated',
                    team_json: '{}',
                },
                'jwt-abc',
            );
            expect(result.id).toBe('uuid-5');
        });
    });

    describe('delete_draft', () => {
        it('calls POST /v1/teams/delete with team_id', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_draft({ id: 'uuid-3' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/delete', { team_id: 'uuid-3' }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });
});
