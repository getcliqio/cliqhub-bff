import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealmInboxService } from '../../../src/services/realm_inbox_service.js';
import { RunDetailService } from '../../../src/services/run_detail_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const NOW = 1_000_000_000_000;
const realm = { id: 'realm-1', slug: 'prod', name: 'Prod', org_slug: 'acme' };
const run = (id: string, state: string, over: Record<string, unknown> = {}) => ({ run_id: id, state, run_name: `run ${id}`, team_label: '@cliq/dev', started_at: 1000, last_updated_at: 2000, ...over });

function repo() {
    return {
        realm_by_slug: vi.fn().mockResolvedValue(realm),
        realm_by_id: vi.fn().mockResolvedValue(realm),
        pending_reviews: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        runs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        run_by_id: vi.fn(),
        run_phases: vi.fn().mockResolvedValue([]),
        run_artifacts: vi.fn().mockResolvedValue([]),
        artifact_by_id: vi.fn(),
        child_runs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        notifications: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
}

describe('RealmInboxService', () => {
    let control: ReturnType<typeof repo>;
    let service: RealmInboxService;

    beforeEach(() => {
        control = repo();
        service = new RealmInboxService(control as any, () => NOW);
    });

    it('resolves the realm by org + slug with the caller token, then reads four sections for that realm id', async () => {
        await service.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(control.realm_by_slug).toHaveBeenCalledWith('acme', 'prod', 'tok');
        expect(control.pending_reviews).toHaveBeenCalledWith('realm-1', 'tok');
        const filters = control.runs.mock.calls.map((c) => c[0]);
        expect(filters).toEqual([
            { realm_id: 'realm-1', state: 'awaiting_input', limit: 50 },
            { realm_id: 'realm-1', state: ['failed', 'crashed'], since_ms: NOW - 86_400_000, limit: 25 },
            { realm_id: 'realm-1', state: 'running', limit: 25 },
        ]);
        for (const c of control.runs.mock.calls) expect(c[1]).toBe('tok');
    });

    it('fails the whole call when the realm cannot be resolved (membership gate)', async () => {
        control.realm_by_slug.mockRejectedValue(new ApiError('forbidden', 'Not a realm member', 403));
        await expect(service.get({ org_slug: 'acme', slug: 'prod' }, 'tok')).rejects.toMatchObject({ status: 403 });
        expect(control.runs).not.toHaveBeenCalled();
        expect(control.pending_reviews).not.toHaveBeenCalled();
    });

    it('merges reviews, awaiting input and failures newest first; running goes to live', async () => {
        control.pending_reviews.mockResolvedValue({ items: [{ review_id: 'rev-1', title: 'Approve', run_id: 'r1', phase: 'gate', requested_at: 5000, status: 'pending', artifact_count: 2 }], total: 1 });
        control.runs.mockImplementation(async (f: any) => {
            if (f.state === 'awaiting_input') return { items: [run('r-wait', 'awaiting_input', { last_updated_at: 7000, current_phase: 'intake' })], total: 3 };
            if (Array.isArray(f.state)) return { items: [run('r-fail', 'crashed', { completed_at: 6000, error: 'boom' })], total: 1 };
            return { items: [run('r-live', 'running')], total: 1 };
        });
        const dto = await service.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.items.map((i) => [i.kind, i.id])).toEqual([['input', 'r-wait'], ['failed', 'r-fail'], ['review', 'rev-1']]);
        expect(dto.items[0].phase).toBe('intake');
        expect(dto.items[1]).toMatchObject({ state: 'crashed', error: 'boom', at: 6000 });
        expect(dto.items[2]).toMatchObject({ run_id: 'r1', artifact_count: 2, title: 'Approve' });
        expect(dto.live.map((i) => i.id)).toEqual(['r-live']);
        // Counts use Core totals, not page length.
        expect(dto.counts).toEqual({ reviews: 1, awaiting_input: 3, failed_24h: 1, running: 1 });
        expect(dto.realm).toEqual(realm);
        expect(dto.partial).toBe(false);
    });

    it('keeps the other sections when one Core read fails, and flags partial', async () => {
        control.pending_reviews.mockRejectedValue(new ApiError('upstream', 'reviews down', 502));
        control.runs.mockImplementation(async (f: any) => (f.state === 'running' ? { items: [run('r-live', 'running')], total: 1 } : { items: [], total: 0 }));
        const dto = await service.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.partial).toBe(true);
        expect(dto.sections.reviews).toEqual({ status: 'error', error: 'reviews down' });
        expect(dto.sections.running.status).toBe('ok');
        expect(dto.live).toHaveLength(1);
        expect(dto.counts.reviews).toBe(0);
    });

    it('hides non-API error internals', async () => {
        control.runs.mockRejectedValue(new Error('ECONNRESET 10.0.0.4'));
        const dto = await service.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.sections.running.error).toBe('Could not load');
    });

    it('caps merged lists', async () => {
        control.runs.mockImplementation(async (f: any) => (f.state === 'awaiting_input'
            ? { items: Array.from({ length: 80 }, (_, i) => run(`r${i}`, 'awaiting_input', { last_updated_at: i })), total: 80 }
            : { items: [], total: 0 }));
        const dto = await service.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.items).toHaveLength(RealmInboxService.MAX_ITEMS);
        expect(dto.items[0].id).toBe('r79');
        expect(dto.counts.awaiting_input).toBe(80);
    });
});

