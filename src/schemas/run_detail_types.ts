/**
 * Run detail — one run with its phases, realm and pending reviews (request schema + response data).
 *
 * Routes (controllers/run_detail_controller.ts):
 *   POST /v1/run_detail/get
 *
 * BFF composition over Core: `/v1/runs/get_by_id` → `/v1/runs/get_status` + `/v1/runs/get { query }`
 * (labels) + `/v1/realms/get_by_id { realm_id }` + `/v1/reviews/get` (pending, for the run).
 */

import { z } from 'zod';
import type { InboxSectionStatusData } from './realm_inbox_types.js';
import type { ControlRealmData } from './realm_inbox_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/run_detail/get */
export const RunDetailGetInput = z.object({
    run_id: z.string().trim().min(1).max(200)
        .describe('Run id'),
}).strict();
export type RunDetailGetInput = z.infer<typeof RunDetailGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One phase of the run. */
export interface RunDetailPhaseData {
    phase: string;
    status: string;
    sequence: number | null;
    started_at: number | null;
    completed_at: number | null;
    error: string | null;
    agent: string | null;
}

/** A pending review on the run. */
export interface RunDetailReviewData {
    id: string;
    title: string;
    phase: string | null;
    requested_at: number | null;
    message: string | null;
}

/** A file the run stored; downloads go through `artifacts/get_by_id` (fresh link). */
export interface RunDetailArtifactData {
    artifact_id: string;
    phase: string;
    name: string;
    description: string | null;
    mime_type: string;
    size_bytes: number;
    created_at: number | null;
}

/** Sections of the run page that load (and can fail) independently. */
export type RunDetailSectionKey = 'phases' | 'labels' | 'realm' | 'reviews' | 'artifacts';

/** `run_detail/get` — the run, its phases, realm and pending reviews, with per-section status. */
export interface RunDetailData {
    /** Core run row (get_by_id, with detail enrichment) + team_label/workspace_name from the list read. */
    run: Record<string, unknown> & { run_id: string; state: string };
    phases: RunDetailPhaseData[];
    realm: ControlRealmData | null;
    /** Pending human reviews attached to this run. */
    reviews: RunDetailReviewData[];
    /** Files the run stored (empty when none). */
    artifacts: RunDetailArtifactData[];
    sections: Record<RunDetailSectionKey, InboxSectionStatusData>;
    partial: boolean;
}
