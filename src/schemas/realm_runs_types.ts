/**
 * Realm › Runs — one page of a realm's runs plus the state-filter counts (request schema + response data).
 *
 * Routes (controllers/realm_runs_controller.ts):
 *   POST /v1/realm_runs/get
 *
 * BFF composition over Core: `/v1/realms/get_by_id { slug, org_slug }` → `/v1/runs/get` (page)
 * + `/v1/runs/get { limit: 1 }` per count (all, running, awaiting_input, failed 7d).
 */

import { z } from 'zod';
import type { ControlRealmData } from './realm_inbox_types.js';
import { RealmRefFields } from './realm_ref.js';
import { sort_fields } from './list_sort.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_runs/get */
export const RealmRunsGetInput = z.object({
    ...RealmRefFields,
    state: z.enum(['running', 'awaiting_input', 'failed', 'completed', 'cancelled']).optional()
        .describe('Only runs in this state (failed includes crashed)'),
    q: z.string().trim().min(1).max(200).optional()
        .describe('Match on run name, id, ticket or team'),
    since_ms: z.number().int().nonnegative().optional()
        .describe('Started at or after (unix ms)'),
    limit: z.number().int().min(1).max(100).optional()
        .describe('Page size (max 100)'),
    offset: z.number().int().min(0).optional()
        .describe('Zero-based page offset'),
    ...sort_fields(['run_name', 'state', 'team', 'started_at', 'last_updated_at'], 'default last_updated_at desc'),
}).strict();
export type RealmRunsGetInput = z.infer<typeof RealmRunsGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One run row. */
export interface RealmRunRowData {
    run_id: string;
    run_name: string | null;
    team: string | null;
    state: string;
    current_phase: string | null;
    daemon_id: string | null;
    started_at: number | null;
    completed_at: number | null;
    updated_at: number | null;
    error: string | null;
}

/** `realm_runs/get` — one page of runs plus the state-chip counts. */
export interface RealmRunsData {
    realm: ControlRealmData;
    items: RealmRunRowData[];
    total: number;
    offset: number;
    limit: number;
    /** Totals behind the state chips; null when that count failed. */
    counts: { all: number | null; running: number | null; awaiting_input: number | null; failed_7d: number | null };
    partial: boolean;
    /** `sort_by` keys Core applies (lib/core_list.ts). */
    sortable: string[];
}
