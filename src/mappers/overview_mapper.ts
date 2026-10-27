/** Overview — Core org list + dashboard rollups → overview data (cards, counts, items). */

import type { OrgListItemVO } from '../types/core/orgs.js';
import type { DashboardRealmVO, DashboardRealmsVO, DashboardSummaryVO, DashboardHugVO, DashboardRunVO } from '../types/core/dashboard.js';
import type { OverviewCountsData, OverviewRealmData, OverviewOrgData, OverviewItemData } from '../schemas/overview_types.js';

/** A finite number, or 0. */
const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** All-zero counts (an org that failed to load, the base for sums). */
export function empty_overview_counts(): OverviewCountsData {
    return { needs_you: 0, open_hugs: 0, awaiting_input: 0, active_runs: 0, failed_24h: 0, completed_24h: 0, daemons_online: 0, daemons_total: 0 };
}

/** Field-wise sum of org counts (the overview totals). */
export function sum_overview_counts(list: OverviewCountsData[]): OverviewCountsData {
    const out = empty_overview_counts();
    for (const c of list) {
        for (const k of Object.keys(out) as Array<keyof OverviewCountsData>) out[k] += c[k];
    }
    return out;
}

/**
 * Dashboard realm rollup → realm card; `needs_you` = open Hugs that reached the caller (a run
 * awaiting input is waiting on one, so it isn't counted again).
 */
export function to_overview_realm_data(org: OrgListItemVO, vo: DashboardRealmVO): OverviewRealmData {
    const open_hugs = n(vo.open_hugs);
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
        open_hugs,
        needs_you: open_hugs,
        level: vo.level ?? null,
    };
}

/**
 * Org card counts. `open_hugs` is summed from the per-realm rollup
 * (the summary's own Hug list is capped at 5); everything else comes
 * from the summary counts.
 */
export function to_overview_org_data(org: OrgListItemVO, summary: DashboardSummaryVO, realms_vo: DashboardRealmsVO): OverviewOrgData {
    const realms = (realms_vo.realms ?? []).map((r) => to_overview_realm_data(org, r));
    const c = summary.counts ?? {};
    const open_hugs = realms.reduce((sum, r) => sum + r.open_hugs, 0);
    const awaiting_input = n(c.awaiting_input);
    return {
        id: org.id,
        slug: org.slug,
        display_name: org.display_name || org.slug,
        role: org.role,
        permissions: org.permissions ?? null,
        org_status: org.status,
        status: 'ok',
        error: null,
        counts: {
            needs_you: open_hugs,
            open_hugs,
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
        permissions: org.permissions ?? null,
        org_status: org.status,
        status: 'error',
        error: message,
        counts: empty_overview_counts(),
        realms: [],
    };
}

/** Open Hugs of an org that the caller hasn't answered → "needs you" items. */
export function to_overview_hug_items(org: OrgListItemVO, hugs: DashboardHugVO[]): OverviewItemData[] {
    return hugs
        .filter((h) => (h.status ?? 'open') === 'open' && !h.responded)
        .map((h) => ({
            kind: 'hug' as const,
            id: h.hug_id,
            title: h.title || (h.phase ? `Input for ${h.phase}` : 'Input requested'),
            org_id: org.id,
            org_slug: h.org_slug || org.slug,
            realm_id: h.realm_id || null,
            realm_slug: h.realm_slug ?? null,
            run_id: h.run_id ?? null,
            team: h.team ?? null,
            phase: h.phase ?? null,
            state: 'open',
            at: typeof h.created_at === 'number' ? h.created_at : null,
        }));
}

/** Run states that mean the run is over. */
export const FINISHED_RUN_STATES = new Set(['completed', 'failed', 'crashed', 'cancelled']);

/**
 * Finished runs for the dashboard: `at` is when the run ended (start time when
 * Core has no end time).
 */
export function to_overview_recent_items(org: OrgListItemVO, runs: DashboardRunVO[]): OverviewItemData[] {
    const finished = runs.filter((r) => FINISHED_RUN_STATES.has(r.state));
    return to_overview_run_items(org, finished)
        .map((item, i) => ({ ...item, at: finished[i]!.completed_at ?? item.at }));
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

