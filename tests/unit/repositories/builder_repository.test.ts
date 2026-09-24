import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuilderRepository } from '../../../src/repositories/builder_repository.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

describe('BuilderRepository', () => {
    let repo: BuilderRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new BuilderRepository(mock_client as any);
    });

    describe('build', () => {
        it('calls POST /v1/teams/build with generate params and optional token', async () => {
            mock_client.post.mockResolvedValue({ job_id: 'j1', status: 'queued', stage: 'queued' });

            await repo.build({ action: 'generate', intent: 'Build a team' }, 'jwt-tok');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', { action: 'generate', intent: 'Build a team' }, 'jwt-tok',
            );
        });

        it('calls without token when anonymous', async () => {
            mock_client.post.mockResolvedValue({ job_id: 'j1', status: 'queued', stage: 'queued' });

            await repo.build({ action: 'generate', intent: 'Build a team' });

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', { action: 'generate', intent: 'Build a team' }, undefined,
            );
        });

        it('posts improve_role action', async () => {
            const params = {
                action: 'improve_role' as const,
                role_name: 'dev',
                role_content: '# Dev',
                team_name: 'my-team',
                team_description: 'A team',
                phases: ['dev', 'test'],
            };
            mock_client.post.mockResolvedValue({
                name: 'dev', original_content: '# Dev',
                improved_content: '# Improved Dev', changes_summary: 'Better',
            });

            const result = await repo.build(params, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', params, 'jwt-abc',
            );
            expect((result as any).improved_content).toBe('# Improved Dev');
        });

        it('posts validate action', async () => {
            mock_client.post.mockResolvedValue({ valid: true, errors: [], warnings: [] });

            const result = await repo.build({ action: 'validate', team: { name: 'test' } }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', { action: 'validate', team: { name: 'test' } }, 'jwt-abc',
            );
            expect((result as any).valid).toBe(true);
        });

        it('posts chat action with team, message, and history', async () => {
            const params = {
                action: 'chat' as const,
                team: { name: 'test' },
                message: 'Add a gate phase',
                history: [{ role: 'user' as const, content: 'hello' }],
            };
            mock_client.post.mockResolvedValue({
                reply: 'Done.', actions: [],
            });

            const result = await repo.build(params, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', params, 'jwt-abc',
            );
            expect((result as any).reply).toBe('Done.');
        });

        it('posts status action with job_id', async () => {
            mock_client.post.mockResolvedValue({ job_id: 'j1', status: 'done', stage: 'done' });

            await repo.build({ action: 'status', job_id: 'j1' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/build', { action: 'status', job_id: 'j1' }, 'jwt-abc',
            );
        });
    });
});
