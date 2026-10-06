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
    /** A stored file (download) or a run record (text, read inline). */
    source: 'file' | 'record';
    /** 'file', or the record kind (output, chat_transcript, review, …). */
    kind: string;
    /** First ~2 KB of a record; null for a file. */
    content_preview: string | null;
    phase: string;
    name: string;
    description: string | null;
    mime_type: string;
    size_bytes: number;
    created_at: number | null;
}

/** One command an exec phase ran. */
export interface PhaseOutputCommandData {
    /** Readable label (shell noise like `set -e` dropped). */
    label: string;
    /** The command as recorded (Core keeps its first ~40 characters). */
    command: string;
    pass: boolean;
    exit_code: number | null;
    duration_ms: number | null;
}

/** A source a tool phase read or wrote (Jira issue tree, scope file, …). */
export interface PhaseOutputSourceData {
    name: string;
    detail: string | null;
    /** Link to it (http/https only). */
    url: string | null;
}

/** One phase of a sub-team a phase ran. */
export interface PhaseOutputSubPhaseData {
    phase: string;
    /** Passed / failed when known, else null. */
    ok: boolean | null;
    summary: string;
}

/** How a phase's output is shown: a summary line plus the parts that apply. */
export interface PhaseOutputView {
    kind: 'commands' | 'tool' | 'agent' | 'verdict' | 'sub_team' | 'text';
    /** One line for the collapsed phase row. */
    summary: string;
    /** The answer / tool lines, as markdown. */
    body_markdown: string | null;
    /** The agent's "I'll …" narration before its answer. */
    steps: string[];
    verdict: { outcome: string; reason: string | null } | null;
    commands: { total: number; failed: number; items: PhaseOutputCommandData[] } | null;
    sources: PhaseOutputSourceData[];
    sub_run: { run_id: string; team_ref: string | null; phases: PhaseOutputSubPhaseData[] } | null;
}

/** A phase's recorded output: the view, plus the stored text exactly as kept. */
export interface RunDetailPhaseOutputData {
    artifact_id: string;
    phase: string;
    created_at: number | null;
    view: PhaseOutputView;
    /** The stored output, complete and unmodified (for checking the view). */
    raw: string;
    /** False when only the first part could be read (raw is then that part). */
    complete: boolean;
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
    /** Files the run stored and its run records (empty when none). */
    artifacts: RunDetailArtifactData[];
    /** Each phase output (`kind: output` records), oldest first, read for display. */
    phase_outputs: RunDetailPhaseOutputData[];
    sections: Record<RunDetailSectionKey, InboxSectionStatusData>;
    partial: boolean;
}
