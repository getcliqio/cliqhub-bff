/**
 * Admin (site admin) pages — BFF composition over existing Core routes:
 * users/get, orgs/get, teams/get (admin inventory), daemons/get, realms/get,
 * runs/get, runs/get_logs, workspaces/get, orgs/get_scopes, /internal/reports/audit.
 *
 * Hub-wide fleet numbers and the Accounts filters need Core API 3
 * (`all: true` for site admins on daemons/realms/runs, `role`/`suspended` on
 * users/get, `owner_count` on orgs). On an older Core those parts come back
 * null and `hub_wide` is false, so the UI can say what it can't see instead
 * of showing wrong numbers. Core drops unknown body fields, so sending the
 * new ones to an old Core would silently return unfiltered totals — hence
 * the version gate rather than "try and see".
 *
 * teams/get answers `{ ok, data: PagedData<TeamData> }`; rows map through
 * `to_team_row` (mappers/admin_page_mapper.ts).
 *
 * Search goes to Core as `query` (`q` for runs/get_logs); `sort_by` only where
 * Core supports it (lib/core_list.ts), and each list says which keys work in `sortable`.
 */

import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';
import { core_query, core_sort, sortable_keys } from '../lib/core_list.js';
import type { CoreReadRepository, CoreRead } from '../repositories/core_read_repository.js';
import type { CoreCompatService } from './core_compat_service.js';
import type { CoreCompatData } from '../schemas/health_types.js';
import type {
    AdminHomeGetInput, AdminListGetInput, AdminHomeData, AdminListData, AdminAttentionData, AdminAuditRowData, AdminRealmRef,
} from '../schemas/admin_page_types.js';
import {
    to_account_row, to_audit_row, to_daemon_row, to_log_row, to_realm_ref, to_realm_row, to_run_row, to_scope_row,
    to_team_row, to_workspace_row,
} from '../mappers/admin_page_mapper.js';

const log = get_logger('svc.admin_page');

/** Core API version that brings hub-wide (`all: true`) reads and the Accounts filters. */
export const ADMIN_FEATURES_API_VERSION = 3;

type Paged<T> = { items: T[]; total: number };

