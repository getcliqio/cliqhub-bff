/**
 * Realm › Daemons — a realm's daemons with status counts, what each is
 * running and how many of the realm's listed teams it has ready.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/daemons/get { realm_id }` + `/v1/runs/get { running | awaiting_input }`
 * + `/v1/teams/get { realm_id }` (`{ items, … }`; each item's `installed_daemon_ids`).
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { RealmDaemonsData, RealmDaemonsGetInput } from '../schemas/realm_daemons_types.js';
import { to_control_realm_data } from '../mappers/realm_inbox_mapper.js';
import { to_realm_daemon_row } from '../mappers/realm_daemons_mapper.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.realm_daemons');

/** Realm › Daemons page read. */
export class RealmDaemonsService {
    /** Daemons read per realm (realms have few). */
    static readonly MAX = 200;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
    ) {}

    /**
     * All of a realm's daemons (filtered by `status` / `q` here), status counts,
     * running runs per daemon and teams ready. The daemon read failing fails
     * the call; runs or teams failing flags `partial` (teams → `teams_ready: null`).
     *
     * @param p - Realm ref + filters (`status`, `q`).
     * @param token - Caller's Core token (session target_token).
     */
    async get(p: RealmDaemonsGetInput, token: string): Promise<RealmDaemonsData> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const [daemons, running, coverage] = await Promise.allSettled([
            this._control.realm_daemons(realm_id, RealmDaemonsService.MAX, token),
            this._control.runs({ realm_id, state: ['running', 'awaiting_input'], limit: 100 }, token),
            this._teams.get({ realm_id, limit: 100, offset: 0 }, token),
        ]);
        if (daemons.status === 'rejected') throw daemons.reason;
        warn_rejected(log, 'realm_daemons_section_failed', { running, teams: coverage }, { realm_id });
        const all = daemons.value.items;

        const running_by: Map<string, number> = new Map();
        if (running.status === 'fulfilled') for (const r of running.value.items) if (r.daemon_id) running_by.set(r.daemon_id, (running_by.get(r.daemon_id) ?? 0) + 1);

        const cov = coverage.status === 'fulfilled' ? (Array.isArray(coverage.value?.items) ? coverage.value.items : []) : null;
        const listed = cov ? cov.filter((t) => t.in_team_list) : [];
        const ready = (id: string) => listed.filter((t) => (t.installed_daemon_ids ?? []).includes(id)).length;

        const counts = { all: all.length, online: 0, stale: 0, offline: 0 };
        for (const d of all) if (d.status === 'online' || d.status === 'stale' || d.status === 'offline') counts[d.status]++;

        const q = p.q?.toLowerCase();
        const rows = all
            .filter((d) => !p.status || d.status === p.status)
            .filter((d) => !q || [d.id, d.name, d.hostname].some((x) => x?.toLowerCase().includes(q)))
            .sort((a, b) => rank(a.status) - rank(b.status) || (b.last_heartbeat ?? 0) - (a.last_heartbeat ?? 0))
            .map((d) => to_realm_daemon_row(d, running_by.get(d.id) ?? 0, cov ? ready(d.id) : null));

        return {
            realm: to_control_realm_data(realm),
            items: rows,
            counts,
            teams_total: cov ? listed.length : null,
            truncated: daemons.value.total > all.length,
            partial: running.status === 'rejected' || coverage.status === 'rejected',
        };
    }
}

/** Sort rank: online, stale, offline, then anything else. */
function rank(s: string): number {
    return s === 'online' ? 0 : s === 'stale' ? 1 : s === 'offline' ? 2 : 3;
}
