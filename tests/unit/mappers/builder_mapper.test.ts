import { describe, it, expect } from 'vitest';
import {
    to_builder_generate_data, to_builder_status_data, to_builder_improve_role_data,
    to_builder_suggest_data, to_builder_validate_data, to_builder_chat_data,
} from '../../../src/mappers/builder_mapper.js';

describe('to_builder_generate_data', () => {
    it('maps the async job handle (job_id/status/stage)', () => {
        const data = to_builder_generate_data({ job_id: 'job-1', status: 'pending', stage: 'queued', usage: { tokens: 1 } } as never);
        expect(data).toEqual({ job_id: 'job-1', status: 'pending', stage: 'queued' });
    });
});

describe('to_builder_status_data', () => {
    it('maps team + validation and strips usage', () => {
        const data = to_builder_status_data({
            job_id: 'job-1', status: 'complete', stage: 'done',
            team: { name: 'test' }, validation: { valid: true, errors: [], warnings: [] },
            usage: { tokens: 100 },
        } as never);
        expect(data.team).toEqual({ name: 'test' });
        expect(data.validation).toEqual({ valid: true, errors: [], warnings: [] });
        expect(data).not.toHaveProperty('usage');
    });

    it('omits team / validation / error while the job runs', () => {
        const data = to_builder_status_data({ job_id: 'job-1', status: 'running', stage: 'roles' });
        expect(data).toEqual({ job_id: 'job-1', status: 'running', stage: 'roles' });
    });

    it('maps a failed job error', () => {
        const data = to_builder_status_data({ job_id: 'job-1', status: 'failed', stage: 'x', error: { code: 'llm', message: 'boom' } });
        expect(data.error).toEqual({ code: 'llm', message: 'boom' });
    });
});

describe('to_builder_improve_role_data', () => {
    it('maps all four fields', () => {
        const vo = { name: 'dev', original_content: '# Dev', improved_content: '# Better Dev', changes_summary: 'Improved' };
        expect(to_builder_improve_role_data(vo)).toEqual(vo);
    });
});

describe('to_builder_suggest_data', () => {
    it('maps suggestions', () => {
        expect(to_builder_suggest_data({ suggestions: [{ title: 'Add gate' }] })).toEqual({ suggestions: [{ title: 'Add gate' }] });
    });

    it('defaults missing suggestions to []', () => {
        expect(to_builder_suggest_data({} as never)).toEqual({ suggestions: [] });
    });
});

describe('to_builder_validate_data', () => {
    it('maps valid, errors, warnings', () => {
        expect(to_builder_validate_data({ valid: false, errors: ['No root phase'], warnings: ['Unused role'] }))
            .toEqual({ valid: false, errors: ['No root phase'], warnings: ['Unused role'] });
    });
});

describe('to_builder_chat_data', () => {
    it('maps reply and actions, strips usage', () => {
        const data = to_builder_chat_data({ reply: 'Done.', actions: [{ type: 'ADD_PHASE' }], usage: { tokens: 200 } } as never);
        expect(data).toEqual({ reply: 'Done.', actions: [{ type: 'ADD_PHASE' }] });
    });
});
