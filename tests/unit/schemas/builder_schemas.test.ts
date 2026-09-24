import { describe, it, expect } from 'vitest';
import { teams_build_schema } from '../../../src/schemas/builder_schemas.js';

describe('teams_build_schema', () => {
    it('accepts generate with valid intent', () => {
        expect(teams_build_schema.safeParse({ action: 'generate', intent: 'Build a TDD team' }).success).toBe(true);
    });

    it('rejects generate with empty intent', () => {
        expect(teams_build_schema.safeParse({ action: 'generate', intent: '' }).success).toBe(false);
    });

    it('rejects generate with missing intent', () => {
        expect(teams_build_schema.safeParse({ action: 'generate' }).success).toBe(false);
    });

    it('rejects generate with intent over 5000 chars', () => {
        expect(teams_build_schema.safeParse({ action: 'generate', intent: 'a'.repeat(5001) }).success).toBe(false);
    });

    it('rejects missing action', () => {
        expect(teams_build_schema.safeParse({ intent: 'Build a team' }).success).toBe(false);
    });

    it('accepts status with job_id', () => {
        expect(teams_build_schema.safeParse({ action: 'status', job_id: 'job-1' }).success).toBe(true);
    });

    it('rejects status without job_id', () => {
        expect(teams_build_schema.safeParse({ action: 'status' }).success).toBe(false);
    });

    describe('improve_role', () => {
        const valid = {
            action: 'improve_role' as const,
            role_name: 'dev', role_content: '# Dev Role',
            team_name: 'my-team', team_description: 'A team', phases: ['dev', 'test'],
        };

        it('accepts valid params', () => {
            expect(teams_build_schema.safeParse(valid).success).toBe(true);
        });

        it('accepts optional instruction', () => {
            expect(teams_build_schema.safeParse({ ...valid, instruction: 'Focus on testing' }).success).toBe(true);
        });

        it('rejects missing role_name', () => {
            expect(teams_build_schema.safeParse({ ...valid, role_name: '' }).success).toBe(false);
        });

        it('rejects missing role_content', () => {
            expect(teams_build_schema.safeParse({ ...valid, role_content: '' }).success).toBe(false);
        });

        it('rejects role_content over 50000 chars', () => {
            expect(teams_build_schema.safeParse({ ...valid, role_content: 'x'.repeat(50001) }).success).toBe(false);
        });
    });

    describe('validate', () => {
        it('accepts valid team object', () => {
            expect(teams_build_schema.safeParse({ action: 'validate', team: { name: 'test' } }).success).toBe(true);
        });

        it('rejects null team', () => {
            expect(teams_build_schema.safeParse({ action: 'validate', team: null }).success).toBe(false);
        });

        it('rejects missing team', () => {
            expect(teams_build_schema.safeParse({ action: 'validate' }).success).toBe(false);
        });
    });

    describe('chat', () => {
        const valid = {
            action: 'chat' as const,
            message: 'Add a gate phase',
            team: { name: 'test' },
        };

        it('accepts valid params', () => {
            expect(teams_build_schema.safeParse(valid).success).toBe(true);
        });

        it('accepts with history', () => {
            const r = teams_build_schema.safeParse({
                ...valid,
                history: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }],
            });
            expect(r.success).toBe(true);
        });

        it('rejects empty message', () => {
            expect(teams_build_schema.safeParse({ ...valid, message: '' }).success).toBe(false);
        });

        it('rejects message over 5000 chars', () => {
            expect(teams_build_schema.safeParse({ ...valid, message: 'a'.repeat(5001) }).success).toBe(false);
        });

        it('rejects null team', () => {
            expect(teams_build_schema.safeParse({ ...valid, team: null }).success).toBe(false);
        });

        it('rejects invalid history role', () => {
            const r = teams_build_schema.safeParse({
                ...valid,
                history: [{ role: 'system', content: 'bad' }],
            });
            expect(r.success).toBe(false);
        });
    });

    describe('suggest', () => {
        it('accepts team_name', () => {
            expect(teams_build_schema.safeParse({ action: 'suggest', team_name: 'my-team' }).success).toBe(true);
        });

        it('rejects missing team_name', () => {
            expect(teams_build_schema.safeParse({ action: 'suggest' }).success).toBe(false);
        });
    });
});
