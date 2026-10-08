import { describe, it, expect, vi } from 'vitest';
import { classify_failure, read_failure, to_failure_review } from '../../../src/services/run_failure.js';

const failed = (error: string | null, run_state = 'failed') => classify_failure({ run_state, error, review: null });

describe('classify_failure', () => {
    it('names each kind of failure plainly', () => {
        expect(failed('x', 'cancelled')).toMatchObject({ reason: 'cancelled' });
        expect(failed('daemon restarted', 'crashed')).toMatchObject({ reason: 'daemon_crashed' });
        expect(failed("Phase 'hug-lld' failed: Gate 'hug-lld' escalated: Review abcdef0123456789 timed out after 30m — escalating"))
            .toMatchObject({ reason: 'review_timed_out', summary: 'Review timed out after 30m with no decision' });
        expect(failed('Reviewer rejected — no route targets available')).toMatchObject({ reason: 'review_rejected' });
        expect(failed("Gate 'lint' escalated: style too far off")).toMatchObject({ reason: 'review_escalated', summary: 'A check escalated and stopped the run' });
        expect(failed('jira get_issue failed: 401 Unauthorized')).toMatchObject({ reason: 'permission', summary: 'Jira refused access' });
        expect(failed('git push: Permission denied (publickey)')).toMatchObject({ reason: 'permission', summary: 'GitHub refused access' });
        expect(failed("Phase 'build' needs inputs: repo")).toMatchObject({ reason: 'missing_setup' });
        expect(failed('Phase idle for 20m — timed out')).toMatchObject({ reason: 'timed_out' });
        expect(failed('cursor exited 1\nstderr:\nboom')).toMatchObject({ reason: 'agent_crashed', summary: 'The agent exited with code 1' });
        expect(failed('LLM_ERROR: model overloaded')).toMatchObject({ reason: 'agent_error' });
        expect(failed(null)).toMatchObject({ reason: 'unknown' });
    });

    it('a permission error wins over the non-zero exit it caused', () => {
        expect(failed('cursor exited 1\nstderr:\nHTTP 403 Forbidden from api.github.com')).toMatchObject({ reason: 'permission' });
    });

    it('a timed-out review says whose reject did not decide it', () => {
        const review = { review_id: 'r', status: 'expired', policy: 'any' as const, route_targets: ['draft-lld'],
            reviewers: [{ name: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z', comment: null }] };
        expect(classify_failure({ run_state: 'failed', error: 'Review r timed out after 30m', review }))
            .toMatchObject({ reason: 'review_timed_out', summary: "Review timed out after 30m — krupali's reject didn't decide it" });
    });
});

describe('to_failure_review', () => {
    it('lists who the review went to and what each answered', () => {
        const r = to_failure_review('rv1', {
            status: 'expired', route_targets: ['draft-lld'],
            groups: [{ policy: 'any', notifications: [
                { channel_target: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z', comment: 'jobs too big' },
                { channel_target: 'sapan', action: null, responded_at: null, comment: null },
            ] }],
        });
        expect(r).toEqual({ review_id: 'rv1', status: 'expired', policy: 'any', route_targets: ['draft-lld'], reviewers: [
            { name: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z', comment: 'jobs too big' },
            { name: 'sapan', action: null, responded_at: null, comment: null },
        ] });
    });
});

describe('read_failure', () => {
    const run = { run_id: 'r1', run_name: 'easy-carmine-spruce', team_label: '@measureone/architect', state: 'failed',
        error: "Phase 'design' failed: Sub-team '@measureone/design-lld' ended with state: failed" } as any;
    const phases = [
        { phase: 'index', status: 'done', sequence: 2 },
        { phase: 'design', status: 'failed', sequence: 3, error: "Sub-team '@measureone/design-lld' ended with state: failed" },
        { phase: 'create-stories', status: 'pending', sequence: 4 },
    ] as any[];
    const child = { run_id: 'c1', run_name: 'solar-lilac-fox', team_label: '@measureone/design-lld', state: 'failed', parent_phase: 'design' } as any;
    const review_error = "Gate 'hug-lld' escalated: Review adbf4c163079603a6915ff1cc4c9b18d timed out after 30m — escalating";

    it('follows the failure into the sub-team and down to the review, and resumes from where a reject sends work', async () => {
        const control = {
            run_phases: vi.fn(async () => [
                { phase: 'draft-lld', status: 'done', sequence: 2 }, { phase: 'assemble', status: 'done', sequence: 3 },
                { phase: 'hug-lld', status: 'failed', sequence: 4, error: review_error },
            ]),
            child_runs: vi.fn(async () => ({ items: [], total: 0 })),
        } as any;
        const read_review = vi.fn(async () => ({ status: 'expired', route_targets: ['draft-lld'], groups: [{ policy: 'any', notifications: [
            { channel_target: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z' }, { channel_target: 'sapan' }, { channel_target: 'elan' },
        ] }] }));

        const f = await read_failure(control, read_review, run, phases, [child], 'tok');

        expect(read_review).toHaveBeenCalledWith('adbf4c163079603a6915ff1cc4c9b18d', 'tok');
        expect(f).toMatchObject({
            reason: 'review_timed_out',
            summary: "Review timed out after 30m — krupali's reject didn't decide it",
            detail: review_error,
            resume_from: 'draft-lld',
            chain: [
                { run_id: 'r1', team: '@measureone/architect', phase: 'design' },
                { run_id: 'c1', run_name: 'solar-lilac-fox', team: '@measureone/design-lld', phase: 'hug-lld' },
            ],
        });
        expect(f!.review!.reviewers.map((r) => [r.name, r.action])).toEqual([['krupali', 'REJECT'], ['sapan', null], ['elan', null]]);
    });

    it('a sub-team it cannot read ends the walk there; a run that has not stopped has no failure', async () => {
        const control = { run_phases: vi.fn(async () => { throw new Error('boom'); }), child_runs: vi.fn(async () => ({ items: [] })) } as any;
        const f = await read_failure(control, null, run, phases, [child], 'tok');
        expect(f!.chain.map((s) => s.run_id)).toEqual(['r1', 'c1']);
        expect(f!.resume_from).toBeNull();
        expect(await read_failure(control, null, { ...run, state: 'completed' }, phases, [], 'tok')).toBeNull();
    });
});
