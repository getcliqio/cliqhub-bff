import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { OrgListItemVO, DashboardRealmsVO, DashboardSummaryVO } from '../types/vo.js';
import type { NotifInboxSummaryDTO, OverviewDTO, OverviewItemDTO, OverviewOrgDTO } from '../types/dto.js';
import type { InboxService } from './inbox_service.js';
import { ApiError } from '../repositories/api_error.js';
import {
    to_overview_org_dto,
    to_overview_error_org_dto,
    to_overview_review_items,
    to_overview_run_items,
    sum_overview_counts,
} from '../types/mappers.js';

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

    private _orgs: OrgsRepository;
    private _dashboard: DashboardRepository;
    private _inbox: InboxService | null;

    constructor(orgs: OrgsRepository, dashboard: DashboardRepository, inbox: InboxService | null = null) {
        this._orgs = orgs;
        this._dashboard = dashboard;
        this._inbox = inbox;
    }

    async get(token: string, params: { org_ids?: string[]; inbox_seen_ms?: number } = {}): Promise<OverviewDTO> {
        // Membership SoT — Core returns only orgs the bearer belongs to.
        const { orgs: member_orgs } = await this._orgs.get(token, { mine: true });

        // Optional filter is intersected with membership; unknown ids are an error, not a silent widen.
        const selected = this.select_orgs(member_orgs, params.org_ids);

        // Per-org fan-out with bounded concurrency; one org failing must not blank the page.
        // Bell summary runs alongside the rollups; its failure never fails the overview.
        const [settled, inbox] = await Promise.all([
            this.fetch_all(selected, token),
            this.inbox_summary(token, selected, params.inbox_seen_ms ?? 0),
        ]);

        const orgs: OverviewOrgDTO[] = settled.map((s) => this.to_org(s));
        const ok_orgs = orgs.filter((o) => o.status === 'ok');

        // Merge actionable + live items across orgs, tagging each with org/realm context.
        const needs_you: OverviewItemDTO[] = [];
        const live_runs: OverviewItemDTO[] = [];
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

    private async inbox_summary(token: string, orgs: OrgListItemVO[], seen_ms: number): Promise<NotifInboxSummaryDTO> {
        if (!this._inbox) return { new_count: 0, capped: false, latest: [], status: 'ok' };
        try {
            return await this._inbox.summary(token, orgs, seen_ms);
        } catch {
            return { new_count: 0, capped: false, latest: [], status: 'error' };
        }
    }

    private select_orgs(member_orgs: OrgListItemVO[], org_ids?: string[]): OrgListItemVO[] {
        // No filter → every org the caller belongs to.
        if (!org_ids || org_ids.length === 0) return member_orgs;

        const wanted = new Set(org_ids);
        const selected = member_orgs.filter((o) => wanted.has(o.id));
        // Asking for an org you are not in is a 403, never an empty success.
        if (selected.length !== wanted.size) {
            throw new ApiError('forbidden', 'Not a member of one or more requested orgs', 403);
        }
        return selected;
    }

    private async fetch_all(orgs: OrgListItemVO[], token: string): Promise<SettledOrg[]> {
        const out: SettledOrg[] = new Array(orgs.length);
        let next = 0;
        // Simple worker pool: each worker pulls the next org index until none remain.
        const worker = async (): Promise<void> => {
            while (next < orgs.length) {
                const i = next++;
                const org = orgs[i];
                const [summary, realms] = await Promise.allSettled([
                    this._dashboard.summary(org.id, token),
                    this._dashboard.realms(org.id, token),
                ]);
                out[i] = { org, summary, realms };
            }
        };
        const workers = Math.min(OverviewService.CONCURRENCY, orgs.length);
        await Promise.all(Array.from({ length: workers }, () => worker()));
        return out;
    }

    private to_org(s: SettledOrg): OverviewOrgDTO {
        // Both rollups are needed for a coherent card; report the first failure.
        if (s.summary.status === 'rejected') return to_overview_error_org_dto(s.org, this.reason(s.summary.reason));
        if (s.realms.status === 'rejected') return to_overview_error_org_dto(s.org, this.reason(s.realms.reason));
        return to_overview_org_dto(s.org, s.summary.value, s.realms.value);
    }

    private reason(err: unknown): string {
        // Surface Core's message when it is a structured API error; hide raw internals otherwise.
        if (err instanceof ApiError) return err.message;
        return 'Could not load rollups';
    }

    private newest_first(items: OverviewItemDTO[]): OverviewItemDTO[] {
        // Items without a timestamp sink to the bottom; list is capped for the SPA.
        return [...items]
            .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
            .slice(0, OverviewService.MAX_ITEMS);
    }
}
