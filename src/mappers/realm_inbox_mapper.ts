/** Realm inbox — Core realms, runs and Hugs → inbox items. */

import type { ControlHugVO, ControlRealmVO, ControlRunVO } from '../types/core/control.js';
import { ApiError } from '../errors/api_error.js';
import type { ControlRealmData, InboxItemData, InboxSectionStatusData } from '../schemas/realm_inbox_types.js';

/** A finite number, or null. */
export const num_or_null = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Realm header (name falls back to slug). */
export function to_control_realm_data(r: ControlRealmVO): ControlRealmData {
    return { id: r.id, slug: r.slug, name: r.name || r.slug, org_slug: r.org_slug ?? null };
}

/** Hug → inbox item (title falls back to the run name). */
export function to_inbox_hug_item(h: ControlHugVO): InboxItemData {
    return {
        kind: 'hug',
        id: h.hug_id,
        run_id: h.run_id ?? null,
        title: h.title || h.run_name || 'Input requested',
        team: h.team ?? null,
        phase: h.phase ?? null,
        state: h.status ?? 'open',
        at: num_or_null(h.created_at),
        error: null,
        expires_at: num_or_null(h.expires_at),
        responded: typeof h.responded === 'boolean' ? h.responded : null,
        origin: null,
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
        expires_at: null,
        responded: null,
        origin: typeof r.origin === 'string' ? r.origin : null,
    };
}

/** Settled read → section status (Core's message for ApiErrors, a generic one otherwise). */
export function to_section_data(r: PromiseSettledResult<unknown>): InboxSectionStatusData {
    if (r.status === 'fulfilled') return { status: 'ok', error: null };
    // Surface Core's message for structured errors; hide raw internals otherwise.
    return { status: 'error', error: r.reason instanceof ApiError ? r.reason.message : 'Could not load' };
}
