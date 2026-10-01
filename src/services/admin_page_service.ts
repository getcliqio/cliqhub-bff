import type { CoreApiClient } from '../repositories/core_api_client.js';
import type { Core_compat, Core_compat_checker } from '../lib/core_compat.js';
import type { AdminListGetInput } from '../schemas/admin_page_schemas.js';

/**
 * Admin (site admin) pages — BFF composition over existing Core routes:
 * users/get, orgs/get, teams/get (admin inventory), daemons/get, realms/get,
 * runs/get, /internal/reports/audit.
 *
 * Hub-wide fleet numbers and the Accounts filters need Core API 3
 * (`all: true` for site admins on daemons/realms/runs, `role`/`suspended` on
 * users/get, `owner_count` on orgs). On an older Core those parts come back
 * null and `hub_wide` is false, so the UI can say what it can't see instead
 * of showing wrong numbers. Core drops unknown body fields, so sending the
 * new ones to an old Core would silently return unfiltered totals — hence
 * the version gate rather than "try and see".
 */

export const ADMIN_FEATURES_API_VERSION = 3;

type Paged<T> = { items: T[]; total: number };

export interface AdminAccountRowDTO {
    id: string; username: string; display_name: string; email: string;
    role: 'user' | 'admin'; suspended_at: string | null; created_at: string | null;
}
export interface AdminDaemonRowDTO {
    id: string; name: string | null; hostname: string | null; status: string;
    last_heartbeat: number | null; capacity: number | null;
    realms: Array<{ id: string; slug: string; org_slug: string | null; name: string }>;
}
export interface AdminTeamRowDTO {
    id: string; name: string; scope: string | null; description: string | null;
    visibility: string; listed: boolean; install_count: number; version_count: number | null;
    author_username: string | null; updated_at: string | null;
    /** Listed in the Marketplace but nothing installable. */
    listed_without_version: boolean;
}
export interface AdminRealmRef { id: string; slug: string; org_slug: string | null }
export interface AdminRealmRowDTO { id: string; slug: string; name: string; org_slug: string | null; created_by_username: string | null; created_at: number | null }
export interface AdminWorkspaceRowDTO {
    id: string; name: string | null; path: string; daemon_id: string | null; daemon_name: string | null;
    teams: string[]; active_runs: number; latest_run: { run_id: string; state: string; started_at: number | null } | null;
    updated_at: number | null;
}
export interface AdminRunRowDTO {
    run_id: string; run_name: string | null; state: string; team_label: string | null;
    daemon_id: string | null; workspace_name: string | null; started_at: number | null; last_updated_at: number | null;
    realm: AdminRealmRef | null;
}
export interface AdminLogRowDTO {
    id: string; run_id: string; run_name: string | null; created_at: number; level: string; message: string;
    daemon_name: string | null; team: string | null; realm: AdminRealmRef | null;
}
export interface AdminScopeRowDTO {
    id: string; slug: string; display_name: string; org_id: string | null; org_slug: string | null;
    owner_username: string | null; visibility: string; scope_type: string; team_count: number; created_at: string | null;
}
export type AdminListRowDTO = AdminAccountRowDTO | AdminDaemonRowDTO | AdminTeamRowDTO | AdminAuditRowDTO
    | AdminRealmRowDTO | AdminWorkspaceRowDTO | AdminRunRowDTO | AdminLogRowDTO | AdminScopeRowDTO;

export interface AdminListDTO {
    kind: AdminListGetInput['kind'];
    filter: string;
    items: AdminListRowDTO[];
    total: number;
    limit: number;
    offset: number;
    /** Count per filter chip; null when Core can't answer it (older Core). */
    counts: Record<string, number | null>;
    /** False when Core only returns what the admin is a member of. */
    hub_wide: boolean;
    /** Daemons on an older Core: pick an org first. */
    needs_org: boolean;
    /** Filters this Core can't apply yet (dropped rather than silently ignored). */
    unsupported: string[];
    /** Daemons / realms / runs / scopes (hub-wide): orgs for the org picker. */
    org_options?: Array<{ id: string; slug: string; display_name: string }>;
}

