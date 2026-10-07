import { describe, it, expect } from 'vitest';
import {
    derive_run_attempts,
    to_run_attempts_data,
    to_run_detail_child_data,
    to_run_detail_parent_data,
    to_run_detail_phase_data,
    to_run_detail_review_data,
} from '../../../src/mappers/run_detail_mapper.js';

describe('run detail mapper', () => {
    it('phase: numbers kept when finite, optional fields default to null', () => {
        expect(to_run_detail_phase_data({ phase: 'build', status: 'done', sequence: 1, started_at: 10, completed_at: 20, error: 'e', agent: 'a' } as any))
            .toEqual({ phase: 'build', status: 'done', sequence: 1, started_at: 10, completed_at: 20, error: 'e', agent: 'a', attempts: 1, previous_attempts: [] });
        expect(to_run_detail_phase_data({ phase: 'qa', status: 'pending', sequence: '2', started_at: null } as any))
            .toEqual({ phase: 'qa', status: 'pending', sequence: null, started_at: null, completed_at: null, error: null, agent: null, attempts: 0, previous_attempts: [] });
    });

    it('review: id from review_id, default title, null optionals', () => {
        expect(to_run_detail_review_data({ review_id: 'rv', title: 'Check', phase: 'qa', requested_at: 5, message: 'm' } as any))
            .toEqual({ id: 'rv', title: 'Check', phase: 'qa', requested_at: 5, message: 'm' });
        expect(to_run_detail_review_data({ review_id: 'rv' } as any))
            .toEqual({ id: 'rv', title: 'Review requested', phase: null, requested_at: null, message: null });
    });

    it('phase: passes earlier attempts through and counts them with the current one', () => {
        const p = to_run_detail_phase_data({
            phase: 'design', status: 'done', sequence: 2, started_at: 500, completed_at: 600,
            previous_attempts: [{ attempt: 0, status: 'failed', dispatched_at: '90', started_at: '100', completed_at: '200', exit_code: 1, error: 'sub-team failed' }, { status: 'running', dispatched_at: 300 }],
        } as any);
        expect(p.attempts).toBe(3);
        expect(p.previous_attempts).toEqual([
            { attempt: 0, status: 'failed', started_at: 100, completed_at: 200, error: 'sub-team failed' },
            { attempt: null, status: 'running', started_at: 300, completed_at: null, error: null },
        ]);
    });
});

const ev = (event: string, created_at: number, over: Record<string, unknown> = {}) => ({ id: `${event}-${created_at}`, event, created_at, run_id: 'r1', phase: null, payload: {}, title: null, message: null, realm_id: 'realm-1', realm_slug: 'prod', user_id: null, team: null, severity: null, ...over }) as any;

describe('run attempts from lifecycle events', () => {
    it('a run never resumed is one attempt', () => {
        const run = { run_id: 'r1', state: 'completed', started_at: 1000, completed_at: 5000 } as any;
        expect(to_run_attempts_data([ev('run.completed', 5000), ev('run.started', 1000)], run)).toEqual([
            { n: 1, started_at: 1000, from_phase: null, ended_at: 5000, state: 'completed', failed_phase: null, error: null },
        ]);
    });

    it('a failed run resumed from a phase and completing is two attempts (run.started + run.resumed pair deduped)', () => {
        const run = { run_id: 'r1', state: 'completed', started_at: 1000, completed_at: 90_000 } as any;
        const attempts = to_run_attempts_data([
            ev('run.started', 1000),
            ev('run.failed', 20_000, { phase: 'design', payload: { error: "Phase 'design' failed: sub-team run failed" } }),
            // Daemon and Core both report the failure.
            ev('run.failed', 20_400, { phase: 'design' }),
            // Core re-emits run.started on resume, then the daemon sends run.resumed.
            ev('run.started', 60_000),
            ev('run.resumed', 60_200, { phase: 'design', payload: { from_phase: 'design', workspace_dir: '/x' } }),
            ev('run.completed', 90_000),
        ], run);
        expect(attempts).toEqual([
            { n: 1, started_at: 1000, from_phase: null, ended_at: 20_000, state: 'failed', failed_phase: 'design', error: "Phase 'design' failed: sub-team run failed" },
            { n: 2, started_at: 60_000, from_phase: 'design', ended_at: 90_000, state: 'completed', failed_phase: null, error: null },
        ]);
    });

    it('a resume that fails again is a failed second attempt; run.resumed before run.started is still one attempt', () => {
        const run = { run_id: 'r1', state: 'failed', started_at: 1000, completed_at: 80_000, error: 'boom', current_phase: 'implement' } as any;
        const attempts = to_run_attempts_data([
            ev('run.started', 1000),
            ev('run.failed', 20_000, { phase: 'design' }),
            ev('run.resumed', 60_000, { payload: { from_phase: 'design' } }),
            ev('run.started', 60_100),
            ev('run.failed', 80_000),
        ], run);
        expect(attempts.map((a) => [a.n, a.from_phase, a.state, a.failed_phase])).toEqual([[1, null, 'failed', 'design'], [2, 'design', 'failed', 'implement']]);
        expect(attempts[1]!.error).toBe('boom');
        expect(attempts[1]!.started_at).toBe(60_000);
    });

    it('a resumed run still going ends in a running attempt', () => {
        const run = { run_id: 'r1', state: 'running', started_at: 1000, completed_at: null } as any;
        const attempts = to_run_attempts_data([ev('run.started', 1000), ev('run.crashed', 5000), ev('run.resumed', 9000, { payload: { from_phase: 'qa' } })], run);
        expect(attempts.map((a) => [a.state, a.ended_at])).toEqual([['crashed', 5000], ['running', null]]);
    });

    it('ignores other runs\' and other types\' rows; no lifecycle rows → []', () => {
        const run = { run_id: 'r1', state: 'failed', started_at: 1 } as any;
        expect(to_run_attempts_data([ev('phase.failed', 5), ev('run.failed', 6, { run_id: 'other' })], run)).toEqual([]);
    });
});

