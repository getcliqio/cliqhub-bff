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
            mock_repo.build.mockResolvedValue({
                job_id: 'job-abc',
                status: 'pending',
                stage: 'queued',
            });

            const dto = await service.build({ action: 'generate', intent: 'Build a team' }, 'jwt');

            expect(mock_repo.build).toHaveBeenCalledWith(
                { action: 'generate', intent: 'Build a team' }, 'jwt',
            );
            expect(dto).toMatchObject({
                job_id: 'job-abc',
                status: 'pending',
                stage: 'queued',
            });
            expect(dto).not.toHaveProperty('usage');
        });

        it('maps status terminal team + validation and strips usage', async () => {
            mock_repo.build.mockResolvedValue({
                job_id: 'job-abc',
                status: 'complete',
                stage: 'done',
                team: { name: 'my-team' },
                validation: { valid: true },
                usage: { tokens: 500 },
            });

            const dto = await service.build({ action: 'status', job_id: 'job-abc' }, 'jwt');

            expect(mock_repo.build).toHaveBeenCalledWith(
                { action: 'status', job_id: 'job-abc' }, 'jwt',
            );
            expect(dto).toMatchObject({
                team: { name: 'my-team' },
                validation: { valid: true },
            });
            expect(dto).not.toHaveProperty('usage');
        });

        it('maps improve_role VO to DTO', async () => {
            mock_repo.build.mockResolvedValue({
                name: 'dev', original_content: '# Dev',
                improved_content: '# Better Dev', changes_summary: 'Improved',
            });

            const dto = await service.build({
                action: 'improve_role',
                role_name: 'dev', role_content: '# Dev',
                team_name: 'test', team_description: 'desc', phases: ['dev'],
            }, 'jwt');

            expect(dto).toMatchObject({
                improved_content: '# Better Dev',
                name: 'dev',
            });
        });

        it('maps validate VO to DTO', async () => {
            mock_repo.build.mockResolvedValue({
                valid: false, errors: ['No root phase'], warnings: [],
            });

            const dto = await service.build({ action: 'validate', team: { name: 'test' } }, 'jwt');

            expect(dto).toMatchObject({
                valid: false,
                errors: ['No root phase'],
            });
        });

        it('maps chat VO to DTO and strips usage', async () => {
            mock_repo.build.mockResolvedValue({
                reply: 'Done.', actions: [{ type: 'ADD_PHASE' }],
                usage: { tokens: 200 },
            });

            const dto = await service.build({
                action: 'chat',
                team: { name: 'test' }, message: 'Add a phase',
            }, 'jwt');

            expect(dto).toMatchObject({
                reply: 'Done.',
                actions: [{ type: 'ADD_PHASE' }],
            });
            expect(dto).not.toHaveProperty('usage');
        });

        it('returns suggest VO as-is', async () => {
            mock_repo.build.mockResolvedValue({
                suggestions: [{ type: 'workflow_improvement', title: 'Add gate' }],
            });

            const dto = await service.build({
                action: 'suggest',
                team_name: 'my-team',
            }, 'jwt');

            expect(dto).toEqual({
                suggestions: [{ type: 'workflow_improvement', title: 'Add gate' }],
            });
        });
    });
});
