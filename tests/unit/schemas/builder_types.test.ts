import { describe, it, expect } from 'vitest';
import { TeamsBuildInput } from '../../../src/schemas/builder_types.js';

describe('TeamsBuildInput', () => {
    it('accepts generate with valid intent', () => {
        expect(TeamsBuildInput.safeParse({ action: 'generate', intent: 'Build a TDD team' }).success).toBe(true);
    });

    it('rejects generate with empty intent', () => {
        expect(TeamsBuildInput.safeParse({ action: 'generate', intent: '' }).success).toBe(false);
    });

    it('rejects generate with whitespace-only intent', () => {
        expect(TeamsBuildInput.safeParse({ action: 'generate', intent: '   ' }).success).toBe(false);
    });

    it('rejects generate with missing intent', () => {
        expect(TeamsBuildInput.safeParse({ action: 'generate' }).success).toBe(false);
    });

    it('rejects generate with intent over 5000 chars', () => {
        expect(TeamsBuildInput.safeParse({ action: 'generate', intent: 'a'.repeat(5001) }).success).toBe(false);
    });

    it('rejects missing action', () => {
        expect(TeamsBuildInput.safeParse({ intent: 'Build a team' }).success).toBe(false);
    });

    it('rejects unknown action', () => {
        expect(TeamsBuildInput.safeParse({ action: 'deploy' }).success).toBe(false);
    });

    it('accepts status with job_id', () => {
        expect(TeamsBuildInput.safeParse({ action: 'status', job_id: 'job-1' }).success).toBe(true);
    });

    it('rejects status without job_id', () => {
        expect(TeamsBuildInput.safeParse({ action: 'status' }).success).toBe(false);
    });

    it('reports the missing field path', () => {
        const r = TeamsBuildInput.safeParse({ action: 'status' });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].path).toEqual(['job_id']);
    });

    describe('improve_role', () => {
        const valid = {
            action: 'improve_role' as const,
            role_name: 'dev', role_content: '# Dev Role',
            team_name: 'my-team', team_description: 'A team', phases: ['dev', 'test'],
        };

        it('accepts valid params', () => {
            expect(TeamsBuildInput.safeParse(valid).success).toBe(true);
        });

        it('accepts optional instruction', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, instruction: 'Focus on testing' }).success).toBe(true);
        });

        it('rejects missing role_name', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, role_name: '' }).success).toBe(false);
        });

        it('rejects missing role_content', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, role_content: '' }).success).toBe(false);
        });

        it('rejects role_content over 50000 chars', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, role_content: 'x'.repeat(50001) }).success).toBe(false);
        });
    });

    describe('validate', () => {
        it('accepts valid team object', () => {
            expect(TeamsBuildInput.safeParse({ action: 'validate', team: { name: 'test' } }).success).toBe(true);
        });

        it('rejects null team', () => {
            expect(TeamsBuildInput.safeParse({ action: 'validate', team: null }).success).toBe(false);
        });

        it('rejects missing team', () => {
            expect(TeamsBuildInput.safeParse({ action: 'validate' }).success).toBe(false);
        });
    });

    describe('chat', () => {
        const valid = { action: 'chat' as const, message: 'Add a gate phase', team: { name: 'test' } };

        it('accepts valid params', () => {
            expect(TeamsBuildInput.safeParse(valid).success).toBe(true);
        });

        it('accepts with history', () => {
            const r = TeamsBuildInput.safeParse({
                ...valid,
                history: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }],
            });
            expect(r.success).toBe(true);
        });

        it('rejects empty message', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, message: '' }).success).toBe(false);
        });

        it('rejects message over 5000 chars', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, message: 'a'.repeat(5001) }).success).toBe(false);
        });

        it('rejects null team', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, team: null }).success).toBe(false);
        });

        it('rejects invalid history role', () => {
            expect(TeamsBuildInput.safeParse({ ...valid, history: [{ role: 'system', content: 'bad' }] }).success).toBe(false);
        });
    });

    describe('suggest', () => {
        it('accepts team_name', () => {
            expect(TeamsBuildInput.safeParse({ action: 'suggest', team_name: 'my-team' }).success).toBe(true);
        });

        it('rejects missing team_name', () => {
            expect(TeamsBuildInput.safeParse({ action: 'suggest' }).success).toBe(false);
        });
    });
});
