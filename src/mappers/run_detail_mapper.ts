/** Run detail — Core run phases, reviews, artifacts, phase outputs, lifecycle events and related runs → run detail rows. */

import type { ControlArtifactVO, ControlPhaseAttemptVO, ControlRunPhaseVO, ControlRunHistoryVO, ControlRunVO, ControlReviewVO } from '../types/core/control.js';
import type { InAppNotificationVO } from '../types/core/notifications.js';
import type {
    RunAttemptState, RunDetailArtifactData, RunDetailAttemptData, RunDetailChildData, RunDetailParentData,
    RunDetailPhaseAttemptData, RunDetailPhaseData, RunDetailPhaseOutputData, RunDetailReviewData,
} from '../schemas/run_detail_types.js';
import { num_or_null } from './realm_inbox_mapper.js';
import { to_phase_output_view } from '../lib/phase_output_view.js';

/** A timestamp (ms) that may arrive as a numeric string (BIGINT inside JSONB), else null. */
function ms(v: unknown): number | null {
    const n = typeof v === 'string' && v.trim() ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Run phase row (status, timing, error, agent, attempt history). */
export function to_run_detail_phase_data(p: ControlRunPhaseVO): RunDetailPhaseData {
    const started_at = num_or_null(p.started_at);
    const previous = Array.isArray(p.previous_attempts) ? p.previous_attempts.map(to_run_detail_phase_attempt_data) : [];
    return {
        phase: p.phase,
        status: p.status,
        sequence: num_or_null(p.sequence),
        started_at,
        completed_at: num_or_null(p.completed_at),
        error: p.error ?? null,
        agent: p.agent ?? null,
        attempts: previous.length + (started_at != null ? 1 : 0),
        previous_attempts: previous,
    };
}

/** One `previous_attempts` snapshot of a phase. */
export function to_run_detail_phase_attempt_data(a: ControlPhaseAttemptVO): RunDetailPhaseAttemptData {
    return {
        attempt: ms(a?.attempt),
        status: typeof a?.status === 'string' && a.status ? a.status : 'unknown',
        started_at: ms(a?.started_at) ?? ms(a?.dispatched_at),
        completed_at: ms(a?.completed_at),
        error: typeof a?.error === 'string' && a.error ? a.error : null,
    };
}

// ─── Attempts ───────────────────────────────────────────────────────────────

/** The lifecycle events the attempts are built from (`notifications/get { types }`). */
export const RUN_LIFECYCLE_EVENTS = ['run.started', 'run.resumed', 'run.completed', 'run.failed', 'run.crashed', 'run.cancelled'] as const;

const TERMINAL_EVENT: Record<string, RunAttemptState> = {
    'run.completed': 'completed',
    'run.failed': 'failed',
    'run.crashed': 'crashed',
    'run.cancelled': 'cancelled',
};

/** Two deliveries of one transition (daemon + Core, or a realm row + a per-user row) land this close together. */
const SAME_TRANSITION_MS = 5_000;

/** Run state → how its current attempt stands. */
export function to_attempt_state(state: string | null | undefined): RunAttemptState {
    if (state === 'completed' || state === 'failed' || state === 'crashed' || state === 'cancelled') return state;
    if (state === 'running' || state === 'awaiting_input') return 'running';
    return 'unknown';
}

function str_or_null(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Fills the last attempt from the run row: its state, end, failed phase and error. */
function settle_last(attempts: RunDetailAttemptData[], run: ControlRunVO): RunDetailAttemptData[] {
    const last = attempts[attempts.length - 1];
    if (!last) return attempts;
    const state = to_attempt_state(run.state);
    if (last.ended_at == null && state !== 'running') {
        last.state = state;
        last.ended_at = ms(run.completed_at);
    }
    if (last.state !== 'completed' && last.state !== 'running' && last.state !== 'unknown') {
        last.failed_phase ??= str_or_null(run.current_phase);
        last.error ??= str_or_null(run.error);
    }
    if (attempts[0] && attempts[0].started_at == null) attempts[0].started_at = ms(run.started_at);
    return attempts;
}

/**
 * The run's attempts from its lifecycle events, oldest first; [] when there are none.
 *
 * A resume reuses the run id: the run goes failed → running → completed. Each
 * `run.started` after a terminal event opens a new attempt (Core re-emits it on
 * resume); `run.resumed` (sent by the daemon, `payload.from_phase`) marks where it
 * started — the two are one attempt, in either order. Repeated deliveries of one
 * transition are dropped. The last attempt is settled against the run row.
 *
 * @param events - `notifications/get` rows for the run (any order).
 * @param run - The run row (state, started/completed, current phase, error).
 */
export function to_run_attempts_data(events: InAppNotificationVO[], run: ControlRunVO): RunDetailAttemptData[] {
    const types = new Set<string>(RUN_LIFECYCLE_EVENTS);
    const rows = events
        .filter((e) => types.has(e.event) && (!e.run_id || e.run_id === run.run_id) && ms(e.created_at) != null)
        .sort((a, b) => ms(a.created_at)! - ms(b.created_at)!);
    const attempts: RunDetailAttemptData[] = [];
    let cur: RunDetailAttemptData | null = null;
    let opened_by: 'started' | 'resumed' = 'started';
    const open = (at: number | null, from_phase: string | null, by: 'started' | 'resumed'): RunDetailAttemptData => {
        const a: RunDetailAttemptData = { n: attempts.length + 1, started_at: at, from_phase, ended_at: null, state: 'running', failed_phase: null, error: null, resumed_by: null };
        attempts.push(a);
        opened_by = by;
        return a;
    };

    for (const ev of rows) {
        const at = ms(ev.created_at)!;
        const payload = (ev.payload ?? {}) as Record<string, unknown>;
        if (ev.event === 'run.started') {
            // Still in an attempt: a re-register, a repeat delivery, or the start of a resume already opened.
            if (cur && cur.ended_at == null) continue;
            cur = open(at, null, 'started');
        } else if (ev.event === 'run.resumed') {
            const from = str_or_null(payload.from_phase) ?? str_or_null(ev.phase);
            if (cur && cur.ended_at == null) {
                // The run.started of this same resume came first: it is one attempt.
                if (opened_by === 'started' && cur.n > 1 && cur.from_phase == null) { cur.from_phase = from; opened_by = 'resumed'; continue; }
                if (opened_by === 'resumed' && cur.started_at != null && at - cur.started_at <= SAME_TRANSITION_MS) continue;
                // The previous attempt's end was not recorded.
                cur.ended_at = at;
                cur.state = 'unknown';
            }
            cur = open(at, from, 'resumed');
        } else {
            const state = TERMINAL_EVENT[ev.event]!;
            if (!cur) cur = open(null, null, 'started');
            // A second report of the same end (daemon + Core) — keep the first.
            if (cur.ended_at != null) continue;
            cur.ended_at = at;
            cur.state = state;
            if (state !== 'completed') {
                cur.failed_phase = str_or_null(ev.phase) ?? str_or_null(payload.phase);
                cur.error = str_or_null(payload.error);
            }
        }
    }
    if (attempts.length === 0) return [];
    // Live again after the last recorded end: a resume whose events are not visible.
    const last = attempts[attempts.length - 1]!;
    if (last.ended_at != null && to_attempt_state(run.state) === 'running') {
        attempts.push({ n: attempts.length + 1, started_at: null, from_phase: null, ended_at: null, state: 'running', failed_phase: null, error: null, resumed_by: null });
    }
    return settle_last(attempts, run);
}

/**
 * The run's attempts from its history (`runs/get_by_id { with_history }`): the same rules as
 * {@link to_run_attempts_data}, plus who asked for each resume (`run.resume_requested`).
 */
export function to_run_attempts_from_history(history: ControlRunHistoryVO[], run: ControlRunVO): RunDetailAttemptData[] {
    const as_events = history
        .filter((h) => h.type !== 'run.resume_requested')
        .map((h) => ({ event: h.type, run_id: run.run_id, phase: h.phase, created_at: h.at, payload: { from_phase: h.from_phase, error: h.error, phase: h.phase } }) as unknown as InAppNotificationVO);
    const attempts = to_run_attempts_data(as_events, run);
    const requests = history.filter((h) => h.type === 'run.resume_requested');
    for (const a of attempts) {
        if (a.n === 1) continue;
        const prev_end = attempts[a.n - 2]?.ended_at ?? 0;
        // The request between the previous attempt's end and this one's start (a little slack for clocks).
        const req = [...requests].reverse().find((r) => r.at >= prev_end - 1_000 && (a.started_at == null || r.at <= a.started_at + 5_000));
        if (!req) continue;
        a.resumed_by = req.actor ? { username: req.actor.username, display_name: req.actor.display_name } : null;
        a.from_phase ??= req.from_phase;
    }
    return attempts;
}

/** A phase snapshot status that means its attempt of the run ended there. */
const ENDED_STATUS: Record<string, RunAttemptState> = {
    failed: 'failed', error: 'failed', crashed: 'crashed', cancelled: 'cancelled',
    // Snapshotted while still running: the run stopped under it.
    running: 'unknown',
};

/** Ends of earlier run attempts this close together are one end (parallel phases failing together). */
const SAME_END_MS = 60_000;

/**
 * The run's attempts reconstructed from its phases when no lifecycle events are
 * visible. A resume marks the phases before its start `skipped`, and every rerun
 * phase keeps its earlier attempts in `previous_attempts`: each earlier attempt
 * that failed / was interrupted ends one run attempt. Only the latest resume
 * point is known, so earlier resumes have `from_phase: null`.
 *
 * @param phases - `runs/get_status` rows.
 * @param run - The run row.
 */
export function derive_run_attempts(phases: ControlRunPhaseVO[], run: ControlRunVO): RunDetailAttemptData[] {
    const sorted = [...phases].sort((a, b) => (num_or_null(a.sequence) ?? 0) - (num_or_null(b.sequence) ?? 0));
    const first_live = sorted.findIndex((p) => p.status !== 'skipped');
    const resumed = first_live > 0;
    if (!resumed) {
        return settle_last([{ n: 1, started_at: ms(run.started_at), from_phase: null, ended_at: null, state: 'running', failed_phase: null, error: null, resumed_by: null }], run);
    }
    const from = sorted[first_live]!;
    const ends: Array<{ at: number; state: RunAttemptState; phase: string; error: string | null }> = [];
    for (const p of sorted) {
        for (const a of Array.isArray(p.previous_attempts) ? p.previous_attempts : []) {
            const status = String(a?.status ?? '');
            const state = Object.hasOwn(ENDED_STATUS, status) ? ENDED_STATUS[status] : undefined;
            const at = ms(a?.completed_at) ?? ms(a?.started_at) ?? ms(a?.dispatched_at);
            if (state && at != null) ends.push({ at, state, phase: p.phase, error: str_or_null(a?.error) });
        }
    }
    ends.sort((a, b) => a.at - b.at);
    const merged = ends.filter((e, i) => i === 0 || e.at - ends[i - 1]!.at > SAME_END_MS);
    const attempts: RunDetailAttemptData[] = merged.length
        ? merged.map((e, i) => ({ n: i + 1, started_at: null, from_phase: null, ended_at: e.at, state: e.state, failed_phase: e.phase, error: e.error, resumed_by: null }))
        : [{ n: 1, started_at: null, from_phase: null, ended_at: null, state: 'unknown', failed_phase: null, error: null, resumed_by: null }];
    attempts.push({
        n: attempts.length + 1,
        started_at: ms(from.started_at),
        from_phase: from.phase,
        ended_at: null,
        state: 'running',
        failed_phase: null,
        error: null,
        resumed_by: null,
    });
    return settle_last(attempts, run);
}

// ─── Related runs ───────────────────────────────────────────────────────────

/** The run that spawned a sub-team run (`parent` null when the parent could not be read). */
export function to_run_detail_parent_data(
    run: ControlRunVO,
    parent: ControlRunVO | null,
    where: { realm_slug: string | null; org_slug: string | null },
): RunDetailParentData | null {
    const run_id = str_or_null(run.parent_run_id);
    if (!run_id) return null;
    return {
        run_id,
        run_name: str_or_null(parent?.run_name),
        phase: str_or_null(run.parent_phase),
        state: str_or_null(parent?.state),
        realm_slug: str_or_null(parent?.realm_slug) ?? where.realm_slug,
        org_slug: str_or_null(parent?.org_slug) ?? where.org_slug,
    };
}

/** A `runs/get { parent_run_id }` row → a child run link. */
export function to_run_detail_child_data(r: ControlRunVO): RunDetailChildData {
    return {
        run_id: r.run_id,
        run_name: str_or_null(r.run_name),
        team_label: str_or_null(r.team_label),
        parent_phase: str_or_null(r.parent_phase),
        state: r.state,
        started_at: ms(r.started_at),
        completed_at: ms(r.completed_at),
        realm_slug: str_or_null(r.realm_slug),
        org_slug: str_or_null(r.org_slug),
    };
}

/** Pending review on the run. */
export function to_run_detail_review_data(r: ControlReviewVO): RunDetailReviewData {
    return {
        id: r.review_id,
        title: r.title || 'Review requested',
        phase: r.phase ?? null,
        requested_at: num_or_null(r.requested_at),
        message: r.message ?? null,
    };
}

/** `artifacts/get` row → run page artifact (the expiring download link is dropped). */
export function to_run_detail_artifact_data(a: ControlArtifactVO): RunDetailArtifactData {
    const source = a.source === 'record' ? 'record' : 'file';
    return {
        artifact_id: String(a.artifact_id),
        source,
        kind: a.kind ?? (source === 'file' ? 'file' : 'output'),
        content_preview: a.content_preview ?? null,
        phase: a.phase ?? '',
        name: a.name ?? '',
        description: a.description ?? null,
        mime_type: a.mime_type ?? 'application/octet-stream',
        size_bytes: Number(a.size_bytes) || 0,
        created_at: typeof a.created_at === 'number' ? a.created_at : null,
    };
}

/**
 * A phase output record → its run page view, with the stored text kept raw.
 *
 * @param content - The record's whole text, or its preview when that is all there is.
 * @param complete - Whether `content` is the whole text.
 */
export function to_run_detail_phase_output_data(a: ControlArtifactVO, content: string, complete: boolean): RunDetailPhaseOutputData {
    return {
        artifact_id: String(a.artifact_id),
        phase: a.phase ?? '',
        created_at: typeof a.created_at === 'number' ? a.created_at : null,
        // A cut-off envelope is not valid JSON; only read a whole one.
        view: complete
            ? to_phase_output_view(content)
            : { ...to_phase_output_view(null), summary: 'Only the start of this output could be read — see Raw' },
        raw: content,
        complete,
    };
}

