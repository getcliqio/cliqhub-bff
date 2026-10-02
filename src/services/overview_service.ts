/**
 * Overview — the cross-org start view of the signed-in user.
 *
 * Composes Core: `POST /v1/orgs/get { mine }` → per org `POST /internal/dashboard/summary`
 * + `POST /internal/dashboard/realms`; the bell summary via InboxService
 * (`POST /v1/notifications/get` per org).
 */

import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { DashboardRealmsVO, DashboardSummaryVO } from '../types/core/dashboard.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type { NotifInboxSummaryData } from '../schemas/inbox_types.js';
import type { OverviewGetInput, OverviewData, OverviewItemData, OverviewOrgData } from '../schemas/overview_types.js';
import type { InboxService } from './inbox_service.js';
import { ApiError } from '../errors/api_error.js';
import { get_logger } from '../lib/log.js';
import { best_effort, error_fields } from '../lib/best_effort.js';
import { to_overview_org_data, to_overview_error_org_data, to_overview_review_items, to_overview_run_items, sum_overview_counts } from '../mappers/overview_mapper.js';

const log = get_logger('svc.overview');

/** One org's two rollup reads, settled. */
type SettledOrg = {
    org: OrgListItemVO;
    summary: PromiseSettledResult<DashboardSummaryVO>;
    realms: PromiseSettledResult<DashboardRealmsVO>;
};

/**
 * Cross-org start view.
 *
 * Core rollups are org-scoped, so a user in several orgs needs one
 * summary + one realms call per org. That fan-out lives here (BFF), never
 * in the browser: the SPA makes a single `POST /v1/overview/get`.
 */
export class OverviewService {
    /** Max orgs fetched in parallel — keeps Core load bounded for users in many orgs. */
    static readonly CONCURRENCY = 4;
    /** Cap on merged lists returned to the SPA. */
    static readonly MAX_ITEMS = 25;

    constructor(
        private readonly _orgs: OrgsRepository,
        private readonly _dashboard: DashboardRepository,
        private readonly _inbox: InboxService | null = null,
    ) {}

    /**
     * Every org's counts and realms, the merged "needs you" / live-run lists and the bell summary.
     * One org failing marks it `error` (and the overview `partial`) instead of failing the call.
     *
     * @param input - Optional org filter (must be orgs the caller belongs to → else 403) and `inbox_seen_ms`.
     * @param token - The caller's Core token (session `target_token`).
     */
    async get(input: OverviewGetInput, token: string): Promise<OverviewData> {
        // Membership SoT — Core returns only orgs the bearer belongs to.
        const { orgs: member_orgs } = await this._orgs.get({ mine: true }, token);

        // Optional filter is intersected with membership; unknown ids are an error, not a silent widen.
        const selected = this.select_orgs(member_orgs, input.org_ids);

        // Per-org fan-out with bounded concurrency; one org failing must not blank the page.
        // Bell summary runs alongside the rollups; its failure never fails the overview.
        const [settled, inbox] = await Promise.all([
            this.fetch_all(selected, token),
            this.inbox_summary(selected, token, input.inbox_seen_ms ?? 0),
        ]);

        const orgs: OverviewOrgData[] = settled.map((s) => this.to_org(s));
        const ok_orgs = orgs.filter((o) => o.status === 'ok');

        // Merge actionable + live items across orgs, tagging each with org/realm context.
        const needs_you: OverviewItemData[] = [];
        const live_runs: OverviewItemData[] = [];
        for (const s of settled) {
            if (s.summary.status !== 'fulfilled') continue;
            const summary = s.summary.value;
            needs_you.push(...to_overview_review_items(s.org, summary.pending_reviews ?? []));
            const runs = to_overview_run_items(s.org, summary.live_runs ?? []);
            needs_you.push(...runs.filter((r) => r.state === 'awaiting_input'));
            live_runs.push(...runs.filter((r) => r.state === 'running'));
        }

        return {
            orgs,
            totals: {
                ...sum_overview_counts(ok_orgs.map((o) => o.counts)),
                orgs: orgs.length,
                realms: ok_orgs.reduce((n, o) => n + o.realms.length, 0),
            },
            needs_you: this.newest_first(needs_you),
            live_runs: this.newest_first(live_runs),
            partial: orgs.some((o) => o.status === 'error'),
            inbox,
        };
    }

