import type { CoreApiClient } from '../repositories/core_api_client.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import { to_control_realm_dto } from '../types/mappers.js';

/**
 * Realm › Daemon and Realm › Workspace pages — one BFF read each.
 * Core routes (all existing): realms/get_by_id (realm gate), daemons/get_by_id,
 * teams/get {daemon_id} (live installed teams) and {realm_id} (roster to
 * install from), workspaces/get {daemon_id}, workspaces/get_by_id, runs/get.
 * Everything but the realm and the daemon / workspace itself is best-effort:
 * an offline daemon can't answer the live team RPC, so `installed: null`.
 */
export interface HostRunDTO { run_id: string; run_name: string | null; state: string; team: string | null; phase: string | null; started_at: number | null; completed_at: number | null; last_updated_at: number | null }
export interface HostTeamDTO { team_id: string | null; scope: string; slug: string; version: string | null }
export interface HostWorkspaceDTO { id: string; name: string | null; path: string; teams: string[]; active_runs: number; last_run_state: string | null; last_run_at: number | null }
export interface DaemonPageDTO {
    realm: ReturnType<typeof to_control_realm_dto>;
    daemon: Record<string, unknown>;
    installed: HostTeamDTO[] | null;
    installable: Array<{ team_id: string; scope: string; slug: string; version: string | null }> | null;
    workspaces: HostWorkspaceDTO[] | null;
    runs: HostRunDTO[] | null;
    runs_total: number | null;
    partial: boolean;
}
export interface WorkspacePageDTO {
    realm: ReturnType<typeof to_control_realm_dto>;
    workspace: Record<string, unknown>;
    teams: HostTeamDTO[];
    runs: HostRunDTO[] | null;
    runs_total: number | null;
    partial: boolean;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? v as Obj : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };
/** Daemon RPC replies are enveloped (`data.payload.data.X`); list replies are `data.X` or `X`. */
function pick_list(res: unknown, key: string): Obj[] {
    const r = obj(res);
    const d = obj(r.data);
    const cand = obj(obj(d.payload).data)[key] ?? d[key] ?? r[key] ?? (Array.isArray(d.items) && key === 'items' ? d.items : undefined);
    return Array.isArray(cand) ? cand.map(obj) : [];
}
function to_team(t: Obj): HostTeamDTO {
    return { team_id: str(t.team_id) ?? str(t.id), scope: str(t.scope) ?? str(t.scope_slug) ?? '', slug: str(t.slug) ?? str(t.name) ?? '', version: str(t.version) };
}
function to_run(r: Obj): HostRunDTO {
    return {
        run_id: String(r.run_id ?? ''), run_name: str(r.run_name), state: String(r.state ?? ''),
        team: str(r.team_label) ?? str(r.team_id), phase: str(r.current_phase),
        started_at: num(r.started_at), completed_at: num(r.completed_at), last_updated_at: num(r.last_updated_at),
    };
}
function runs_page(res: unknown): { items: HostRunDTO[]; total: number } {
    const r = obj(res);
    const list = Array.isArray(r.data) ? (r.data as unknown[]).map(obj) : pick_list(res, 'items');
    return { items: list.map(to_run), total: num(obj(r.data).total) ?? list.length };
}

export class RealmHostPageService {
    static readonly RUNS = 25;
    constructor(private _core: CoreApiClient, private _control: ControlRepository) {}

    async daemon(token: string, p: { org_slug: string; slug: string; daemon_id: string }): Promise<DaemonPageDTO> {
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        let partial = false;
        const soft = <T>(pr: Promise<T>) => pr.catch(() => { partial = true; return null; });
        const [d, installed, roster, ws, runs] = await Promise.all([
            this._core.post<{ daemon?: Obj }>('/v1/daemons/get_by_id', { daemon_id: p.daemon_id }, token),
            soft(this._core.post('/v1/teams/get', { daemon_id: p.daemon_id }, token)),
            soft(this._core.post('/v1/teams/get', { realm_id: realm.id, limit: 100, offset: 0 }, token)),
            soft(this._core.post('/v1/workspaces/get', { daemon_id: p.daemon_id }, token)),
            soft(this._core.post('/v1/runs/get', { daemon_id: p.daemon_id, sort_by: 'last_updated_at', sort_dir: 'desc', limit: RealmHostPageService.RUNS }, token)),
        ]);
        const inst = installed ? pick_list(installed, 'teams').map(to_team) : null;
        const have = new Set((inst ?? []).map((t) => `${t.scope}/${t.slug}`));
        const installable = roster
            ? pick_list(roster, 'items').map((t) => ({ team_id: str(t.id), scope: str(t.scope) ?? '', slug: str(t.name) ?? '', version: str(t.latest_version) ?? str(t.version) }))
                .filter((t): t is { team_id: string; scope: string; slug: string; version: string | null } => Boolean(t.team_id) && !have.has(`${t.scope}/${t.slug}`))
            : null;
        const workspaces = ws ? pick_list(ws, 'workspaces').map((w) => ({
            id: String(w.workspace_id ?? w.id ?? ''), name: str(w.name), path: String(w.workspace_dir ?? w.path ?? ''),
            teams: (Array.isArray(w.teams) ? w.teams : []).map((t) => { const o = obj(t); return o.scope && o.slug ? `@${o.scope}/${o.slug}` : String(t); }),
            active_runs: num(w.active_runs) ?? 0, last_run_state: str(obj(w.last_run).state) ?? str(w.last_run_state), last_run_at: num(obj(w.last_run).started_at) ?? num(w.last_run_at),
        })) : null;
        const rp = runs ? runs_page(runs) : null;
        return { realm: to_control_realm_dto(realm), daemon: obj(d.daemon), installed: inst, installable, workspaces, runs: rp?.items ?? null, runs_total: rp?.total ?? null, partial };
    }

    async workspace(token: string, p: { org_slug: string; slug: string; workspace_id: string }): Promise<WorkspacePageDTO> {
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        let partial = false;
        const [w, runs] = await Promise.all([
            this._core.post<{ workspace?: Obj; teams?: Obj[] }>('/v1/workspaces/get_by_id', { workspace_id: p.workspace_id }, token),
            this._core.post('/v1/runs/get', { workspace_id: p.workspace_id, sort_by: 'last_updated_at', sort_dir: 'desc', limit: RealmHostPageService.RUNS }, token).catch(() => { partial = true; return null; }),
        ]);
        const rp = runs ? runs_page(runs) : null;
        return { realm: to_control_realm_dto(realm), workspace: obj(w.workspace), teams: (w.teams ?? []).map(obj).map(to_team), runs: rp?.items ?? null, runs_total: rp?.total ?? null, partial };
    }
}