const RANGE_MS: Record<string, number | null> = { '1h': 36e5, '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5, all: null };
const RUN_STATES: Record<string, string[] | null> = { all: null, running: ['running'], awaiting_input: ['awaiting_input'], failed: ['failed', 'crashed'], completed: ['completed'] };

export interface AdminAttentionDTO {
    id: string;
    severity: 'error' | 'warn' | 'info';
    title: string;
    detail: string;
    href: string;
    action: string;
}
export interface AdminAuditRowDTO {
    id: string; admin_id: string; admin_username: string | null; action: string;
    target_type: string; target_id: string; details: Record<string, unknown>; created_at: string;
}
export interface AdminHomeDTO {
    core: Core_compat | null;
    hub_wide: boolean;
    counts: {
        accounts: number | null;
        suspended: number | null;
        admins: number | null;
        orgs: number | null;
        realms: number | null;
        daemons: { online: number; total: number; offline: number } | null;
        runs_24h: { total: number; failed: number } | null;
    };
    attention: AdminAttentionDTO[];
    recent_audit: AdminAuditRowDTO[];
    /** Some Core calls failed; numbers shown are what came back. */
    partial: boolean;
}

function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}
function num(v: unknown): number | null {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
}
function iso(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'number') return new Date(v).toISOString();
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Paged shapes differ by controller: `{data:{items,total}}`, `{users,total}`, `{teams,total}`, `{orgs,total}`. */
function paged<T>(res: unknown, key?: string): Paged<T> {
    const d = data_of<Record<string, unknown>>(res) ?? {};
    const items = (Array.isArray(d.items) ? d.items : key && Array.isArray(d[key]) ? d[key] : []) as T[];
    return { items, total: num(d.total) ?? items.length };
}

