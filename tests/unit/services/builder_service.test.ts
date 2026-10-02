import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuilderService } from '../../../src/services/builder_service.js';

describe('BuilderService', () => {
    const mock_repo = {
        build: vi.fn(),
    };

    let service: BuilderService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new BuilderService(mock_repo as any);
    });

    describe('build', () => {
        it('maps generate job handle without leaking usage', async () => {
            mock_repo.build.mockResolvedValue({ job_id: 'job-abc', status: 'pending', stage: 'queued', usage: { tokens: 1 } });

            const data = await service.build({ action: 'generate', intent: 'Build a team' }, 'jwt');

            expect(mock_repo.build).toHaveBeenCalledWith({ action: 'generate', intent: 'Build a team' }, 'jwt');
            expect(data).toEqual({ job_id: 'job-abc', status: 'pending', stage: 'queued' });
        });

        it('passes an undefined token through for anonymous callers', async () => {
            mock_repo.build.mockResolvedValue({ job_id: 'job-abc', status: 'pending', stage: 'queued' });

            await service.build({ action: 'generate', intent: 'Build a team' });

            expect(mock_repo.build).toHaveBeenCalledWith({ action: 'generate', intent: 'Build a team' }, undefined);
        });

        it('maps status terminal team + validation and strips usage', async () => {
            mock_repo.build.mockResolvedValue({
                job_id: 'job-abc', status: 'complete', stage: 'done',
                team: { name: 'my-team' }, validation: { valid: true }, usage: { tokens: 500 },
            });

            const data = await service.build({ action: 'status', job_id: 'job-abc' }, 'jwt');

            expect(mock_repo.build).toHaveBeenCalledWith({ action: 'status', job_id: 'job-abc' }, 'jwt');
            expect(data).toEqual({
                job_id: 'job-abc', status: 'complete', stage: 'done',
                team: { name: 'my-team' }, validation: { valid: true },
            });
        });

        it('maps status error and omits absent team / validation', async () => {
            mock_repo.build.mockResolvedValue({
                job_id: 'job-abc', status: 'failed', stage: 'generate',
                error: { code: 'llm', message: 'boom' },
            });

            const data = await service.build({ action: 'status', job_id: 'job-abc' }, 'jwt');

            expect(data).toEqual({ job_id: 'job-abc', status: 'failed', stage: 'generate', error: { code: 'llm', message: 'boom' } });
            expect(data).not.toHaveProperty('team');
            expect(data).not.toHaveProperty('validation');
        });

        it('maps improve_role', async () => {
            mock_repo.build.mockResolvedValue({
                name: 'dev', original_content: '# Dev', improved_content: '# Better Dev', changes_summary: 'Improved',
            });

            const data = await service.build({
                action: 'improve_role', role_name: 'dev', role_content: '# Dev',
                team_name: 'test', team_description: 'desc', phases: ['dev'],
            }, 'jwt');

            expect(data).toEqual({ name: 'dev', original_content: '# Dev', improved_content: '# Better Dev', changes_summary: 'Improved' });
        });

        it('maps validate', async () => {
            mock_repo.build.mockResolvedValue({ valid: false, errors: ['No root phase'], warnings: [] });

            const data = await service.build({ action: 'validate', team: { name: 'test' } }, 'jwt');

            expect(data).toEqual({ valid: false, errors: ['No root phase'], warnings: [] });
        });

        it('maps chat and strips usage', async () => {
            mock_repo.build.mockResolvedValue({ reply: 'Done.', actions: [{ type: 'ADD_PHASE' }], usage: { tokens: 200 } });

            const data = await service.build({ action: 'chat', team: { name: 'test' }, message: 'Add a phase' }, 'jwt');

            expect(data).toEqual({ reply: 'Done.', actions: [{ type: 'ADD_PHASE' }] });
        });

        it('maps suggest', async () => {
            mock_repo.build.mockResolvedValue({ suggestions: [{ type: 'workflow_improvement', title: 'Add gate' }] });

            const data = await service.build({ action: 'suggest', team_name: 'my-team' }, 'jwt');

            expect(data).toEqual({ suggestions: [{ type: 'workflow_improvement', title: 'Add gate' }] });
        });

        it('defaults missing suggestions to []', async () => {
            mock_repo.build.mockResolvedValue({});

            const data = await service.build({ action: 'suggest', team_name: 'my-team' }, 'jwt');

            expect(data).toEqual({ suggestions: [] });
        });
    });
});
