import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverviewService } from '../../../src/services/overview_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const ORG_C = '33333333-3333-4333-8333-333333333333';

const org = (id: string, slug: string, role = 'member') => ({ id, slug, display_name: slug.toUpperCase(), role, member_count: 1, scope_count: 1 });

function summary(over: Record<string, unknown> = {}) {
    return {
        ok: true,
        counts: { active_runs: 2, awaiting_input: 1, failed_24h: 1, completed_24h: 5, daemons_online: 3, daemons_total: 4, pending_reviews: 5 },
        live_runs: [
            { run_id: 'r-run', run_name: 'Build', state: 'running', team_label: '@cliq/dev', realm_id: 'realm-1', realm_slug: 'prod', started_at: 2000 },
            { run_id: 'r-wait', run_name: 'Needs input', state: 'awaiting_input', team_label: '@cliq/dev', realm_id: 'realm-1', realm_slug: 'prod', started_at: 3000 },
        ],
        pending_reviews: [
            { review_id: 'rev-1', title: 'Approve design', phase: 'design-review', team: '@cliq/dev', realm_id: 'realm-1', realm_slug: 'prod', org_slug: 'acme', run_id: 'r-run', requested_at: 4000, status: 'pending' },
            { review_id: 'rev-old', title: 'Done', status: 'approved', requested_at: 9999 },
        ],
        ...over,
    };
}

function realms() {
    return {
        ok: true,
        realms: [
            { id: 'realm-1', slug: 'prod', org_slug: 'acme', name: 'Prod', last_activity_at: 10, daemons: { online: 2, stale: 0, offline: 1, total: 3 }, runs: { active: 2, awaiting_input: 1 }, pending_reviews: 3 },
            { id: 'realm-2', slug: 'stage', org_slug: 'acme', name: 'Stage', last_activity_at: 20, daemons: { online: 1, total: 1 }, runs: { active: 0, awaiting_input: 0 }, pending_reviews: 1 },
        ],
    };
}

