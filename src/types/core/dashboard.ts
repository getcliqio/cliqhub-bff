/**
 * Dashboard rollups — `/internal/dashboard/summary` and `/internal/dashboard/realms` (flat bodies).
 * Only the fields the BFF overview composes are typed; Core sends more.
 */

import type { ControlHugVO } from './control.js';

/** A live / recent run in the summary. */
export interface DashboardRunVO {
    run_id: string;
    run_name?: string | null;
    state: string;
    team_id?: string | null;
    team_label?: string | null;
    daemon_id?: string | null;
    realm_id?: string | null;
    realm_slug?: string | null;
    started_at?: number | null;
    completed_at?: number | null;
}

/** An open Hug in the summary (Core caps the list at 5). */
export type DashboardHugVO = ControlHugVO;

/** `dashboard/summary` — org counts plus live runs and open Hugs. */
export interface DashboardSummaryVO {
    counts?: {
        active_runs?: number;
        awaiting_input?: number;
        failed_24h?: number;
        completed_24h?: number;
        daemons_online?: number;
        daemons_stale?: number;
        daemons_offline?: number;
        daemons_total?: number;
        open_hugs?: number;
        realms?: number;
    };
    live_runs?: DashboardRunVO[];
    open_hugs?: DashboardHugVO[];
    /** The org's most recent runs, any state (Core caps the list at 10). */
    recent_runs?: DashboardRunVO[];
}

/** Per-realm rollup in `dashboard/realms`. */
export interface DashboardRealmVO {
    id: string;
    slug: string;
    org_slug?: string | null;
    name: string;
    last_activity_at?: number | null;
    daemons?: { online?: number; stale?: number; offline?: number; total?: number };
    runs?: { active?: number; awaiting_input?: number };
    open_hugs?: number;
    recent_notifications?: number;
    /** The caller's level in this realm (Core API 6+). */
    level?: 'view' | 'operate' | 'admin';
}

/** `dashboard/realms` — every realm of the org with its rollup. */
export interface DashboardRealmsVO {
    realms?: DashboardRealmVO[];
}

/** Body of both dashboard reads — the rollups are org-scoped. */
export interface DashboardOrgInput {
    org_id: string;
}
