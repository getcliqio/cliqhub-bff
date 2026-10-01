import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { RealmDaemonsDTO, RealmDaemonRowDTO } from '../types/dto.js';
import type { RealmDaemonsGetInput } from '../schemas/realm_daemons_schemas.js';
import { to_control_realm_dto } from '../types/mappers.js';

type Daemon_vo = { id: string; name: string | null; hostname: string | null; user_email: string | null; status: string; last_heartbeat: number | null; capacity?: number; created_at?: number };
type Coverage_row = { in_team_list?: boolean; installed_daemon_ids?: string[] };

/**
 * Realm › Daemons. Realms have few daemons (Core returns up to MAX), so
 * status counts, search and "teams ready" are computed here in one pass.
 */
export class RealmDaemonsService {
    static readonly MAX = 200;

    private _control: ControlRepository;
    private _teams: TeamsRepository;

    constructor(control: ControlRepository, teams: TeamsRepository) {
        this._control = control;
        this._teams = teams;
    }

    async get(token: string, p: RealmDaemonsGetInput): Promise<RealmDaemonsDTO> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const [daemons, running, coverage] = await Promise.allSettled([
            this._control.realm_daemons(realm_id, RealmDaemonsService.MAX, token) as Promise<{ items: Daemon_vo[]; total: number }>,
            this._control.runs({ realm_id, state: ['running', 'awaiting_input'], limit: 100 }, token),
            this._teams.get({ realm_id, limit: 100, offset: 0 } as never, token),
        ]);
        if (daemons.status === 'rejected') throw daemons.reason;
        const all = daemons.value.items;

        const running_by: Map<string, number> = new Map();
        if (running.status === 'fulfilled') for (const r of running.value.items) if (r.daemon_id) running_by.set(r.daemon_id, (running_by.get(r.daemon_id) ?? 0) + 1);

        const cov = coverage.status === 'fulfilled' ? (((coverage.value as { data?: { items?: Coverage_row[] } }).data?.items) ?? []) : null;
        const listed = cov ? cov.filter((t) => t.in_team_list) : [];
        const ready = (id: string) => listed.filter((t) => (t.installed_daemon_ids ?? []).includes(id)).length;

        const counts = { all: all.length, online: 0, stale: 0, offline: 0 };
        for (const d of all) if (d.status === 'online' || d.status === 'stale' || d.status === 'offline') counts[d.status]++;

        const q = p.q?.toLowerCase();
        const rows: RealmDaemonRowDTO[] = all
            .filter((d) => !p.status || d.status === p.status)
            .filter((d) => !q || [d.id, d.name, d.hostname].some((x) => x?.toLowerCase().includes(q)))
            .sort((a, b) => rank(a.status) - rank(b.status) || (b.last_heartbeat ?? 0) - (a.last_heartbeat ?? 0))
            .map((d) => ({
                id: d.id,
                name: d.name,
                hostname: d.hostname,
                owner_email: d.user_email,
                status: d.status,
                last_heartbeat: d.last_heartbeat,
                capacity: d.capacity ?? null,
                running: running_by.get(d.id) ?? 0,
                teams_ready: cov ? ready(d.id) : null,
            }));

        return {
            realm: to_control_realm_dto(realm),
            items: rows,
            counts,
            teams_total: cov ? listed.length : null,
            truncated: daemons.value.total > all.length,
            partial: running.status === 'rejected' || coverage.status === 'rejected',
        };
    }
}

function rank(s: string): number {
    return s === 'online' ? 0 : s === 'stale' ? 1 : s === 'offline' ? 2 : 3;
}
