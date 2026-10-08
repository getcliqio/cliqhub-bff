/**
 * Run detail — one run with its phases, realm and pending reviews (request schema + response data).
 *
 * Routes (controllers/run_detail_controller.ts):
 *   POST /v1/run_detail/get
 *
 * BFF composition over Core: `/v1/runs/get_by_id` → `/v1/runs/get_status` + `/v1/runs/get { query }`
 * (labels) + `/v1/realms/get_by_id { realm_id }` + `/v1/reviews/get` (pending, for the run)
 * + `/v1/notifications/get { org_id, run_id, types }` (attempts) + `/v1/runs/get { parent_run_id }`
 * (children) + `/v1/runs/get_by_id` (parent, for a sub-team run).
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
    /** Times this phase ran in all: earlier attempts + the current one (0 when it never started). */
    attempts: number;
    /** Earlier attempts (gate route-backs and run resumes), oldest first. */
    previous_attempts: RunDetailPhaseAttemptData[];
}

/** One earlier attempt of a phase, as Core snapshotted it. */
export interface RunDetailPhaseAttemptData {
    attempt: number | null;
    status: string;
    started_at: number | null;
    completed_at: number | null;
    error: string | null;
}

/** How one attempt of the run ended (`running` while it is still going). */
export type RunAttemptState = 'completed' | 'failed' | 'crashed' | 'cancelled' | 'running' | 'unknown';

/**
 * One attempt of the run. A resume reuses the run id, so a run that failed and
 * was resumed has two attempts: the first ended `failed`, the second started
 * from `from_phase`.
 */
export interface RunDetailAttemptData {
    /** 1-based. */
    n: number;
    started_at: number | null;
    /** The phase a resume started from; null for the first attempt (or when not recorded). */
    from_phase: string | null;
    ended_at: number | null;
    state: RunAttemptState;
    /** The phase the attempt stopped at (failed / crashed / cancelled), when known. */
    failed_phase: string | null;
    error: string | null;
    /** Who asked for this resume (attempts after the first), when Core recorded it. */
    resumed_by: { username: string | null; display_name: string | null } | null;
}

/** The run (and phase) that spawned this sub-team run. */
export interface RunDetailParentData {
    run_id: string;
    run_name: string | null;
    phase: string | null;
    state: string | null;
    realm_slug: string | null;
    org_slug: string | null;
}

/** A sub-team (child) run one of this run's team phases spawned. */
export interface RunDetailChildData {
    run_id: string;
    run_name: string | null;
    team_label: string | null;
    /** The phase of this run that spawned it. */
    parent_phase: string | null;
    state: string;
    started_at: number | null;
    completed_at: number | null;
    realm_slug: string | null;
    org_slug: string | null;
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
export type RunDetailSectionKey = 'phases' | 'labels' | 'realm' | 'reviews' | 'artifacts' | 'events' | 'parent' | 'children';

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
    /**
     * The run's attempts, oldest first (one entry when it was never resumed).
     * Null when the run's events could not be read.
     */
    attempts: RunDetailAttemptData[] | null;
    /**
     * Where `attempts` came from: the run's lifecycle events (`notifications/get`),
     * or — when no events are visible to the caller — reconstructed from the
     * phases' attempt history (resume points known, intermediate ones may lack from_phase).
     */
    attempts_source: 'events' | 'phases' | null;
    /** Set when this run is a sub-team run. */
    parent: RunDetailParentData | null;
    /** The whole chain above a sub-team run, outermost first (the last one is `parent`); [] otherwise. */
    ancestors?: RunDetailParentData[];
    /** Sub-team runs this run's team phases spawned, oldest first. */
    children: RunDetailChildData[];
    /** Why a failed / crashed / cancelled run stopped; null for any other state or when it can't be worked out. */
    failure?: RunFailureData | null;
    sections: Record<RunDetailSectionKey, InboxSectionStatusData>;
    partial: boolean;
}

/** Why a run stopped, in words a person can act on. */
export type RunFailureReason =
    | 'review_timed_out' | 'review_rejected' | 'review_escalated' | 'gate_exhausted'
    | 'permission' | 'agent_crashed' | 'agent_error' | 'timed_out' | 'missing_setup'
    | 'cancelled' | 'daemon_crashed' | 'unknown';

/** One hop from the run down to where it actually failed (a sub-team run, then its phase). */
export interface RunFailureStepData {
    run_id: string;
    run_name: string | null;
    /** `@scope/name` of that run's team. */
    team: string | null;
    /** The phase of this run that failed (for a hop into a sub-team: the phase that started it). */
    phase: string | null;
}

/** One person (or channel) a failed review went to, and what they answered. */
export interface RunFailureReviewerData {
    name: string;
    /** PASS / REJECT / ROUTE:… ; null when they didn't answer. */
    action: string | null;
    responded_at: string | null;
    comment: string | null;
}

/** The review a run failed on. */
export interface RunFailureReviewData {
    review_id: string;
    status: string | null;
    /** `any` — one answer decides; `all` — everyone must approve. */
    policy: 'any' | 'all' | null;
    reviewers: RunFailureReviewerData[];
    /** Phases a reject sends the work back to. */
    route_targets: string[];
}

/** Why a run failed: the reason, where (through sub-teams), what to do next. */
export interface RunFailureData {
    reason: RunFailureReason;
    /** One line, e.g. "Review timed out after 30m with no decision". */
    summary: string;
    /** The failing step's own error, as recorded. */
    detail: string | null;
    /** A next step for reasons with a known fix (reconnect, install the agent, …). */
    hint: string | null;
    /** The run first, then each sub-team down to the failing one; the last hop's `phase` failed. */
    chain: RunFailureStepData[];
    /** The phase to resume the failing run from (a review's route-back target, else the failed phase). */
    resume_from: string | null;
    review: RunFailureReviewData | null;
}
