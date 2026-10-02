import { describe, it, expect } from 'vitest';
import { to_run_detail_phase_data, to_run_detail_review_data } from '../../../src/mappers/run_detail_mapper.js';

describe('run detail mapper', () => {
    it('phase: numbers kept when finite, optional fields default to null', () => {
        expect(to_run_detail_phase_data({ phase: 'build', status: 'done', sequence: 1, started_at: 10, completed_at: 20, error: 'e', agent: 'a' } as any))
            .toEqual({ phase: 'build', status: 'done', sequence: 1, started_at: 10, completed_at: 20, error: 'e', agent: 'a' });
        expect(to_run_detail_phase_data({ phase: 'qa', status: 'pending', sequence: '2', started_at: null } as any))
            .toEqual({ phase: 'qa', status: 'pending', sequence: null, started_at: null, completed_at: null, error: null, agent: null });
    });

    it('review: id from review_id, default title, null optionals', () => {
        expect(to_run_detail_review_data({ review_id: 'rv', title: 'Check', phase: 'qa', requested_at: 5, message: 'm' } as any))
            .toEqual({ id: 'rv', title: 'Check', phase: 'qa', requested_at: 5, message: 'm' });
        expect(to_run_detail_review_data({ review_id: 'rv' } as any))
            .toEqual({ id: 'rv', title: 'Review requested', phase: null, requested_at: null, message: null });
    });
});