export function to_account_row(u: Record<string, unknown>): AdminAccountRowDTO {
    return {
        id: String(u.id),
        username: String(u.username ?? ''),
        display_name: String(u.display_name ?? ''),
        email: String(u.email ?? ''),
        role: u.role === 'admin' ? 'admin' : 'user',
        suspended_at: iso(u.suspended_at),
        created_at: iso(u.created_at),
    };
}
export function to_daemon_row(d: Record<string, unknown>): AdminDaemonRowDTO {
    const realms = Array.isArray(d.realms) ? d.realms as Array<Record<string, unknown>> : [];
    return {
        id: String(d.id),
        name: (d.name as string | null) ?? null,
        hostname: (d.hostname as string | null) ?? null,
        status: String(d.status ?? 'offline'),
        last_heartbeat: num(d.last_heartbeat),
        capacity: num(d.capacity),
        realms: realms.map((r) => ({ id: String(r.id), slug: String(r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null, name: String(r.name ?? r.slug ?? '') })),
    };
}
export function to_team_row(t: Record<string, unknown>): AdminTeamRowDTO {
    const listed = t.listed === true || t.listed === 1;
    const version_count = num(t.version_count);
    return {
        id: String(t.id),
        name: String(t.name ?? ''),
        scope: (t.scope as string | null) ?? null,
        description: (t.description as string | null) ?? null,
        visibility: String(t.visibility ?? 'private'),
        listed,
        install_count: num(t.install_count) ?? 0,
        version_count,
        author_username: (t.author_username as string | null) ?? null,
        updated_at: iso(t.updated_at),
        listed_without_version: listed && version_count === 0,
    };
}

export class AdminPageService {
    constructor(private _core: CoreApiClient, private _compat: Core_compat_checker, private _now: () => number = Date.now) {}

    /** Cached Core health; only waits on the very first call after BFF start. */
    private async _core_info(): Promise<Core_compat | null> {
        return this._compat.current() ?? await this._compat.check().catch(() => null);
    }
    private async _v3(): Promise<boolean> {
        return ((await this._core_info())?.api_version ?? 0) >= ADMIN_FEATURES_API_VERSION;
    }

    /** Settle: a failed Core call becomes null and marks the result partial. */
    private async _try<T>(p: Promise<T>, flag: { partial: boolean }): Promise<T | null> {
        try { return await p; } catch { flag.partial = true; return null; }
    }

    private _total(path: string, body: Record<string, unknown>, token: string, key?: string): Promise<number> {
        return this._core.post(path, { ...body, limit: 1, offset: 0 }, token).then((r) => paged(r, key).total);
    }

    async home(token: string): Promise<AdminHomeDTO> {
        const v3 = await this._v3();
        const flag = { partial: false };
        const since_ms = this._now() - 24 * 60 * 60 * 1000;
        const t = (path: string, body: Record<string, unknown>, key?: string) => this._try(this._total(path, body, token, key), flag);

        const [accounts, suspended, admins, orgs_res, realms, d_online, d_total, d_offline, runs, runs_failed, audit, listed] = await Promise.all([
            t('/v1/users/get', {}, 'users'),
            v3 ? t('/v1/users/get', { suspended: true }, 'users') : Promise.resolve(null),
            v3 ? t('/v1/users/get', { role: 'admin' }, 'users') : Promise.resolve(null),
            this._try(this._core.post('/v1/orgs/get', { limit: 100 }, token), flag),
            v3 ? t('/v1/realms/get', { all: true }) : Promise.resolve(null),
            v3 ? t('/v1/daemons/get', { all: true, status: 'online' }) : Promise.resolve(null),
            v3 ? t('/v1/daemons/get', { all: true }) : Promise.resolve(null),
            v3 ? t('/v1/daemons/get', { all: true, status: 'offline' }) : Promise.resolve(null),
            v3 ? t('/v1/runs/get', { all: true, since_ms }) : Promise.resolve(null),
            v3 ? t('/v1/runs/get', { all: true, since_ms, state: ['failed', 'crashed'] }) : Promise.resolve(null),
            this._try(this._core.post('/internal/reports/audit', { limit: 6 }, token), flag),
            this._try(this._core.post('/v1/teams/get', { listed: true, limit: 100 }, token), flag),
        ]);

        const orgs = orgs_res ? paged<Record<string, unknown>>(orgs_res, 'orgs') : null;
        const listed_teams = listed ? paged<Record<string, unknown>>(listed, 'teams') : null;
        const attention: AdminAttentionDTO[] = [];

        if (d_offline != null && d_offline > 0) {
            attention.push({ id: 'daemons_offline', severity: 'error', title: `${d_offline} daemon${d_offline === 1 ? ' is' : 's are'} offline`, detail: 'Runs routed to them queue until they reconnect.', href: '/admin/daemons?filter=offline', action: 'See daemons' });
        }
        if (runs != null && runs_failed != null && runs_failed >= 5 && runs_failed / Math.max(runs, 1) >= 0.05) {
            attention.push({ id: 'runs_failed', severity: 'warn', title: `${runs_failed} runs failed in 24h`, detail: `${Math.round((runs_failed / Math.max(runs, 1)) * 1000) / 10}% of ${runs} runs.`, href: '/admin/runs?filter=failed', action: 'See runs' });
        }
        if (suspended != null && suspended > 0) {
            attention.push({ id: 'suspended', severity: 'info', title: `${suspended} suspended account${suspended === 1 ? '' : 's'}`, detail: 'They can’t sign in until unsuspended.', href: '/admin/accounts?filter=suspended', action: 'Review' });
        }
        const ownerless = (orgs?.items ?? []).filter((o) => num(o.owner_count) === 0);
        if (ownerless.length) {
            attention.push({ id: 'ownerless', severity: 'warn', title: `${ownerless.length} org${ownerless.length === 1 ? ' has' : 's have'} no owner`, detail: `${ownerless.slice(0, 3).map((o) => o.slug).join(', ')}${ownerless.length > 3 ? '…' : ''} — nobody can manage roles or delete them.`, href: ownerless.length === 1 ? `/admin/orgs/${ownerless[0].id}` : '/admin/orgs', action: 'Fix' });
        }
        const no_version = (listed_teams?.items ?? []).map(to_team_row).filter((r) => r.listed_without_version);
        if (no_version.length) {
            attention.push({ id: 'listed_no_version', severity: 'info', title: `${no_version.length} listed team${no_version.length === 1 ? ' has' : 's have'} no published version`, detail: 'They show in the Marketplace but can’t be installed.', href: '/admin/teams?filter=listed', action: 'Review' });
        }

        const audit_rows = audit ? (data_of<{ entries?: AdminAuditRowDTO[] }>(audit)?.entries ?? []) : [];

        return {
            core: await this._core_info(),
            hub_wide: v3,
            counts: {
                accounts, suspended, admins,
                orgs: orgs?.total ?? null,
                realms,
                daemons: d_online != null && d_total != null ? { online: d_online, total: d_total, offline: d_offline ?? 0 } : null,
                runs_24h: runs != null ? { total: runs, failed: runs_failed ?? 0 } : null,
            },
            attention,
            recent_audit: audit_rows.map((e) => ({ ...e, created_at: iso(e.created_at) ?? String(e.created_at) })),
            partial: flag.partial,
        };
    }

    private async _org_options(token: string): Promise<AdminListDTO['org_options']> {
        const res = await this._core.post('/v1/orgs/get', { limit: 100, exclude_personal: true }, token).catch(() => null);
        return res ? paged<Record<string, unknown>>(res, 'orgs').items.map((o) => ({ id: String(o.id), slug: String(o.slug ?? ''), display_name: String(o.display_name ?? o.slug ?? '') })) : undefined;
    }

    /** realm_id → {slug, org_slug} for links (runs/logs rows carry only realm_id). */
    private async _realm_map(token: string, v3: boolean): Promise<Map<string, AdminRealmRef>> {
        const res = await this._core.post('/v1/realms/get', { ...(v3 ? { all: true } : {}), limit: 100 }, token).catch(() => null);
        const items = res ? paged<Record<string, unknown>>(res).items : [];
        return new Map(items.map((r) => [String(r.id), { id: String(r.id), slug: String(r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null }]));
    }

    async list(token: string, p: AdminListGetInput): Promise<AdminListDTO> {
        const v3 = await this._v3();
        const page = { limit: p.limit, offset: p.offset };
        const q = 'query' in p && p.query ? { query: p.query } : {};

        if (p.kind === 'accounts') {
            const filters: Record<string, Record<string, unknown>> = { all: {}, admins: { role: 'admin' }, suspended: { suspended: true } };
            // Older Core ignores role/suspended → only "all" is honest.
            const filter = v3 ? p.filter : 'all';
            const search = p.query ? { search: p.query } : {};
            const [rows, ...counts] = await Promise.all([
                this._core.post('/v1/users/get', { ...filters[filter], ...search, ...page }, token),
                ...(v3 ? (['all', 'admins', 'suspended'] as const).map((k) => this._total('/v1/users/get', { ...filters[k], ...search }, token, 'users').catch(() => null)) : []),
            ]);
            const pg = paged<Record<string, unknown>>(rows, 'users');
            return {
                kind: 'accounts', filter, items: pg.items.map(to_account_row), total: pg.total, ...page,
                counts: v3 ? { all: counts[0] as number | null, admins: counts[1] as number | null, suspended: counts[2] as number | null } : { all: pg.total, admins: null, suspended: null },
                hub_wide: true, needs_org: false, unsupported: v3 ? [] : ['admins', 'suspended'],
            };
        }

        if (p.kind === 'daemons') {
            if (!v3 && !p.org_id) {
                return { kind: 'daemons', filter: p.filter, items: [], total: 0, ...page, counts: { all: null, online: null, stale: null, offline: null }, hub_wide: false, needs_org: true, unsupported: [] };
            }
            const scope: Record<string, unknown> = { ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q };
            const status = (f: string) => (f === 'all' ? {} : { status: f });
            const keys = ['all', 'online', 'stale', 'offline'] as const;
            const [rows, orgs, ...counts] = await Promise.all([
                this._core.post('/v1/daemons/get', { ...scope, ...status(p.filter), ...page }, token),
                v3 ? this._core.post('/v1/orgs/get', { limit: 100, exclude_personal: true }, token).catch(() => null) : Promise.resolve(null),
                ...keys.map((k) => this._total('/v1/daemons/get', { ...scope, ...status(k) }, token).catch(() => null)),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            const org_options = orgs ? paged<Record<string, unknown>>(orgs, 'orgs').items.map((o) => ({ id: String(o.id), slug: String(o.slug ?? ''), display_name: String(o.display_name ?? o.slug ?? '') })) : undefined;
            return {
                kind: 'daemons', filter: p.filter, items: pg.items.map(to_daemon_row), total: pg.total, ...page,
                counts: Object.fromEntries(keys.map((k, i) => [k, counts[i] as number | null])),
                hub_wide: v3, needs_org: false, unsupported: [], ...(org_options ? { org_options } : {}),
            };
        }

        if (p.kind === 'audit') {
            const unsupported = v3 ? [] : [...(p.since_ms != null ? ['since'] : []), ...(p.target_id ? ['target'] : [])];
            const body: Record<string, unknown> = {
                ...(p.action ? { action: p.action } : {}),
                ...(p.target_type ? { target_type: p.target_type } : {}),
                ...(v3 && p.since_ms != null ? { since_ms: p.since_ms } : {}),
                ...(v3 && p.target_id ? { target_id: p.target_id } : {}),
                ...page,
            };
            const d = data_of<{ entries?: AdminAuditRowDTO[]; total?: number }>(await this._core.post('/internal/reports/audit', body, token)) ?? {};
            const entries = (d.entries ?? []).map((e) => ({ ...e, created_at: iso(e.created_at) ?? String(e.created_at) }));
            return { kind: 'audit', filter: p.filter, items: entries, total: num(d.total) ?? entries.length, ...page, counts: {}, hub_wide: true, needs_org: false, unsupported };
        }

        if (p.kind === 'realms') {
            const scope = { ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q };
            const [rows, org_options] = await Promise.all([
                this._core.post('/v1/realms/get', { ...scope, sort_by: 'created_at', sort_dir: 'desc', ...page }, token),
                v3 ? this._org_options(token) : Promise.resolve(undefined),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            const items: AdminRealmRowDTO[] = pg.items.map((r) => ({ id: String(r.id), slug: String(r.slug ?? ''), name: String(r.name ?? r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null, created_by_username: (r.created_by_username as string | null) ?? null, created_at: num(r.created_at) }));
            return { kind: 'realms', filter: 'all', items, total: pg.total, ...page, counts: { all: pg.total }, hub_wide: v3, needs_org: false, unsupported: [], ...(org_options ? { org_options } : {}) };
        }

        if (p.kind === 'workspaces') {
            const [rows, daemons] = await Promise.all([
                this._core.post('/v1/workspaces/get', { ...page }, token),
                v3 ? this._core.post('/v1/daemons/get', { all: true, limit: 200 }, token).catch(() => null) : Promise.resolve(null),
            ]);
            const d = data_of<Record<string, unknown>>(rows) ?? {};
            const list = (Array.isArray(d.workspaces) ? d.workspaces : []) as Array<Record<string, unknown>>;
            const names = new Map((daemons ? paged<Record<string, unknown>>(daemons).items : []).map((x) => [String(x.id), (x.name as string | null) ?? (x.hostname as string | null) ?? null]));
            const items: AdminWorkspaceRowDTO[] = list.map((w) => {
                const latest = w.latest_run as Record<string, unknown> | null | undefined;
                const daemon_id = (w.daemon_id as string | null) ?? null;
                return {
                    id: String(w.id ?? w.workspace_id), name: (w.name as string | undefined) ?? null, path: String(w.path ?? w.workspace_dir ?? ''),
                    daemon_id, daemon_name: daemon_id ? names.get(daemon_id) ?? null : null,
                    teams: (Array.isArray(w.teams) ? w.teams as Array<Record<string, unknown>> : []).map((t) => `@${t.scope}/${t.slug}`),
                    active_runs: Array.isArray(w.active_runs) ? w.active_runs.length : 0,
                    latest_run: latest ? { run_id: String(latest.run_id), state: String(latest.state), started_at: num(latest.started_at) } : null,
                    updated_at: num(w.updated_at),
                };
            });
            return { kind: 'workspaces', filter: 'all', items, total: num(d.total) ?? items.length, ...page, counts: { all: num(d.total) ?? items.length }, hub_wide: true, needs_org: false, unsupported: [] };
        }

        if (p.kind === 'runs') {
            if (!v3 && !p.org_id) {
                return { kind: 'runs', filter: p.filter, items: [], total: 0, ...page, counts: {}, hub_wide: false, needs_org: true, unsupported: [] };
            }
            const range_ms = RANGE_MS[p.range];
            const scope: Record<string, unknown> = {
                ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q,
                ...(range_ms != null ? { since_ms: Math.floor((this._now() - range_ms) / 60_000) * 60_000 } : {}),
            };
            const state = (f: string) => (RUN_STATES[f] ? { state: RUN_STATES[f] } : {});
            const keys = ['all', 'running', 'awaiting_input', 'failed', 'completed'] as const;
            const [rows, realms, org_options, ...counts] = await Promise.all([
                this._core.post('/v1/runs/get', { ...scope, ...state(p.filter), sort_by: 'started_at', sort_dir: 'desc', ...page }, token),
                this._realm_map(token, v3),
                v3 ? this._org_options(token) : Promise.resolve(undefined),
                ...keys.map((k) => this._total('/v1/runs/get', { ...scope, ...state(k) }, token).catch(() => null)),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            const items: AdminRunRowDTO[] = pg.items.map((r) => ({
                run_id: String(r.run_id), run_name: (r.run_name as string | null) ?? null, state: String(r.state ?? ''),
                team_label: (r.team_label as string | null) ?? null, daemon_id: (r.daemon_id as string | null) ?? null,
                workspace_name: (r.workspace_name as string | null) ?? null, started_at: num(r.started_at), last_updated_at: num(r.last_updated_at),
                realm: r.realm_id ? realms.get(String(r.realm_id)) ?? null : null,
            }));
            return { kind: 'runs', filter: p.filter, items, total: pg.total, ...page, counts: Object.fromEntries(keys.map((k, i) => [k, counts[i] as number | null])), hub_wide: v3, needs_org: false, unsupported: [], ...(org_options ? { org_options } : {}) };
        }

        if (p.kind === 'logs') {
            // Site admins may omit realm_id on runs/get_logs (hub-wide on every Core version).
            const range_ms = RANGE_MS[p.range];
            const body: Record<string, unknown> = {
                ...(p.query ? { q: p.query } : {}),
                ...(p.filter !== 'all' ? { levels: [p.filter] } : {}),
                ...(p.run_id ? { run_ids: [p.run_id] } : {}),
                ...(range_ms != null ? { since_ms: Math.floor((this._now() - range_ms) / 60_000) * 60_000 } : {}),
                ...page,
            };
            const [res, realms] = await Promise.all([this._core.post('/v1/runs/get_logs', body, token), this._realm_map(token, v3)]);
            const d = data_of<Record<string, unknown>>(res) ?? {};
            const lines = (Array.isArray(d.lines) ? d.lines : []) as Array<Record<string, unknown>>;
            const facets = (d.facets as { level?: Array<{ value: string; count: number }> } | undefined)?.level ?? [];
            const by_level = new Map(facets.map((f) => [f.value, f.count]));
            const items: AdminLogRowDTO[] = lines.map((l) => ({
                id: String(l.id), run_id: String(l.run_id), run_name: (l.run_name as string | null) ?? null, created_at: num(l.created_at) ?? 0,
                level: String(l.level ?? 'info'), message: String(l.message ?? ''), daemon_name: (l.daemon_name as string | null) ?? null,
                team: (l.team as string | null) ?? null, realm: l.realm_id ? realms.get(String(l.realm_id)) ?? null : null,
            }));
            return {
                kind: 'logs', filter: p.filter, items, total: num(d.total) ?? items.length, ...page,
                // Level chip counts come from Core's level facet (only meaningful before a level is picked).
                counts: p.filter === 'all' ? { all: num(d.total), error: by_level.get('error') ?? 0, warn: by_level.get('warn') ?? 0, info: by_level.get('info') ?? 0, debug: by_level.get('debug') ?? 0 } : {},
                hub_wide: true, needs_org: false, unsupported: [],
            };
        }

        if (p.kind === 'scopes') {
            const [rows, org_options] = await Promise.all([
                this._core.post('/v1/orgs/get_scopes', { ...(p.org_id ? { org_id: p.org_id } : {}), ...q, ...page }, token),
                this._org_options(token),
            ]);
            const pg = paged<Record<string, unknown>>(rows, 'scopes');
            const slug_by_org = new Map((org_options ?? []).map((o) => [o.id, o.slug]));
            const items: AdminScopeRowDTO[] = pg.items.map((s) => ({
                id: String(s.id), slug: String(s.slug ?? ''), display_name: String(s.display_name ?? ''), org_id: (s.org_id as string | null) ?? null,
                org_slug: s.org_id ? slug_by_org.get(String(s.org_id)) ?? null : null, owner_username: (s.owner_username as string | null) ?? null,
                visibility: String(s.visibility ?? 'private'), scope_type: String(s.scope_type ?? ''), team_count: num(s.team_count) ?? 0, created_at: iso(s.created_at),
            }));
            return { kind: 'scopes', filter: 'all', items, total: pg.total, ...page, counts: { all: pg.total }, hub_wide: true, needs_org: false, unsupported: [], ...(org_options ? { org_options } : {}) };
        }

        // teams — Core's admin inventory needs `listed` set.
        const listed = p.filter === 'listed';
        const [rows, c_listed, c_unlisted] = await Promise.all([
            this._core.post('/v1/teams/get', { listed, ...q, ...page }, token),
            this._total('/v1/teams/get', { listed: true, ...q }, token, 'teams').catch(() => null),
            this._total('/v1/teams/get', { listed: false, ...q }, token, 'teams').catch(() => null),
        ]);
        const pg = paged<Record<string, unknown>>(rows, 'teams');
        return {
            kind: 'teams', filter: p.filter, items: pg.items.map(to_team_row), total: pg.total, ...page,
            counts: { listed: c_listed, unlisted: c_unlisted },
            hub_wide: true, needs_org: false, unsupported: [],
        };
    }
}