describe('RunDetailService', () => {
    let control: ReturnType<typeof repo>;
    let service: RunDetailService;

    beforeEach(() => {
        control = repo();
        service = new RunDetailService(control as any);
    });

    it('reads phase outputs for display, oldest first, fetching in full only the ones cut off', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', state: 'completed' });
        const short = JSON.stringify({ text: 'PASS: Approved by human reviewer' });
        const long = JSON.stringify({ text: `## Jira Results\n\n✓ ${'x'.repeat(2100)}`, data: { action: 'get', sources: {} } });
        control.run_artifacts.mockResolvedValue([
            { artifact_id: 'rec:2', source: 'record', kind: 'output', phase: 'fetch', name: 'phase_output', content_preview: `${long.slice(0, 2000)}\n…`, size_bytes: Buffer.byteLength(long), created_at: 20 },
            { artifact_id: 'rec:1', source: 'record', kind: 'output', phase: 'gate', name: 'phase_output', content_preview: short, size_bytes: Buffer.byteLength(short), created_at: 10 },
            { artifact_id: 'rec:3', source: 'record', kind: 'handoff', phase: 'gate', name: 'handoff', content_preview: 'notes', size_bytes: 5, created_at: 15 },
            { artifact_id: 'f1', source: 'file', kind: 'file', phase: 'fetch', name: 'ticket.json', size_bytes: 10, created_at: 21 },
        ]);
        control.artifact_by_id.mockResolvedValue({ artifact_id: 'rec:2', content: long });

        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(control.artifact_by_id).toHaveBeenCalledTimes(1);
        expect(control.artifact_by_id).toHaveBeenCalledWith('rec:2', 'tok');
        expect(dto.phase_outputs.map((o) => [o.phase, o.view.kind, o.complete])).toEqual([['gate', 'verdict', true], ['fetch', 'tool', true]]);
        expect(dto.phase_outputs[1]!.raw).toBe(long);
        expect(dto.artifacts).toHaveLength(4);
    });

    it('keeps a cut-off output as its preview when the full read fails', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', state: 'completed' });
        control.run_artifacts.mockResolvedValue([
            { artifact_id: 'rec:2', source: 'record', kind: 'output', phase: 'draft', name: 'phase_output', content_preview: '{"text": "abc\n…', size_bytes: 5000, created_at: 20 },
        ]);
        control.artifact_by_id.mockRejectedValue(new Error('boom'));
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.phase_outputs[0]).toMatchObject({ complete: false, raw: '{"text": "abc\n…' });
        expect(dto.phase_outputs[0]!.view.summary).toContain('see Raw');
    });

    it('404s when Core has no such run and makes no further calls', async () => {
        control.run_by_id.mockResolvedValue(null);
        await expect(service.get({ run_id: 'nope' }, 'tok')).rejects.toMatchObject({ status: 404, code: 'not_found' });
        expect(control.run_phases).not.toHaveBeenCalled();
    });

    it('composes run, phases, labels, realm and this run\'s pending reviews with the caller token', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'awaiting_input', pending_control: null, state_lost_at: null });
        control.run_phases.mockResolvedValue([{ phase: 'plan', status: 'completed', sequence: 0, started_at: 1, completed_at: 2 }, { phase: 'gate', status: 'awaiting_input', sequence: 1 }]);
        control.runs.mockResolvedValue({ items: [{ run_id: 'r10', state: 'running', team_label: 'wrong' }, { run_id: 'r1', state: 'awaiting_input', team_label: '@cliq/dev', workspace_name: 'api' }], total: 2 });
        control.pending_reviews.mockResolvedValue({ items: [
            { review_id: 'rev-1', run_id: 'r1', title: 'Approve plan', phase: 'gate', requested_at: 9 },
            { review_id: 'rev-2', run_id: 'other', title: 'Not mine' },
        ], total: 2 });
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(control.run_by_id).toHaveBeenCalledWith('r1', 'tok', { with_history: true });
        expect(control.run_phases).toHaveBeenCalledWith('r1', 'tok');
        expect(control.runs).toHaveBeenCalledWith({ realm_id: 'realm-1', query: 'r1', limit: 5 }, 'tok');
        expect(control.realm_by_id).toHaveBeenCalledWith('realm-1', 'tok');
        expect(dto.run).toMatchObject({ run_id: 'r1', team_label: '@cliq/dev', workspace_name: 'api', pending_control: null });
        expect(dto.phases.map((p) => p.phase)).toEqual(['plan', 'gate']);
        expect(dto.phases[1]).toMatchObject({ started_at: null, error: null, agent: null });
        expect(dto.realm).toEqual(realm);
        expect(dto.reviews).toEqual([{ id: 'rev-1', title: 'Approve plan', phase: 'gate', requested_at: 9, message: null }]);
        expect(control.run_artifacts).toHaveBeenCalledWith('r1', 'tok');
        expect(dto.artifacts).toEqual([]);
        expect(dto.sections.artifacts.status).toBe('ok');
        expect(dto.partial).toBe(false);
    });

    it('lists the run\'s stored files without their expiring download links', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'completed' });
        control.run_artifacts.mockResolvedValue([{ artifact_id: 'a1', run_id: 'r1', phase: 'report', name: 'report.pdf', description: null, mime_type: 'application/pdf', size_bytes: 2048, download_url: 'https://r2/x?sig', created_at: 5 }]);
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.artifacts).toEqual([{ artifact_id: 'a1', source: 'file', kind: 'file', content_preview: null, phase: 'report', name: 'report.pdf', description: null, mime_type: 'application/pdf', size_bytes: 2048, created_at: 5 }]);
    });

    it('lists run records with files — one list, each with its source, kind and preview', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'completed' });
        control.run_artifacts.mockResolvedValue([
            { artifact_id: 'rec:u1', source: 'record', kind: 'output', content_preview: 'done', run_id: 'r1', phase: 'build', name: 'phase_output', description: null, mime_type: 'text/plain', size_bytes: 4, download_url: null, created_at: 3 },
        ]);
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.artifacts).toEqual([{ artifact_id: 'rec:u1', source: 'record', kind: 'output', content_preview: 'done', phase: 'build', name: 'phase_output', description: null, mime_type: 'text/plain', size_bytes: 4, created_at: 3 }]);
    });

    it('artifacts failing keeps the page and flags partial, also for a run without a realm', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: null, state: 'completed' });
        control.run_artifacts.mockRejectedValue(new ApiError('upstream', 'storage down', 502));
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.artifacts).toEqual([]);
        expect(dto.sections.artifacts).toEqual({ status: 'error', error: 'storage down' });
        expect(dto.partial).toBe(true);
    });

    it('a run without a realm skips realm reads and is not partial', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: null, state: 'completed' });
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(control.runs).not.toHaveBeenCalled();
        expect(control.realm_by_id).not.toHaveBeenCalled();
        expect(dto.realm).toBeNull();
        expect(dto.partial).toBe(false);
    });

    it('phases failing still returns the run, flagged partial', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'running' });
        control.run_phases.mockRejectedValue(new ApiError('upstream', 'phases down', 502));
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.run.run_id).toBe('r1');
        expect(dto.phases).toEqual([]);
        expect(dto.sections.phases).toEqual({ status: 'error', error: 'phases down' });
        expect(dto.partial).toBe(true);
    });
});

