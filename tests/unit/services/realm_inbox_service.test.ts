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
        expect(control.run_by_id).toHaveBeenCalledWith('r1', 'tok');
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
        expect(dto.artifacts).toEqual([{ artifact_id: 'a1', phase: 'report', name: 'report.pdf', description: null, mime_type: 'application/pdf', size_bytes: 2048, created_at: 5 }]);
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
