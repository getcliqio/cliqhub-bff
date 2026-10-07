/**
 * Overview — the cross-org start view of the signed-in user (request schema + response data).
 *
 * Routes (controllers/overview_controller.ts):
 *   POST /v1/overview/get — every org's counts, realms and what needs the user
 *
 * BFF composition over Core: `/v1/orgs/get { mine }` → per org
 * `/internal/dashboard/summary` + `/internal/dashboard/realms`; the inbox summary.
 */

import { z } from 'zod';
import type { NotifInboxSummaryData } from './inbox_types.js';
import type { OrgStatus } from './orgs_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/overview/get */
export const OverviewGetInput = z.object({
    org_ids: z.array(z.string().uuid()).min(1).max(50).optional()
        .describe('Only these orgs (the caller must belong to them); all when omitted'),
    inbox_seen_ms: z.number().int().nonnegative().optional()
        .describe('When the user last opened the inbox (unix ms); drives the bell count'),
}).strict();
export type OverviewGetInput = z.infer<typeof OverviewGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** Counts shown on an org card and in the overview totals. */
export interface OverviewCountsData {
    /** Pending HUG reviews + runs awaiting input. */
    needs_you: number;
    pending_reviews: number;
    awaiting_input: number;
    active_runs: number;
    failed_24h: number;
    completed_24h: number;
    daemons_online: number;
    daemons_total: number;
}

/** One realm on an org card. */
export interface OverviewRealmData {
    id: string;
    slug: string;
    name: string;
    org_id: string;
    org_slug: string;
    last_activity_at: number | null;
    daemons: { online: number; stale: number; offline: number; total: number };
    active_runs: number;
    awaiting_input: number;
    pending_reviews: number;
    /** pending_reviews + awaiting_input */
    needs_you: number;
}

/** One org card (`status: 'error'` when its rollups failed). */
export interface OverviewOrgData {
    id: string;
    slug: string;
    display_name: string;
    /** Caller's role in this org (owner / admin / operator / member / custom). */
    role: string;
    /** The org's lifecycle state (`waiting_for_owner` until its owner accepts). */
    org_status: OrgStatus;
    /** `error` when this org's rollups could not be loaded; the rest of the overview still renders. */
    status: 'ok' | 'error';
    error: string | null;
    counts: OverviewCountsData;
    realms: OverviewRealmData[];
}

/** A "needs you" or live-run item, with link targets. */
export interface OverviewItemData {
    kind: 'review' | 'input' | 'run';
    id: string;
    title: string;
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
    run_id: string | null;
    team: string | null;
    phase: string | null;
    state: string | null;
    at: number | null;
}

/** `overview/get` — org cards, totals, merged item lists and the bell summary. */
export interface OverviewData {
    orgs: OverviewOrgData[];
    totals: OverviewCountsData & { orgs: number; realms: number };
    /** Merged across orgs, newest first — reviews + runs awaiting input. */
    needs_you: OverviewItemData[];
    /** Merged across orgs, newest first — running runs. */
    live_runs: OverviewItemData[];
    /** Merged across orgs, most recently finished first — completed / failed / cancelled runs. */
    recent_runs: OverviewItemData[];
    /** True when at least one org failed to load. */
    partial: boolean;
    /** Bell: newest in-app notifications across the same orgs. */
    inbox: NotifInboxSummaryData;
}
