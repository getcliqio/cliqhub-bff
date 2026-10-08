/** Realm › Runs — Core run rows → run list rows. */

import type { ControlRunVO } from '../types/core/control.js';
import type { RealmRunRowData } from '../schemas/realm_runs_types.js';

/** One Core run → a run list row (also used by the team page). */
export function to_run_row(r: ControlRunVO): RealmRunRowData {
    return {
        run_id: r.run_id,
        run_name: r.run_name ?? null,
        team: r.team_label ?? r.team_id ?? null,
        state: r.state,
        current_phase: r.current_phase ?? null,
        daemon_id: r.daemon_id ?? null,
        started_at: r.started_at ?? null,
        completed_at: r.completed_at ?? null,
        updated_at: r.last_updated_at ?? null,
        error: r.error ?? null,
        parent: r.parent_run_id ? { run_id: r.parent_run_id, run_name: null, phase: r.parent_phase ?? null } : null,
    };
}