/** Range chip → look-back window (null = no `since_ms`). */
const RANGE_MS: Record<string, number | null> = { '1h': 36e5, '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5, all: null };
/** Run filter chip → Core `state` values (null = no filter). */
const RUN_STATES: Record<string, string[] | null> = { all: null, running: ['running'], awaiting_input: ['awaiting_input'], failed: ['failed', 'crashed'], completed: ['completed'] };

/** Unwraps Core's `{ ok, data }` envelope when present. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}
/** A finite number (numeric strings included), else null. */
function num(v: unknown): number | null {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Paged shapes differ by controller: `{data:{items,total}}`, `{users,total}`, `{orgs,total}`, `{scopes,total}`. */
function paged<T>(res: unknown, key?: string): Paged<T> {
    const d = data_of<Record<string, unknown>>(res) ?? {};
    const items = (Array.isArray(d.items) ? d.items : key && Array.isArray(d[key]) ? d[key] : []) as T[];
    return { items, total: num(d.total) ?? items.length };
}

/** Site-admin home and list pages, composed from Core reads and gated on Core's API version. */
export class AdminPageService {
    constructor(
        private readonly _reads: CoreReadRepository,
        private readonly _compat: CoreCompatService,
        private readonly _now: () => number = Date.now,
    ) {}

    /** Cached Core health; only waits on the very first call after BFF start. */
    private async _core_info(): Promise<CoreCompatData | null> {
        return this._compat.current() ?? await best_effort(log, 'admin_core_check_failed', this._compat.check(), null);
    }

    /** True when Core supports the API-3 admin features (hub-wide reads, account filters). */
    private async _v3(): Promise<boolean> {
        return ((await this._core_info())?.api_version ?? 0) >= ADMIN_FEATURES_API_VERSION;
    }

    /** Settle: a failed Core call is logged as `event`, becomes null and marks the result partial. */
    private async _try<T>(event: string, p: Promise<T>, flag: { partial: boolean }, ctx: Record<string, unknown> = {}): Promise<T | null> {
        const r = await best_effort(log, event, p.then((v) => ({ v })), null, ctx);
        if (r === null) { flag.partial = true; return null; }
        return r.v;
    }

    /** Row count of a Core list read (asks for one row and reads `total`). */
    private _total(route: CoreRead, body: Record<string, unknown>, token: string, key?: string): Promise<number> {
        return this._reads.read(route, { ...body, limit: 1, offset: 0 }, token).then((r) => paged(r, key).total);
    }

    /**
     * Admin home: hub counts, attention items and the latest audit entries.
     * A failed Core call leaves its number null and sets `partial`.
     *
     * @param _input - {@link AdminHomeGetInput} (no fields)
     * @param token - Caller's Core token (site admin)
     */
    async home(_input: AdminHomeGetInput, token: string): Promise<AdminHomeData> {
        const v3 = await this._v3();
        const flag = { partial: false };
        const since_ms = this._now() - 24 * 60 * 60 * 1000;
        const t = (route: CoreRead, body: Record<string, unknown>, key?: string) => this._try('admin_home_count_failed', this._total(route, body, token, key), flag, { route });

        const [accounts, suspended, admins, orgs_res, realms, d_online, d_total, d_offline, runs, runs_failed, audit, listed] = await Promise.all([
            t('users.get', {}, 'users'),
            v3 ? t('users.get', { suspended: true }, 'users') : Promise.resolve(null),
            v3 ? t('users.get', { role: 'admin' }, 'users') : Promise.resolve(null),
            this._try('admin_home_orgs_failed', this._reads.read('orgs.get', { limit: 100 }, token), flag),
            v3 ? t('realms.get', { all: true }) : Promise.resolve(null),
            v3 ? t('daemons.get', { all: true, status: 'online' }) : Promise.resolve(null),
            v3 ? t('daemons.get', { all: true }) : Promise.resolve(null),
            v3 ? t('daemons.get', { all: true, status: 'offline' }) : Promise.resolve(null),
            v3 ? t('runs.get', { all: true, since_ms }) : Promise.resolve(null),
            v3 ? t('runs.get', { all: true, since_ms, state: ['failed', 'crashed'] }) : Promise.resolve(null),
            this._try('admin_home_audit_failed', this._reads.read('reports.audit', { limit: 6 }, token), flag),
            this._try('admin_home_listed_teams_failed', this._reads.read('teams.get', { listed: true, limit: 100 }, token), flag),
        ]);

        const orgs = orgs_res ? paged<Record<string, unknown>>(orgs_res, 'orgs') : null;
        const listed_teams = listed ? paged<Record<string, unknown>>(listed) : null;
        const attention: AdminAttentionData[] = [];

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

        const audit_rows = audit ? (data_of<{ entries?: AdminAuditRowData[] }>(audit)?.entries ?? []) : [];

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
            recent_audit: audit_rows.map(to_audit_row),
            partial: flag.partial,
        };
    }

    /** Org picker options (every live org); undefined when the read fails, so the picker is hidden. */
    private async _org_options(token: string): Promise<AdminListData['org_options']> {
        const res = await best_effort(log, 'admin_org_options_failed', this._reads.read('orgs.get', { limit: 100 }, token), null);
        return res ? paged<Record<string, unknown>>(res, 'orgs').items.map((o) => ({ id: String(o.id), slug: String(o.slug ?? ''), display_name: String(o.display_name ?? o.slug ?? '') })) : undefined;
    }

    /** realm_id → {slug, org_slug} for links (runs/logs rows carry only realm_id). */
    private async _realm_map(token: string, v3: boolean): Promise<Map<string, AdminRealmRef>> {
        const res = await best_effort(log, 'admin_realm_map_failed', this._reads.read('realms.get', { ...(v3 ? { all: true } : {}), limit: 100 }, token), null);
        const items = res ? paged<Record<string, unknown>>(res).items : [];
        return new Map(items.map((r) => [String(r.id), to_realm_ref(r)]));
    }

    /**
     * One admin list (`kind`) with a count per filter chip. Filters this Core
     * can't apply are dropped and named in `unsupported`.
     *
     * @param p - {@link AdminListGetInput}
     * @param token - Caller's Core token (site admin)
     */
    async list(p: AdminListGetInput, token: string): Promise<AdminListData> {
        const v3 = await this._v3();
        // Sort keys new in Core API 6 are only sent (and offered) when this Core has them.
        const api = (await this._core_info())?.api_version ?? null;
        const page = { limit: p.limit, offset: p.offset };
        // A failed chip count shows as null; the list itself is required.
        const count = (route: CoreRead, body: Record<string, unknown>, chip: string, key?: string) =>
            best_effort(log, 'admin_list_count_failed', this._total(route, body, token, key), null, { kind: p.kind, chip });
        const q = core_query('query' in p ? p.query : undefined);

        if (p.kind === 'accounts') {
            const filters: Record<string, Record<string, unknown>> = { all: {}, admins: { role: 'admin' }, suspended: { suspended: true } };
            // Older Core ignores role/suspended → only "all" is honest.
            const filter = v3 ? p.filter : 'all';
            // Rows and chip counts both include soft-deleted accounts when asked.
            const del = p.include_deleted ? { include_deleted: true } : {};
            const [rows, ...counts] = await Promise.all([
                this._reads.read('users.get', { ...filters[filter], ...q, ...del, ...core_sort('users.get', p, {}, api), ...page }, token),
                ...(v3 ? (['all', 'admins', 'suspended'] as const).map((k) => count('users.get', { ...filters[k], ...q, ...del }, k, 'users')) : []),
            ]);
            const pg = paged<Record<string, unknown>>(rows, 'users');
            return {
                kind: 'accounts', filter, items: pg.items.map(to_account_row), total: pg.total, ...page,
                counts: v3 ? { all: counts[0] as number | null, admins: counts[1] as number | null, suspended: counts[2] as number | null } : { all: pg.total, admins: null, suspended: null },
                hub_wide: true, needs_org: false, unsupported: v3 ? [] : ['admins', 'suspended'], sortable: sortable_keys('users.get', api),
            };
        }

        if (p.kind === 'daemons') {
            if (!v3 && !p.org_id) {
                return { kind: 'daemons', filter: p.filter, items: [], total: 0, ...page, counts: { all: null, online: null, stale: null, offline: null }, hub_wide: false, needs_org: true, unsupported: [], sortable: [] };
            }
            const scope: Record<string, unknown> = { ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q };
            const status = (f: string) => (f === 'all' ? {} : { status: f });
            const keys = ['all', 'online', 'stale', 'offline'] as const;
            const [rows, org_options, ...counts] = await Promise.all([
                this._reads.read('daemons.get', { ...scope, ...status(p.filter), ...core_sort('daemons.get', p, {}, api), ...page }, token),
                v3 ? this._org_options(token) : Promise.resolve(undefined),
                ...keys.map((k) => count('daemons.get', { ...scope, ...status(k) }, k)),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            return {
                kind: 'daemons', filter: p.filter, items: pg.items.map(to_daemon_row), total: pg.total, ...page,
                counts: Object.fromEntries(keys.map((k, i) => [k, counts[i] as number | null])),
                hub_wide: v3, needs_org: false, unsupported: [], sortable: sortable_keys('daemons.get', api), ...(org_options ? { org_options } : {}),
            };
        }

        if (p.kind === 'audit') {
            const unsupported = v3 ? [] : [...(p.since_ms != null ? ['since'] : []), ...(p.target_id ? ['target'] : [])];
            const body: Record<string, unknown> = {
                ...(p.action ? { action: p.action } : {}),
                ...(p.target_type ? { target_type: p.target_type } : {}),
                ...(v3 && p.since_ms != null ? { since_ms: p.since_ms } : {}),
                ...(v3 && p.target_id ? { target_id: p.target_id } : {}),
                ...core_sort('reports.audit', p, {}, api),
                ...page,
            };
            const d = data_of<{ entries?: AdminAuditRowData[]; total?: number }>(await this._reads.read('reports.audit', body, token)) ?? {};
            const entries = (d.entries ?? []).map(to_audit_row);
            return { kind: 'audit', filter: p.filter, items: entries, total: num(d.total) ?? entries.length, ...page, counts: {}, hub_wide: true, needs_org: false, unsupported, sortable: sortable_keys('reports.audit', api) };
        }

        if (p.kind === 'realms') {
            const scope = { ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q };
            const [rows, org_options] = await Promise.all([
                this._reads.read('realms.get', { ...scope, ...core_sort('realms.get', p, { sort_by: 'created_at', sort_dir: 'desc' }, api), ...page }, token),
                v3 ? this._org_options(token) : Promise.resolve(undefined),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            const items = pg.items.map(to_realm_row);
            return { kind: 'realms', filter: 'all', items, total: pg.total, ...page, counts: { all: pg.total }, hub_wide: v3, needs_org: false, unsupported: [], sortable: sortable_keys('realms.get', api), ...(org_options ? { org_options } : {}) };
        }

        if (p.kind === 'workspaces') {
            const [rows, daemons] = await Promise.all([
                this._reads.read('workspaces.get', { ...core_sort('workspaces.get', p, {}, api), ...page }, token),
                // Daemon names only label rows; without them `daemon_name` stays null.
                v3 ? best_effort(log, 'admin_workspace_daemons_failed', this._reads.read('daemons.get', { all: true, limit: 200 }, token), null) : Promise.resolve(null),
            ]);
            const d = data_of<Record<string, unknown>>(rows) ?? {};
            const list = (Array.isArray(d.workspaces) ? d.workspaces : []) as Array<Record<string, unknown>>;
            const names = new Map((daemons ? paged<Record<string, unknown>>(daemons).items : []).map((x) => [String(x.id), (x.name as string | null) ?? (x.hostname as string | null) ?? null]));
            const items = list.map((w) => to_workspace_row(w, names));
            return { kind: 'workspaces', filter: 'all', items, total: num(d.total) ?? items.length, ...page, counts: { all: num(d.total) ?? items.length }, hub_wide: true, needs_org: false, unsupported: [], sortable: sortable_keys('workspaces.get', api) };
        }

        if (p.kind === 'runs') {
            if (!v3 && !p.org_id) {
                return { kind: 'runs', filter: p.filter, items: [], total: 0, ...page, counts: {}, hub_wide: false, needs_org: true, unsupported: [], sortable: [] };
            }
            const range_ms = RANGE_MS[p.range];
            const scope: Record<string, unknown> = {
                ...(v3 ? { all: true } : {}), ...(p.org_id ? { org_id: p.org_id } : {}), ...q,
                ...(range_ms != null ? { since_ms: Math.floor((this._now() - range_ms) / 60_000) * 60_000 } : {}),
            };
            const state = (f: string) => (RUN_STATES[f] ? { state: RUN_STATES[f] } : {});
            const keys = ['all', 'running', 'awaiting_input', 'failed', 'completed'] as const;
            const [rows, realms, org_options, ...counts] = await Promise.all([
                this._reads.read('runs.get', { ...scope, ...state(p.filter), ...core_sort('runs.get', p, { sort_by: 'started_at', sort_dir: 'desc' }, api), ...page }, token),
                this._realm_map(token, v3),
                v3 ? this._org_options(token) : Promise.resolve(undefined),
                ...keys.map((k) => count('runs.get', { ...scope, ...state(k) }, k)),
            ]);
            const pg = paged<Record<string, unknown>>(rows);
            const items = pg.items.map((r) => to_run_row(r, realms));
            return { kind: 'runs', filter: p.filter, items, total: pg.total, ...page, counts: Object.fromEntries(keys.map((k, i) => [k, counts[i] as number | null])), hub_wide: v3, needs_org: false, unsupported: [], sortable: sortable_keys('runs.get', api), ...(org_options ? { org_options } : {}) };
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
            const [res, realms] = await Promise.all([this._reads.read('runs.get_logs', body, token), this._realm_map(token, v3)]);
            const d = data_of<Record<string, unknown>>(res) ?? {};
            const lines = (Array.isArray(d.lines) ? d.lines : []) as Array<Record<string, unknown>>;
            const facets = (d.facets as { level?: Array<{ value: string; count: number }> } | undefined)?.level ?? [];
            const by_level = new Map(facets.map((f) => [f.value, f.count]));
            const items = lines.map((l) => to_log_row(l, realms));
            return {
                kind: 'logs', filter: p.filter, items, total: num(d.total) ?? items.length, ...page,
                // Level chip counts come from Core's level facet (only meaningful before a level is picked).
                counts: p.filter === 'all' ? { all: num(d.total), error: by_level.get('error') ?? 0, warn: by_level.get('warn') ?? 0, info: by_level.get('info') ?? 0, debug: by_level.get('debug') ?? 0 } : {},
                hub_wide: true, needs_org: false, unsupported: [], sortable: [],
            };
        }

        if (p.kind === 'scopes') {
            const [rows, org_options] = await Promise.all([
                this._reads.read('orgs.get_scopes', { ...(p.org_id ? { org_id: p.org_id } : {}), ...q, ...core_sort('orgs.get_scopes', p, {}, api), ...page }, token),
                this._org_options(token),
            ]);
            const pg = paged<Record<string, unknown>>(rows, 'scopes');
            const slug_by_org = new Map((org_options ?? []).map((o) => [o.id, o.slug]));
            const items = pg.items.map((s) => to_scope_row(s, slug_by_org));
            return { kind: 'scopes', filter: 'all', items, total: pg.total, ...page, counts: { all: pg.total }, hub_wide: true, needs_org: false, unsupported: [], sortable: sortable_keys('orgs.get_scopes', api), ...(org_options ? { org_options } : {}) };
        }

        // teams — Core's admin inventory needs `listed` set; answers PagedData<TeamData> (`items`).
        const listed = p.filter === 'listed';
        const [rows, c_listed, c_unlisted] = await Promise.all([
            this._reads.read('teams.get', { listed, ...q, ...core_sort('teams.get:catalog', p, {}, api), ...page }, token),
            count('teams.get', { listed: true, ...q }, 'listed'),
            count('teams.get', { listed: false, ...q }, 'unlisted'),
        ]);
        const pg = paged<Record<string, unknown>>(rows);
        return {
            kind: 'teams', filter: p.filter, items: pg.items.map(to_team_row), total: pg.total, ...page,
            counts: { listed: c_listed, unlisted: c_unlisted },
            hub_wide: true, needs_org: false, unsupported: [], sortable: sortable_keys('teams.get:catalog', api),
        };
    }
}