describe('OverviewService', () => {
    const orgs_repo = { get: vi.fn() };
    const dash_repo = { summary: vi.fn(), realms: vi.fn() };
    let service: OverviewService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new OverviewService(orgs_repo as any, dash_repo as any);
    });

    it('asks Core for the caller\'s own orgs with the caller\'s token', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [] });
        await service.get('tok-effective');
        expect(orgs_repo.get).toHaveBeenCalledWith('tok-effective', { mine: true });
    });

    it('returns an empty overview for a user with no orgs', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [] });
        const dto = await service.get('t');
        expect(dto.orgs).toEqual([]);
        expect(dto.totals).toMatchObject({ orgs: 0, realms: 0, needs_you: 0 });
        expect(dto.partial).toBe(false);
        expect(dash_repo.summary).not.toHaveBeenCalled();
    });

    it('fans out summary + realms once per org, each with its own org_id', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme', 'owner'), org(ORG_B, 'beta')] });
        dash_repo.summary.mockResolvedValue(summary());
        dash_repo.realms.mockResolvedValue(realms());
        await service.get('t');
        expect(dash_repo.summary.mock.calls.map((c) => c[0]).sort()).toEqual([ORG_A, ORG_B].sort());
        expect(dash_repo.realms.mock.calls.map((c) => c[0]).sort()).toEqual([ORG_A, ORG_B].sort());
        for (const call of [...dash_repo.summary.mock.calls, ...dash_repo.realms.mock.calls]) expect(call[1]).toBe('t');
    });

    it('maps one org: role, realm rollups, counts (pending from realms, not the capped list)', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme', 'owner')] });
        dash_repo.summary.mockResolvedValue(summary());
        dash_repo.realms.mockResolvedValue(realms());
        const dto = await service.get('t');
        const o = dto.orgs[0];
        expect(o).toMatchObject({ id: ORG_A, slug: 'acme', display_name: 'ACME', role: 'owner', status: 'ok', error: null });
        expect(o.counts).toEqual({ needs_you: 5, pending_reviews: 4, awaiting_input: 1, active_runs: 2, failed_24h: 1, completed_24h: 5, daemons_online: 3, daemons_total: 4 });
        // Sorted by recent activity; missing daemon fields default to 0.
        expect(o.realms.map((r) => r.slug)).toEqual(['stage', 'prod']);
        expect(o.realms[0]).toMatchObject({ org_id: ORG_A, org_slug: 'acme', daemons: { online: 1, stale: 0, offline: 0, total: 1 }, needs_you: 1 });
        expect(o.realms[1]).toMatchObject({ pending_reviews: 3, awaiting_input: 1, needs_you: 4 });
    });

    it('merges needs_you (pending reviews + awaiting runs) and live runs, newest first, tagged by org', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme'), org(ORG_B, 'beta')] });
        dash_repo.summary.mockImplementation(async (id: string) => (id === ORG_A
            ? summary()
            : summary({
                live_runs: [{ run_id: 'b-run', state: 'running', started_at: 5000 }],
                pending_reviews: [{ review_id: 'b-rev', phase: 'qa', requested_at: 6000, status: 'pending' }],
            })));
        dash_repo.realms.mockResolvedValue(realms());
        const dto = await service.get('t');
        expect(dto.needs_you.map((i) => [i.id, i.kind, i.org_slug])).toEqual([
            ['b-rev', 'review', 'beta'],
            ['rev-1', 'review', 'acme'],
            ['r-wait', 'input', 'acme'],
        ]);
        expect(dto.needs_you[0].title).toBe('Review qa');
        expect(dto.live_runs.map((i) => i.id)).toEqual(['b-run', 'r-run']);
        expect(dto.totals).toMatchObject({ orgs: 2, realms: 4, active_runs: 4, failed_24h: 2 });
    });

    it('keeps other orgs when one org fails and flags partial', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme'), org(ORG_B, 'beta')] });
        dash_repo.summary.mockImplementation(async (id: string) => {
            if (id === ORG_B) throw new ApiError('forbidden', 'No access to org', 403);
            return summary();
        });
        dash_repo.realms.mockResolvedValue(realms());
        const dto = await service.get('t');
        expect(dto.partial).toBe(true);
        const beta = dto.orgs.find((o) => o.slug === 'beta')!;
        expect(beta).toMatchObject({ status: 'error', error: 'No access to org', realms: [] });
        expect(beta.counts.needs_you).toBe(0);
        // Totals only include orgs that loaded.
        expect(dto.totals).toMatchObject({ orgs: 2, realms: 2, active_runs: 2 });
    });

    it('hides non-API error details', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme')] });
        dash_repo.summary.mockResolvedValue(summary());
        dash_repo.realms.mockRejectedValue(new Error('ECONNRESET 10.0.0.4:4000'));
        const dto = await service.get('t');
        expect(dto.orgs[0].error).toBe('Could not load rollups');
    });

    it('propagates a failure of the org list itself (e.g. expired session)', async () => {
        orgs_repo.get.mockRejectedValue(new ApiError('unauthorized', 'Session expired', 401));
        await expect(service.get('t')).rejects.toMatchObject({ status: 401 });
    });

    it('filters by org_ids intersected with membership', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme'), org(ORG_B, 'beta')] });
        dash_repo.summary.mockResolvedValue(summary());
        dash_repo.realms.mockResolvedValue(realms());
        const dto = await service.get('t', { org_ids: [ORG_B] });
        expect(dto.orgs.map((o) => o.slug)).toEqual(['beta']);
        expect(dash_repo.summary).toHaveBeenCalledTimes(1);
    });

    it('rejects org_ids the caller is not a member of (403, no fan-out)', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme')] });
        await expect(service.get('t', { org_ids: [ORG_A, ORG_C] })).rejects.toMatchObject({ status: 403, code: 'forbidden' });
        expect(dash_repo.summary).not.toHaveBeenCalled();
    });

    it('bounds parallel org fetches', async () => {
        const many = Array.from({ length: 10 }, (_, i) => org(`00000000-0000-4000-8000-00000000000${i}`.slice(0, 36), `o${i}`));
        orgs_repo.get.mockResolvedValue({ orgs: many });
        let in_flight = 0;
        let peak = 0;
        dash_repo.summary.mockImplementation(async () => {
            in_flight++;
            peak = Math.max(peak, in_flight);
            await new Promise((r) => setTimeout(r, 5));
            in_flight--;
            return summary({ live_runs: [], pending_reviews: [] });
        });
        dash_repo.realms.mockResolvedValue({ realms: [] });
        const dto = await service.get('t');
        expect(dto.orgs).toHaveLength(10);
        expect(dto.orgs.map((o) => o.slug)).toEqual(many.map((o) => o.slug)); // order preserved
        expect(peak).toBeLessThanOrEqual(OverviewService.CONCURRENCY);
    });

    it('caps merged lists', async () => {
        orgs_repo.get.mockResolvedValue({ orgs: [org(ORG_A, 'acme')] });
        const reviews = Array.from({ length: 40 }, (_, i) => ({ review_id: `r${i}`, requested_at: i, status: 'pending' }));
        dash_repo.summary.mockResolvedValue(summary({ pending_reviews: reviews, live_runs: [] }));
        dash_repo.realms.mockResolvedValue(realms());
        const dto = await service.get('t');
        expect(dto.needs_you).toHaveLength(OverviewService.MAX_ITEMS);
        expect(dto.needs_you[0].id).toBe('r39');
    });
});
