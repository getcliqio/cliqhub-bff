/** Realm inbox — Core realms, runs and reviews → inbox items. */

import type { ControlRealmVO, ControlRunVO, ControlReviewVO } from '../types/core/control.js';
import { ApiError } from '../errors/api_error.js';
import type { ControlRealmData, InboxItemData, InboxSectionStatusData } from '../schemas/realm_inbox_types.js';

/** A finite number, or null. */
export const num_or_null = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Realm header (name falls back to slug). */
export function to_control_realm_data(r: ControlRealmVO): ControlRealmData {
    return { id: r.id, slug: r.slug, name: r.name || r.slug, org_slug: r.org_slug ?? null };
}

/** Review → inbox item (title falls back to the run name). */
export function to_inbox_review_item(r: ControlReviewVO): InboxItemData {
    return {
        kind: 'review',
        id: r.review_id,
        run_id: r.run_id ?? null,
        title: r.title || r.run_name || 'Review requested',
        team: r.team ?? null,
        phase: r.phase ?? null,
        state: r.status ?? 'pending',
        at: num_or_null(r.requested_at),
        error: null,
        message: r.message ?? null,
        artifact_count: num_or_null(r.artifact_count),
    };
}

/** Run → inbox item of the given kind; `at` is when it failed (failed) or last moved (others). */
export function to_inbox_run_item(r: ControlRunVO, kind: 'input' | 'failed' | 'run'): InboxItemData {
    // Failures sort by when they ended; live/awaiting by last movement.
    const at = kind === 'failed'
        ? num_or_null(r.completed_at) ?? num_or_null(r.last_updated_at) ?? num_or_null(r.started_at)
        : num_or_null(r.last_updated_at) ?? num_or_null(r.started_at);
    return {
        kind,
        id: r.run_id,
        run_id: r.run_id,
        title: r.run_name || r.team_label || r.run_id,
        team: r.team_label ?? r.team_id ?? null,
        phase: r.current_phase ?? null,
        state: r.state,
        at,
        error: r.error ?? null,
        message: null,
        artifact_count: null,
    };
}

/** Settled read → section status (Core's message for ApiErrors, a generic one otherwise). */
export function to_section_data(r: PromiseSettledResult<unknown>): InboxSectionStatusData {
    if (r.status === 'fulfilled') return { status: 'ok', error: null };
    // Surface Core's message for structured errors; hide raw internals otherwise.
    return { status: 'error', error: r.reason instanceof ApiError ? r.reason.message : 'Could not load' };
}
