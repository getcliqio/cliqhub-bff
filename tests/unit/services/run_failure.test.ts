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
        // The Hug gate's own messages (cliq-agents hug/index.ts).
        expect(failed("Gate 'hug-lld' escalated: Review 0b9e6c2a-4f7d-4c1e-9a3b-adbf4c163079 timed out — escalating")).toMatchObject({ reason: 'review_timed_out', summary: 'Review timed out with no decision' });
        expect(failed('Review 0b9e6c2a-4f7d-4c1e-9a3b-adbf4c163079: rejected by Ann — no route targets available (too big)')).toMatchObject({ reason: 'review_rejected' });
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
        const review = { hug_id: 'r', status: 'expired', policy: 'any' as const, route_targets: ['draft-lld'],
            reviewers: [{ name: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z', comment: null }] };
        expect(classify_failure({ run_state: 'failed', error: 'Review r timed out after 30m', review }))
            .toMatchObject({ reason: 'review_timed_out', summary: "Review timed out after 30m — krupali's reject didn't decide it" });
    });
});

describe('to_failure_review', () => {
    it('lists who answered the Hug and how; route targets come from the decision choices', () => {
        const r = to_failure_review('h1', {
            status: 'closed',
            requested_inputs: [{ name: 'decision', choices: [{ value: 'approve' }, { value: 'route:draft-lld' }, { value: 'reject' }] }, { name: 'comment' }],
            responses: [
                { responder: { name: 'krupali' }, values: { decision: 'reject', comment: 'jobs too big' }, responded_at: '2026-10-08T13:50:00Z' },
                { responder: { name: 'sapan' }, values: { decision: 'route:draft-lld' }, comment: 'try again', responded_at: '2026-10-08T14:00:00Z' },
                { responder: {}, values: {}, responded_at: null },
            ],
        });
        expect(r).toEqual({ hug_id: 'h1', status: 'closed', policy: null, route_targets: ['draft-lld'], reviewers: [
            { name: 'krupali', action: 'REJECT', responded_at: '2026-10-08T13:50:00Z', comment: 'jobs too big' },
            { name: 'sapan', action: 'ROUTE:draft-lld', responded_at: '2026-10-08T14:00:00Z', comment: 'try again' },
            { name: 'reviewer', action: null, responded_at: null, comment: null },
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
    const hug_id = '0b9e6c2a-4f7d-4c1e-9a3b-adbf4c163079';
    const review_error = `Gate 'hug-lld' escalated: Review ${hug_id} timed out — escalating`;

    it('follows the failure into the sub-team and down to the Hug, and resumes from where a reject sends work', async () => {
        const control = {
            run_phases: vi.fn(async () => [
                { phase: 'draft-lld', status: 'done', sequence: 2 }, { phase: 'assemble', status: 'done', sequence: 3 },
                { phase: 'hug-lld', status: 'failed', sequence: 4, error: review_error },
            ]),
            child_runs: vi.fn(async () => ({ items: [], total: 0 })),
        } as any;
        const read_review = vi.fn(async () => ({
            status: 'expired',
            requested_inputs: [{ name: 'decision', choices: [{ value: 'approve' }, { value: 'route:draft-lld' }, { value: 'reject' }] }],
            responses: [{ responder: { name: 'krupali' }, values: { decision: 'approve' }, responded_at: '2026-10-08T13:50:00Z' }],
        }));

        const f = await read_failure(control, read_review, run, phases, [child], 'tok');

        expect(read_review).toHaveBeenCalledWith(hug_id, 'tok');
        expect(f).toMatchObject({
            reason: 'review_timed_out',
            summary: 'Review timed out with no decision',
            detail: review_error,
            resume_from: 'draft-lld',
            chain: [
                { run_id: 'r1', team: '@measureone/architect', phase: 'design' },
                { run_id: 'c1', run_name: 'solar-lilac-fox', team: '@measureone/design-lld', phase: 'hug-lld' },
            ],
        });
        expect(f!.review).toMatchObject({ hug_id, route_targets: ['draft-lld'] });
        expect(f!.review!.reviewers.map((r) => [r.name, r.action])).toEqual([['krupali', 'APPROVE']]);
    });

    it('a sub-team it cannot read ends the walk there; a run that has not stopped has no failure', async () => {
        const control = { run_phases: vi.fn(async () => { throw new Error('boom'); }), child_runs: vi.fn(async () => ({ items: [] })) } as any;
        const f = await read_failure(control, null, run, phases, [child], 'tok');
        expect(f!.chain.map((s) => s.run_id)).toEqual(['r1', 'c1']);
        expect(f!.resume_from).toBeNull();
        expect(await read_failure(control, null, { ...run, state: 'completed' }, phases, [], 'tok')).toBeNull();
    });
});
