/**
 * Realm › Daemon / Workspace pages — Core rows → page rows.
 * Rows arrive loosely typed (daemon RPC replies, several Core versions), so
 * the mappers take plain objects and coerce.
 */

import type {
    HostInstallableTeamData, HostRunData, HostTeamData, HostWorkspaceData,
} from '../schemas/host_page_types.js';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? v as Obj : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };

/** Scope from a `@scope/name` label (fallback for Cores before API 5, which sent `scope: null`). */
function scope_of_label(label: unknown): string | null {
    const m = typeof label === 'string' ? /^@([^/]+)\//.exec(label) : null;
    return m ? m[1] : null;
}

/** A daemon's team (teams/get `{ daemon_id }` item) or a workspace team. */
export function to_host_team_data(t: Obj): HostTeamData {
    return {
        team_id: str(t.team_id) ?? str(t.id),
        scope: str(t.scope) ?? str(t.scope_slug) ?? '',
        slug: str(t.slug) ?? str(t.name) ?? '',
        version: str(t.version) ?? str(t.latest_version),
    };
}

/**
 * A realm roster team (teams/get `{ realm_id }` item). `id` is the catalog
 * team id (published teams) — what teams/install takes; `sample_team_id` (a
 * daemon's copy, also accepted by install) is the fallback for older Cores.
 * Null when neither is known: a never-published team nothing can install.
 */
export function to_host_installable_team_data(t: Obj): HostInstallableTeamData | null {
    const team_id = str(t.id) ?? str(t.sample_team_id);
    if (!team_id) return null;
    return {
        team_id,
        scope: str(t.scope) ?? scope_of_label(t.label) ?? '',
        slug: str(t.slug) ?? str(t.name) ?? '',
        version: str(t.latest_version) ?? str(t.version),
    };
}

/** Workspace row (Core or daemon RPC shape) → workspace with `@scope/slug` team labels and last-run state. */
export function to_host_workspace_data(w: Obj): HostWorkspaceData {
    return {
        id: String(w.workspace_id ?? w.id ?? ''), name: str(w.name), path: String(w.workspace_dir ?? w.path ?? ''),
        teams: (Array.isArray(w.teams) ? w.teams : []).map((t) => { const o = obj(t); return o.scope && o.slug ? `@${o.scope}/${o.slug}` : String(t); }),
        active_runs: num(w.active_runs) ?? 0, last_run_state: str(obj(w.last_run).state) ?? str(w.last_run_state), last_run_at: num(obj(w.last_run).started_at) ?? num(w.last_run_at),
    };
}

/** Run row → host page run. */
export function to_host_run_data(r: Obj): HostRunData {
    return {
        run_id: String(r.run_id ?? ''), run_name: str(r.run_name), state: String(r.state ?? ''),
        team: str(r.team_label) ?? str(r.team_id), phase: str(r.current_phase),
        started_at: num(r.started_at), completed_at: num(r.completed_at), last_updated_at: num(r.last_updated_at),
    };
}
