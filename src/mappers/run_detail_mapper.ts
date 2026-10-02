/** Run detail — Core run phases and reviews → run detail rows. */

import type { ControlRunPhaseVO, ControlReviewVO } from '../types/core/control.js';
import type { RunDetailPhaseData, RunDetailReviewData } from '../schemas/run_detail_types.js';
import { num_or_null } from './realm_inbox_mapper.js';

/** Run phase row (status, timing, error, agent). */
export function to_run_detail_phase_data(p: ControlRunPhaseVO): RunDetailPhaseData {
    return {
        phase: p.phase,
        status: p.status,
        sequence: num_or_null(p.sequence),
        started_at: num_or_null(p.started_at),
        completed_at: num_or_null(p.completed_at),
        error: p.error ?? null,
        agent: p.agent ?? null,
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
