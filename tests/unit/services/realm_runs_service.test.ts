import { describe, it, expect, vi } from 'vitest';
import { RealmRunsService } from '../../../src/services/realm_runs_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const NOW = 10_000_000_000;
function mocks() {
    return {
        realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }),
        runs: vi.fn().mockImplementation(async (f: { limit: number; state?: unknown }) => (f.limit === 1
            ? { items: [], total: f.state === 'running' ? 3 : f.state === 'awaiting_input' ? 2 : Array.isArray(f.state) ? 4 : 1284 }
            : { items: [{ run_id: 'run-1', run_name: 'PROJ-1', team_label: '@cliq/dev', state: 'running', current_phase: 'plan', daemon_id: 'd1', started_at: 1, last_updated_at: 2 }], total: 40 })),
    };
}

describe('RealmRunsService', () => {
    it('one page + chip counts, filters passed to Core as the bearer', async () => {
        const c = mocks();
        const dto = await new RealmRunsService(c as any, () => NOW).get('tok', { org_slug: 'acme', slug: 'prod', state: 'failed', q: 'PROJ', limit: 10, offset: 20 });
        expect(c.realm_by_slug).toHaveBeenCalledWith('acme', 'prod', 'tok');
        expect(c.runs).toHaveBeenCalledWith({ realm_id: 'r1', limit: 10, offset: 20, state: ['failed', 'crashed'], query: 'PROJ' }, 'tok');
        expect(c.runs).toHaveBeenCalledWith({ realm_id: 'r1', limit: 1, state: ['failed', 'crashed'], since_ms: NOW - 7 * 86_400_000 }, 'tok');
        expect(dto.items[0]).toMatchObject({ run_id: 'run-1', team: '@cliq/dev', current_phase: 'plan' });
        expect(dto).toMatchObject({ total: 40, offset: 20, limit: 10, counts: { all: 1284, running: 3, awaiting_input: 2, failed_7d: 4 }, partial: false });
    });

    it('a count failing is partial; the page failing fails the call; realm gate first', async () => {
        const c = mocks();
        c.runs.mockImplementation(async (f: { limit: number; state?: unknown }) => {
            if (f.limit === 1 && f.state === 'running') throw new ApiError('upstream', 'x', 502);
            return { items: [], total: 0 };
        });
        const dto = await new RealmRunsService(c as any).get('tok', { org_slug: 'acme', slug: 'prod' });
        expect(dto.partial).toBe(true);
        expect(dto.counts.running).toBeNull();
        c.runs.mockRejectedValue(new ApiError('upstream', 'down', 502));
        await expect(new RealmRunsService(c as any).get('tok', { org_slug: 'acme', slug: 'prod' })).rejects.toMatchObject({ status: 502 });
        c.realm_by_slug.mockRejectedValue(new ApiError('forbidden', 'no', 403));
        await expect(new RealmRunsService(c as any).get('tok', { org_slug: 'acme', slug: 'prod' })).rejects.toMatchObject({ status: 403 });
    });
});
