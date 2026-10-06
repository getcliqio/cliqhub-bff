/** Run detail — Core run phases, reviews, artifacts and phase outputs → run detail rows. */

import type { ControlArtifactVO, ControlRunPhaseVO, ControlReviewVO } from '../types/core/control.js';
import type { RunDetailArtifactData, RunDetailPhaseData, RunDetailPhaseOutputData, RunDetailReviewData } from '../schemas/run_detail_types.js';
import { num_or_null } from './realm_inbox_mapper.js';
import { to_phase_output_view } from '../lib/phase_output_view.js';

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

