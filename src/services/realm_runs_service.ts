/**
 * Realm › Runs — one page of a realm's runs plus the state-chip counts.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/runs/get` (the page) + `/v1/runs/get { limit: 1 }` per count
 * (all, running, awaiting_input, failed+crashed 7d).
 */

import type { ControlRepository, ControlRunState } from '../repositories/control_repository.js';
import type { RealmRunRowData, RealmRunsData, RealmRunsGetInput } from '../schemas/realm_runs_types.js';
import { to_control_realm_data } from '../mappers/realm_inbox_mapper.js';
import { to_run_row } from '../mappers/realm_runs_mapper.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';
import { core_query, core_sort, sortable_keys } from '../lib/core_list.js';

const log = get_logger('svc.realm_runs');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Realm › Runs page read. */
export class RealmRunsService {
    /** Page size when the request sends none. */
    static readonly DEFAULT_LIMIT = 25;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _now: () => number = Date.now,
    ) {}

    /**
     * One page of runs (Core pages and filters) and the counts behind the state chips.
     * The page failing fails the call; a count failing is `null` and flags `partial`.
     *
     * @param p - Realm ref + filters (`state`, `q`, `since_ms`, `limit`, `offset`, `sort_by`, `sort_dir`).
     * @param token - Caller's Core token (session target_token).
     */
    async get(p: RealmRunsGetInput, token: string): Promise<RealmRunsData> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const limit = p.limit ?? RealmRunsService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const state: ControlRunState | ControlRunState[] | undefined = p.state === 'failed' ? ['failed', 'crashed'] : p.state;
        const week = this._now() - WEEK_MS;

        const count = (f: { state?: ControlRunState | ControlRunState[]; since_ms?: number }) =>
            this._control.runs({ realm_id, limit: 1, ...f }, token).then((x) => x.total);
        const [page, all, running, awaiting, failed] = await Promise.allSettled([
            this._control.runs({ realm_id, limit, offset, ...(state ? { state } : {}), ...core_query(p.q), ...(p.since_ms ? { since_ms: p.since_ms } : {}), ...core_sort('runs.get', p) }, token),
            count({}),
            count({ state: 'running' }),
            count({ state: 'awaiting_input' }),
            count({ state: ['failed', 'crashed'], since_ms: week }),
        ]);
        if (page.status === 'rejected') throw page.reason;
        warn_rejected(log, 'realm_runs_count_failed', { all, running, awaiting_input: awaiting, failed_7d: failed }, { realm_id });
        const n = (r: PromiseSettledResult<number>) => (r.status === 'fulfilled' ? r.value : null);

        const items = await this._with_parent_names(page.value.items.map(to_run_row), token);
        return {
            realm: to_control_realm_data(realm),
            items,
            total: page.value.total,
            offset,
            limit,
            counts: { all: n(all), running: n(running), awaiting_input: n(awaiting), failed_7d: n(failed) },
            partial: [all, running, awaiting, failed].some((r) => r.status === 'rejected'),
            sortable: sortable_keys('runs.get'),
        };
    }

    /**
     * Name each sub-team row's main run: from the page when it is there, else one
     * `runs/get_by_id` per distinct missing parent (best-effort; the name stays null).
     */
    private async _with_parent_names(rows: RealmRunRowData[], token: string): Promise<RealmRunRowData[]> {
        const on_page = new Map(rows.map((r) => [r.run_id, r.run_name]));
        const missing = [...new Set(rows.map((r) => r.parent?.run_id).filter((id): id is string => !!id && !on_page.has(id)))];
        const read = await Promise.allSettled(missing.map((id) => this._control.run_by_id(id, token)));
        const names = new Map(on_page);
        read.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) names.set(missing[i], r.value.run_name ?? null); });
        warn_rejected(log, 'realm_runs_parent_failed', Object.fromEntries(read.map((r, i) => [missing[i], r])), {});
        return rows.map((r) => (r.parent ? { ...r, parent: { ...r.parent, run_name: names.get(r.parent.run_id) ?? null } } : r));
    }
}
