/**
 * Realm › Daemon and Realm › Workspace pages — one BFF read each.
 * Core routes (all existing): realms/get_by_id (realm gate), daemons/get_by_id,
 * teams/get {daemon_id} (live installed teams) and {realm_id} (roster to
 * install from), workspaces/get {daemon_id}, workspaces/get_by_id, runs/get.
 * Everything but the realm and the daemon / workspace itself is best-effort:
 * an offline daemon can't answer the live team RPC, so `installed: null`.
 *
 * teams/get answers `{ ok, data: PagedData<TeamData> }` in both modes:
 * daemon-mode items are the daemon's teams; realm-mode items carry the scope
 * and, for published teams, the catalog `id` to install with.
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import { to_control_realm_data } from '../mappers/realm_inbox_mapper.js';
import {
    to_host_installable_team_data, to_host_run_data, to_host_team_data, to_host_workspace_data,
} from '../mappers/host_page_mapper.js';
import type {
    DaemonPageGetInput, WorkspacePageGetInput, DaemonPageData, WorkspacePageData, HostRunData, HostInstallableTeamData,
} from '../schemas/host_page_types.js';
import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';

const log = get_logger('svc.realm_host_page');

type Obj = Record<string, unknown>;
/** `v` as a record, or `{}`. */
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? v as Obj : {});
/** A finite number (numeric strings too), or null. */
const num = (v: unknown): number | null => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };
/** The `key` list of a Core reply: `data.X` (e.g. workspaces/get {daemon_id} → `{ data: { workspaces } }`), or `X`. */
function pick_list(res: unknown, key: string): Obj[] {
    const r = obj(res);
    const d = obj(r.data);
    const cand = d[key] ?? r[key];
    return Array.isArray(cand) ? cand.map(obj) : [];
}
/** teams/get `{ ok, data: { items } }` (PagedData — also for a daemon's live teams). */
function team_items(res: unknown): Obj[] {
    return pick_list(res, 'items');
}
/** A `runs/get` reply as rows + total (list length when Core sends no total). */
function runs_page(res: unknown): { items: HostRunData[]; total: number } {
    const r = obj(res);
    const list = Array.isArray(r.data) ? (r.data as unknown[]).map(obj) : pick_list(res, 'items');
    return { items: list.map(to_host_run_data), total: num(obj(r.data).total) ?? list.length };
}

/** Realm › Daemon and Realm › Workspace page reads. */
export class RealmHostPageService {
    /** Latest runs shown on either page. */
    static readonly RUNS = 25;
    constructor(private readonly _reads: CoreReadRepository, private readonly _control: ControlRepository) {}

    /**
     * The daemon page: the daemon (required), its live teams, the realm teams it
     * doesn't have yet, its workspaces and latest runs (best-effort → `partial`).
     *
     * @param input - {@link DaemonPageGetInput}
     * @param token - Caller's Core token
     */
    async daemon(input: DaemonPageGetInput, token: string): Promise<DaemonPageData> {
        const realm = await this._control.realm_by_slug(input.org_slug, input.slug, token);
        let partial = false;
        const ids = { realm_id: realm.id, daemon_id: input.daemon_id };
        // Optional section: a failure is logged, flags `partial` and leaves the section null.
        const soft = <T>(event: string, pr: Promise<T>) =>
            best_effort(log, event, pr.catch((err: unknown) => { partial = true; throw err; }), null, ids);
        const [d, installed, roster, ws, runs] = await Promise.all([
            this._reads.read<{ daemon?: Obj }>('daemons.get_by_id', { daemon_id: input.daemon_id }, token),
            // An offline daemon can't answer the live team RPC.
            soft('daemon_page_installed_failed', this._reads.read('teams.get', { daemon_id: input.daemon_id }, token)),
            soft('daemon_page_roster_failed', this._reads.read('teams.get', { realm_id: realm.id, limit: 100, offset: 0 }, token)),
            soft('daemon_page_workspaces_failed', this._reads.read('workspaces.get', { daemon_id: input.daemon_id }, token)),
            soft('daemon_page_runs_failed', this._reads.read('runs.get', { daemon_id: input.daemon_id, sort_by: 'last_updated_at', sort_dir: 'desc', limit: RealmHostPageService.RUNS }, token)),
        ]);
        const inst = installed ? team_items(installed).map(to_host_team_data) : null;
        const have = new Set((inst ?? []).map((t) => `${t.scope}/${t.slug}`));
        const have_slug = new Set((inst ?? []).map((t) => t.slug));
        const installable = roster
            ? team_items(roster)
                .filter((t) => !(Array.isArray(t.installed_daemon_ids) && t.installed_daemon_ids.includes(input.daemon_id)))
                .map(to_host_installable_team_data)
                .filter((t): t is HostInstallableTeamData => t !== null
                    && !have.has(`${t.scope}/${t.slug}`) && !(t.scope === '' && have_slug.has(t.slug)))
            : null;
        const workspaces = ws ? pick_list(ws, 'workspaces').map(to_host_workspace_data) : null;
        const rp = runs ? runs_page(runs) : null;
        return { realm: to_control_realm_data(realm), daemon: obj(d.daemon), installed: inst, installable, workspaces, runs: rp?.items ?? null, runs_total: rp?.total ?? null, partial };
    }

    /**
     * The workspace page: the workspace with its teams (required) and its latest
     * runs (best-effort → `partial`).
     *
     * @param input - {@link WorkspacePageGetInput}
     * @param token - Caller's Core token
     */
    async workspace(input: WorkspacePageGetInput, token: string): Promise<WorkspacePageData> {
        const realm = await this._control.realm_by_slug(input.org_slug, input.slug, token);
        let partial = false;
        const [w, runs] = await Promise.all([
            this._reads.read<{ workspace?: Obj; teams?: Obj[] }>('workspaces.get_by_id', { workspace_id: input.workspace_id }, token),
            best_effort(
                log, 'workspace_page_runs_failed',
                this._reads.read('runs.get', { workspace_id: input.workspace_id, sort_by: 'last_updated_at', sort_dir: 'desc', limit: RealmHostPageService.RUNS }, token)
                    .catch((err: unknown) => { partial = true; throw err; }),
                null,
                { realm_id: realm.id, workspace_id: input.workspace_id },
            ),
        ]);
        const rp = runs ? runs_page(runs) : null;
        return { realm: to_control_realm_data(realm), workspace: obj(w.workspace), teams: (w.teams ?? []).map(obj).map(to_host_team_data), runs: rp?.items ?? null, runs_total: rp?.total ?? null, partial };
    }
}
