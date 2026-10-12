import { describe, it, expect, vi } from 'vitest';
import { RealmRunsService } from '../../../src/services/realm_runs_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const NOW = 10_000_000_000;
function mocks() {
    return {
        realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }),
        runs: vi.fn().mockImplementation(async (f: { limit: number; state?: unknown }) => (f.limit === 1
            ? { items: [], total: f.state === 'running' ? 3 : f.state === 'awaiting_input' ? 2 : Array.isArray(f.state) ? 4 : 1284 }
            : { items: [{ run_id: 'run-1', run_name: 'PROJ-1', team_label: '@cliq/dev', state: 'running', current_phase: 'plan', daemon_id: 'd1', origin: 'hub', team_version: 'v2.1', started_at: 1, last_updated_at: 2 }], total: 40 })),
    };
}

describe('RealmRunsService', () => {
    it('one page + chip counts, filters passed to Core as the bearer', async () => {
        const c = mocks();
        const dto = await new RealmRunsService(c as any, () => NOW).get({ org_slug: 'acme', slug: 'prod', state: 'failed', q: 'PROJ', limit: 10, offset: 20 }, 'tok');
        expect(c.realm_by_slug).toHaveBeenCalledWith('acme', 'prod', 'tok');
        expect(c.runs).toHaveBeenCalledWith({ realm_id: 'r1', limit: 10, offset: 20, state: ['failed', 'crashed'], query: 'PROJ' }, 'tok');
        expect(c.runs).toHaveBeenCalledWith({ realm_id: 'r1', limit: 1, state: ['failed', 'crashed'], since_ms: NOW - 7 * 86_400_000 }, 'tok');
        expect(dto.items[0]).toMatchObject({ run_id: 'run-1', team: '@cliq/dev', current_phase: 'plan', origin: 'hub', version: 'v2.1' });
        expect(dto).toMatchObject({ total: 40, offset: 20, limit: 10, counts: { all: 1284, running: 3, awaiting_input: 2, failed_7d: 4 }, partial: false });
    });

    it('a count failing is partial; the page failing fails the call; realm gate first', async () => {
        const c = mocks();
        c.runs.mockImplementation(async (f: { limit: number; state?: unknown }) => {
            if (f.limit === 1 && f.state === 'running') throw new ApiError('upstream', 'x', 502);
            return { items: [], total: 0 };
        });
        const dto = await new RealmRunsService(c as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.partial).toBe(true);
        expect(dto.counts.running).toBeNull();
        c.runs.mockRejectedValue(new ApiError('upstream', 'down', 502));
        await expect(new RealmRunsService(c as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok')).rejects.toMatchObject({ status: 502 });
        c.realm_by_slug.mockRejectedValue(new ApiError('forbidden', 'no', 403));
        await expect(new RealmRunsService(c as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok')).rejects.toMatchObject({ status: 403 });
    });

    it('sort_by / sort_dir go to runs/get for the page only; sortable lists Core\'s keys', async () => {
        const c = mocks();
        const dto = await new RealmRunsService(c as any, () => NOW).get({ org_slug: 'acme', slug: 'prod', q: ' PROJ ', sort_by: 'run_name', sort_dir: 'asc', limit: 10 }, 'tok');
        expect(c.runs).toHaveBeenCalledWith({ realm_id: 'r1', limit: 10, offset: 0, query: 'PROJ', sort_by: 'run_name', sort_dir: 'asc' }, 'tok');
        expect(c.runs.mock.calls.filter(([f]) => f.limit === 1).every(([f]) => !('sort_by' in f))).toBe(true);
        expect(dto.sortable).toEqual(['run_name', 'state', 'team', 'started_at', 'last_updated_at']);
    });

    it('origin filter is forwarded to Core for the page query', async () => {
        const c = mocks();
        await new RealmRunsService(c as any, () => NOW).get({ org_slug: 'acme', slug: 'prod', origin: 'cli' }, 'tok');
        /** The page call (limit > 1) should carry origin. */
        const page_call = c.runs.mock.calls.find(([f]: any) => f.limit !== 1);
        expect(page_call[0]).toMatchObject({ origin: 'cli' });
    });

    it('run rows without origin or team_version map to null', async () => {
        const c = mocks();
        /** Override runs to return a row missing origin and team_version. */
        c.runs.mockImplementation(async (f: { limit: number }) => (f.limit === 1
            ? { items: [], total: 0 }
            : { items: [{ run_id: 'run-2', state: 'completed', started_at: 1, last_updated_at: 2 }], total: 1 }));
        const dto = await new RealmRunsService(c as any, () => NOW).get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.items[0].origin).toBeNull();
        expect(dto.items[0].version).toBeNull();
    });
});
