import { describe, it, expect } from 'vitest';
import {
    num_or_null, to_control_realm_data, to_inbox_review_item, to_inbox_run_item,
} from '../../../src/mappers/realm_inbox_mapper.js';

describe('realm inbox mapper', () => {
    it('num_or_null keeps finite numbers only', () => {
        expect(num_or_null(3)).toBe(3);
        expect(num_or_null(0)).toBe(0);
        expect(num_or_null('3')).toBeNull();
        expect(num_or_null(Number.NaN)).toBeNull();
        expect(num_or_null(Infinity)).toBeNull();
        expect(num_or_null(undefined)).toBeNull();
    });

    it('realm: name falls back to slug, org_slug to null', () => {
        expect(to_control_realm_data({ id: 'r1', slug: 'prod', name: '' } as any))
            .toEqual({ id: 'r1', slug: 'prod', name: 'prod', org_slug: null });
        expect(to_control_realm_data({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' } as any))
            .toEqual({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' });
    });

    it('review item: title falls back to run name then a default; state defaults to pending', () => {
        expect(to_inbox_review_item({ review_id: 'rv1', run_name: 'nightly', requested_at: 9, artifact_count: 2 } as any)).toEqual({
            kind: 'review', id: 'rv1', run_id: null, title: 'nightly', team: null, phase: null,
            state: 'pending', at: 9, error: null, message: null, artifact_count: 2,
        });
        const full = to_inbox_review_item({
            review_id: 'rv2', run_id: 'run-1', title: 'Check', team: 't', phase: 'qa', status: 'approved',
            requested_at: 'x', message: 'hi',
        } as any);
        expect(full).toMatchObject({ title: 'Check', run_id: 'run-1', team: 't', phase: 'qa', state: 'approved', at: null, message: 'hi', artifact_count: null });
        expect(to_inbox_review_item({ review_id: 'rv3' } as any).title).toBe('Review requested');
    });

    it('run item: failed sorts by completed_at, others by last movement', () => {
        const run = { run_id: 'r', state: 'failed', started_at: 1, last_updated_at: 5, completed_at: 9, error: 'boom' } as any;
        expect(to_inbox_run_item(run, 'failed')).toEqual({
            kind: 'failed', id: 'r', run_id: 'r', title: 'r', team: null, phase: null,
            state: 'failed', at: 9, error: 'boom', message: null, artifact_count: null,
        });
        expect(to_inbox_run_item(run, 'run').at).toBe(5);
        expect(to_inbox_run_item({ run_id: 'r', state: 'failed', started_at: 1, last_updated_at: 4 } as any, 'failed').at).toBe(4);
        expect(to_inbox_run_item({ run_id: 'r', state: 'running', started_at: 2 } as any, 'run').at).toBe(2);
    });

    it('run item: title run_name → team_label → run_id; team team_label → team_id', () => {
        const a = to_inbox_run_item({ run_id: 'r', state: 'awaiting_input', run_name: 'N', team_label: 'L', team_id: 's/t', current_phase: 'p' } as any, 'input');
        expect(a).toMatchObject({ kind: 'input', title: 'N', team: 'L', phase: 'p' });
        const b = to_inbox_run_item({ run_id: 'r', state: 'running', team_id: 's/t' } as any, 'run');
        expect(b).toMatchObject({ title: 'r', team: 's/t', error: null });
    });
});