describe('run attempts from phases (no events visible)', () => {
    const run = { run_id: 'r1', state: 'completed', started_at: 1000, completed_at: 90_000 } as any;

    it('no leading skipped phases → one attempt settled from the run', () => {
        expect(derive_run_attempts([{ phase: 'a', status: 'done', sequence: 0 }, { phase: 'b', status: 'failed', sequence: 1 }] as any, { ...run, state: 'failed', error: 'x', current_phase: 'b' })).toEqual([
            { n: 1, started_at: 1000, from_phase: null, ended_at: 90_000, state: 'failed', failed_phase: 'b', error: 'x' },
        ]);
    });

    it('skipped phases before the resume point + a failed earlier attempt → two attempts', () => {
        const attempts = derive_run_attempts([
            { phase: 'plan', status: 'skipped', sequence: 0, started_at: 1000 },
            { phase: 'design', status: 'done', sequence: 1, started_at: 60_000, previous_attempts: [{ status: 'failed', started_at: 5000, completed_at: 20_000, error: 'sub-team failed' }] },
            { phase: 'build', status: 'done', sequence: 2, started_at: 70_000 },
        ] as any, run);
        expect(attempts).toEqual([
            { n: 1, started_at: 1000, from_phase: null, ended_at: 20_000, state: 'failed', failed_phase: 'design', error: 'sub-team failed' },
            { n: 2, started_at: 60_000, from_phase: 'design', ended_at: 90_000, state: 'completed', failed_phase: null, error: null },
        ]);
    });
});

describe('parent / children', () => {
    it('parent only for a child run; name and state from the parent read, realm from it or the run\'s realm', () => {
        expect(to_run_detail_parent_data({ run_id: 'c1', state: 'failed' } as any, null, { realm_slug: 'prod', org_slug: 'acme' })).toBeNull();
        expect(to_run_detail_parent_data({ run_id: 'c1', state: 'failed', parent_run_id: 'p1', parent_phase: 'design' } as any, { run_id: 'p1', run_name: 'kind-fern', state: 'failed' } as any, { realm_slug: 'prod', org_slug: 'acme' }))
            .toEqual({ run_id: 'p1', run_name: 'kind-fern', phase: 'design', state: 'failed', realm_slug: 'prod', org_slug: 'acme' });
        // Parent read failed: still linkable by id.
        expect(to_run_detail_parent_data({ run_id: 'c1', state: 'failed', parent_run_id: 'p1', parent_phase: 'design' } as any, null, { realm_slug: 'prod', org_slug: 'acme' }))
            .toMatchObject({ run_id: 'p1', run_name: null, state: null });
    });

    it('child row', () => {
        expect(to_run_detail_child_data({ run_id: 'c1', run_name: 'design-lld', team_label: '@measureone/design-lld', parent_phase: 'design', state: 'failed', started_at: 5, completed_at: 9, realm_slug: 'prod', org_slug: 'acme', inputs: { x: 1 } } as any))
            .toEqual({ run_id: 'c1', run_name: 'design-lld', team_label: '@measureone/design-lld', parent_phase: 'design', state: 'failed', started_at: 5, completed_at: 9, realm_slug: 'prod', org_slug: 'acme' });
    });
});
