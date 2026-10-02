/** Overview — Core org list + dashboard rollups → overview data (cards, counts, items). */

import type { OrgListItemVO } from '../types/core/orgs.js';
import type { DashboardRealmVO, DashboardRealmsVO, DashboardSummaryVO, DashboardReviewVO, DashboardRunVO } from '../types/core/dashboard.js';
import type { OverviewCountsData, OverviewRealmData, OverviewOrgData, OverviewItemData } from '../schemas/overview_types.js';

/** A finite number, or 0. */
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** All-zero counts (an org that failed to load, the base for sums). */
export function empty_overview_counts(): OverviewCountsData {
    return { needs_you: 0, pending_reviews: 0, awaiting_input: 0, active_runs: 0, failed_24h: 0, completed_24h: 0, daemons_online: 0, daemons_total: 0 };
}

/** Field-wise sum of org counts (the overview totals). */
export function sum_overview_counts(list: OverviewCountsData[]): OverviewCountsData {
    const out = empty_overview_counts();
    for (const c of list) {
        for (const k of Object.keys(out) as Array<keyof OverviewCountsData>) out[k] += c[k];
    }
    return out;
}

/** Dashboard realm rollup → realm card; `needs_you` = pending reviews + runs awaiting input. */
export function to_overview_realm_data(org: OrgListItemVO, vo: DashboardRealmVO): OverviewRealmData {
    const pending = n(vo.pending_reviews);
    const awaiting = n(vo.runs?.awaiting_input);
    return {
        id: vo.id,
        slug: vo.slug,
        name: vo.name || vo.slug,
        org_id: org.id,
        org_slug: vo.org_slug || org.slug,
        last_activity_at: typeof vo.last_activity_at === 'number' ? vo.last_activity_at : null,
        daemons: { online: n(vo.daemons?.online), stale: n(vo.daemons?.stale), offline: n(vo.daemons?.offline), total: n(vo.daemons?.total) },
        active_runs: n(vo.runs?.active),
        awaiting_input: awaiting,
        pending_reviews: pending,
        needs_you: pending + awaiting,
    };
}

/**
 * Org card counts. `pending_reviews` is summed from the per-realm rollup
 * (the summary's own review list is capped at 5); everything else comes
 * from the summary counts.
 */
export function to_overview_org_data(org: OrgListItemVO, summary: DashboardSummaryVO, realms_vo: DashboardRealmsVO): OverviewOrgData {
    const realms = (realms_vo.realms ?? []).map((r) => to_overview_realm_data(org, r));
    const c = summary.counts ?? {};
    const pending_reviews = realms.reduce((sum, r) => sum + r.pending_reviews, 0);
    const awaiting_input = n(c.awaiting_input);
    return {
        id: org.id,
        slug: org.slug,
        display_name: org.display_name || org.slug,
        role: org.role,
        org_status: org.status,
        status: 'ok',
        error: null,
        counts: {
            needs_you: pending_reviews + awaiting_input,
            pending_reviews,
            awaiting_input,
            active_runs: n(c.active_runs),
            failed_24h: n(c.failed_24h),
            completed_24h: n(c.completed_24h),
            daemons_online: n(c.daemons_online),
            daemons_total: n(c.daemons_total),
        },
        realms: [...realms].sort((a, b) => (b.last_activity_at ?? 0) - (a.last_activity_at ?? 0)),
    };
}

/** Org card for an org whose dashboard failed: `status: 'error'`, zero counts, no realms. */
export function to_overview_error_org_data(org: OrgListItemVO, message: string): OverviewOrgData {
    return {
        id: org.id,
        slug: org.slug,
        display_name: org.display_name || org.slug,
        role: org.role,
        org_status: org.status,
        status: 'error',
        error: message,
        counts: empty_overview_counts(),
        realms: [],
    };
}

/** Pending reviews of an org → "needs you" items (non-pending ones dropped). */
export function to_overview_review_items(org: OrgListItemVO, reviews: DashboardReviewVO[]): OverviewItemData[] {
    return reviews
        .filter((r) => (r.status ?? 'pending') === 'pending')
        .map((r) => ({
            kind: 'review' as const,
            id: r.review_id,
            title: r.title || (r.phase ? `Review ${r.phase}` : 'Review requested'),
            org_id: org.id,
            org_slug: r.org_slug || org.slug,
            realm_id: r.realm_id || null,
            realm_slug: r.realm_slug ?? null,
            run_id: r.run_id ?? null,
            team: r.team ?? null,
            phase: r.phase ?? null,
            state: 'pending',
            at: typeof r.requested_at === 'number' ? r.requested_at : null,
        }));
}

/** Org runs → items; `awaiting_input` runs become `input` items, the rest `run`. */
export function to_overview_run_items(org: OrgListItemVO, runs: DashboardRunVO[]): OverviewItemData[] {
    return runs.map((r) => ({
        kind: r.state === 'awaiting_input' ? ('input' as const) : ('run' as const),
        id: r.run_id,
        title: r.run_name || r.team_label || r.run_id,
        org_id: org.id,
        org_slug: org.slug,
        realm_id: r.realm_id ?? null,
        realm_slug: r.realm_slug ?? null,
        run_id: r.run_id,
        team: r.team_label ?? null,
        phase: null,
        state: r.state,
        at: typeof r.started_at === 'number' ? r.started_at : null,
    }));
}