describe('RunDetailService — attempts, parent, children', () => {
    let control: ReturnType<typeof repo>;
    let service: RunDetailService;
    const ev = (event: string, created_at: number, over: Record<string, unknown> = {}) => ({ id: `${event}-${created_at}`, event, created_at, run_id: 'r1', phase: null, payload: {}, ...over });

    beforeEach(() => {
        control = repo();
        service = new RunDetailService(control as any);
    });

    it('builds the attempts from the run\'s history (one read, with who resumed)', async () => {
        const h = (type: string, at: number, over: Record<string, unknown> = {}) => ({ type, at, from_phase: null, phase: null, error: null, actor: null, ...over });
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'completed', started_at: 1000, completed_at: 90_000, history: [
            h('run.started', 1000), h('run.failed', 20_000, { phase: 'design', error: 'sub-team failed' }),
            h('run.resume_requested', 59_000, { from_phase: 'design', actor: { id: 'u1', username: 'sapan', display_name: 'Sapan Shah' } }),
            h('run.started', 59_900), h('run.resumed', 60_000, { from_phase: 'design' }), h('run.completed', 90_000),
        ] });
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(control.run_by_id).toHaveBeenCalledWith('r1', 'tok', { with_history: true });
        expect(control.notifications).not.toHaveBeenCalled();
        expect(dto.attempts_source).toBe('events');
        expect(dto.attempts!.map((a) => [a.n, a.from_phase, a.state, a.failed_phase, a.resumed_by?.username ?? null])).toEqual([[1, null, 'failed', 'design', null], [2, 'design', 'completed', null, 'sapan']]);
        expect((dto.run as Record<string, unknown>).history).toBeUndefined();
        expect(dto.partial).toBe(false);
    });

    it('an older Core without history → attempts rebuilt from the phases, page not partial', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'failed', started_at: 1000 });
        control.run_phases.mockResolvedValue([{ phase: 'plan', status: 'failed', sequence: 0 }]);
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.attempts_source).toBe('phases');
        expect(dto.partial).toBe(false);
    });

    it('no events visible (no in-app rule for run events) → attempts reconstructed from the phases', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'completed', started_at: 1000, completed_at: 90_000 });
        control.run_phases.mockResolvedValue([
            { phase: 'plan', status: 'skipped', sequence: 0, started_at: 1000 },
            { phase: 'design', status: 'done', sequence: 1, started_at: 60_000, previous_attempts: [{ status: 'failed', started_at: 5000, completed_at: 20_000 }] },
        ]);
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.attempts_source).toBe('phases');
        expect(dto.attempts!.map((a) => [a.n, a.from_phase, a.state])).toEqual([[1, null, 'failed'], [2, 'design', 'completed']]);
        expect(dto.phases[1]).toMatchObject({ attempts: 2, previous_attempts: [{ status: 'failed', completed_at: 20_000 }] });
    });

    it('a sub-team run links to its parent run and phase (one parent read)', async () => {
        control.run_by_id.mockImplementation(async (id: string) => (id === 'c1'
            ? { run_id: 'c1', realm_id: 'realm-1', state: 'failed', parent_run_id: 'p1', parent_phase: 'design', root_run_id: 'p1' }
            : { run_id: 'p1', realm_id: 'realm-1', state: 'failed', run_name: 'kind-fern' }));
        const dto = await service.get({ run_id: 'c1' }, 'tok');
        expect(control.run_by_id).toHaveBeenCalledWith('p1', 'tok');
        expect(dto.parent).toEqual({ run_id: 'p1', run_name: 'kind-fern', phase: 'design', state: 'failed', realm_slug: 'prod', org_slug: 'acme' });
    });

    it('lists child runs (failed ones too) with one runs/get { parent_run_id }', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'failed' });
        control.child_runs.mockResolvedValue({ items: [
            { run_id: 'c1', run_name: 'lld-1', team_label: '@measureone/design-lld', parent_phase: 'design', state: 'failed', started_at: 10, completed_at: 20 },
            { run_id: 'c2', run_name: 'lld-2', team_label: '@measureone/design-lld', parent_phase: 'design', state: 'completed', started_at: 30, completed_at: 40 },
        ], total: 2 });
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(control.child_runs).toHaveBeenCalledTimes(1);
        expect(control.child_runs).toHaveBeenCalledWith('r1', 'tok');
        expect(dto.parent).toBeNull();
        expect(dto.children.map((c) => [c.run_id, c.parent_phase, c.state])).toEqual([['c1', 'design', 'failed'], ['c2', 'design', 'completed']]);
    });

    it('children read failing keeps the page, flagged partial', async () => {
        control.run_by_id.mockResolvedValue({ run_id: 'r1', realm_id: 'realm-1', state: 'failed' });
        control.child_runs.mockRejectedValue(new ApiError('upstream', 'runs down', 502));
        const dto = await service.get({ run_id: 'r1' }, 'tok');
        expect(dto.children).toEqual([]);
        expect(dto.sections.children.status).toBe('error');
        expect(dto.partial).toBe(true);
    });
});
