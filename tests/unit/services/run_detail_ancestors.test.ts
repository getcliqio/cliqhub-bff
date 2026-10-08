import { describe, it, expect, vi } from 'vitest';
import { RunDetailService } from '../../../src/services/run_detail_service.js';

/** Runs: main → design-lld (c1) → lint (c2, the run opened). */
const RUNS: Record<string, any> = {
    main: { run_id: 'main', run_name: 'peaceful-rust-cliff', state: 'failed', realm_id: 'r1' },
    c1: { run_id: 'c1', run_name: 'brave-rust-anchor', state: 'failed', realm_id: 'r1', parent_run_id: 'main', parent_phase: 'design' },
    c2: { run_id: 'c2', run_name: 'small-lint', state: 'completed', realm_id: 'r1', parent_run_id: 'c1', parent_phase: 'assemble' },
};

function control() {
    return {
        run_by_id: vi.fn(async (id: string) => RUNS[id] ?? null),
        run_phases: vi.fn(async () => []),
        runs: vi.fn(async () => ({ items: [], total: 0 })),
        realm_by_id: vi.fn(async () => ({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' })),
        pending_reviews: vi.fn(async () => ({ items: [], total: 0 })),
        run_artifacts: vi.fn(async () => []),
        child_runs: vi.fn(async () => ({ items: [], total: 0 })),
    };
}

describe('RunDetailService ancestors', () => {
    it('a nested sub-team run gets the whole chain above it, outermost first', async () => {
        const d = await new RunDetailService(control() as any).get({ run_id: 'c2' }, 'tok');
        expect(d.ancestors?.map((a) => [a.run_id, a.run_name, a.phase, a.state])).toEqual([
            ['main', 'peaceful-rust-cliff', 'design', 'failed'],
            ['c1', 'brave-rust-anchor', 'assemble', 'failed'],
        ]);
        expect(d.parent?.run_id).toBe('c1');
    });

    it('a top-level run has none; a grandparent that cannot be read keeps its id', async () => {
        const c = control();
        expect((await new RunDetailService(c as any).get({ run_id: 'main' }, 'tok')).ancestors).toEqual([]);
        c.run_by_id.mockImplementation(async (id: string) => { if (id === 'main') throw new Error('boom'); return RUNS[id] ?? null; });
        const d = await new RunDetailService(c as any).get({ run_id: 'c2' }, 'tok');
        expect(d.ancestors?.map((a) => [a.run_id, a.run_name])).toEqual([['main', null], ['c1', 'brave-rust-anchor']]);
    });
});