    /** The bell summary; `status: 'error'` (empty) when it fails, never failing the overview. */
    private async inbox_summary(orgs: OrgListItemVO[], token: string, seen_ms: number): Promise<NotifInboxSummaryData> {
        if (!this._inbox) return { new_count: 0, capped: false, latest: [], status: 'ok' };
        return best_effort(
            log, 'overview_inbox_failed',
            this._inbox.summary({ orgs, seen_ms }, token),
            { new_count: 0, capped: false, latest: [], status: 'error' } as NotifInboxSummaryData,
            { org_count: orgs.length },
        );
    }

    /**
     * The orgs to show: all memberships, or the requested subset of them.
     *
     * @throws ApiError 403 when an `org_ids` entry is not one of the caller's orgs.
     */
    private select_orgs(member_orgs: OrgListItemVO[], org_ids?: string[]): OrgListItemVO[] {
        // No filter → every org the caller belongs to.
        if (!org_ids || org_ids.length === 0) return member_orgs;

        const wanted = new Set(org_ids);
        const selected = member_orgs.filter((o) => wanted.has(o.id));
        // Asking for an org you are not in is a 403, never an empty success.
        if (selected.length !== wanted.size) {
            throw ApiError.forbidden('Not a member of one or more requested orgs');
        }
        return selected;
    }

    /** Both rollups for every org, at most {@link OverviewService.CONCURRENCY} orgs at a time. */
    private async fetch_all(orgs: OrgListItemVO[], token: string): Promise<SettledOrg[]> {
        const out: SettledOrg[] = new Array(orgs.length);
        let next = 0;
        // Simple worker pool: each worker pulls the next org index until none remain.
        const worker = async (): Promise<void> => {
            while (next < orgs.length) {
                const i = next++;
                const org = orgs[i];
                const [summary, realms] = await Promise.allSettled([
                    this._dashboard.summary({ org_id: org.id }, token),
                    this._dashboard.realms({ org_id: org.id }, token),
                ]);
                out[i] = { org, summary, realms };
            }
        };
        const workers = Math.min(OverviewService.CONCURRENCY, orgs.length);
        await Promise.all(Array.from({ length: workers }, () => worker()));
        return out;
    }

    /** One org card, or an `error` card when either rollup failed (logged at warn). */
    private to_org(s: SettledOrg): OverviewOrgData {
        for (const [key, r] of [['summary', s.summary], ['realms', s.realms]] as const) {
            if (r.status === 'rejected') log.warn('overview_org_rollup_failed', { org_id: s.org.id, section: key, ...error_fields(r.reason) });
        }
        // Both rollups are needed for a coherent card; report the first failure.
        if (s.summary.status === 'rejected') return to_overview_error_org_data(s.org, this.reason(s.summary.reason));
        if (s.realms.status === 'rejected') return to_overview_error_org_data(s.org, this.reason(s.realms.reason));
        return to_overview_org_data(s.org, s.summary.value, s.realms.value);
    }

    /** What the org card says about its failure. */
    private reason(err: unknown): string {
        // Surface Core's message when it is a structured API error; hide raw internals otherwise.
        if (err instanceof ApiError) return err.message;
        return 'Could not load rollups';
    }

    /** Newest first by `at`, capped at {@link OverviewService.MAX_ITEMS}. */
    private newest_first(items: OverviewItemData[]): OverviewItemData[] {
        // Items without a timestamp sink to the bottom; list is capped for the SPA.
        return [...items]
            .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
            .slice(0, OverviewService.MAX_ITEMS);
    }
}
