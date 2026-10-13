/**
 * Realms list — Core's `realms/get`, plus (with `with_stats`) how many of each realm's teams are
 * missing agent config, so the Realms table can say Ready / Missing agent config / No daemon available.
 *
 * Composes Core: `/v1/realms/get` (one page) → `/v1/teams/get { realm_id }` for each realm on the
 * page that has a daemon online (the rest show "No daemon available" anyway). A realm whose teams
 * read fails is left without the count (the table shows "Online"); the list never fails for it.
 */
import type { ProxyService } from './proxy_service.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import { get_logger } from '../lib/log.js';
import { error_fields } from '../lib/best_effort.js';

const log = get_logger('svc.realms_list');

/** A realm row as Core sends it with `with_stats` (only what we read). */
interface RealmRow { id?: unknown; online_daemons?: unknown; teams_missing_agents?: number }

export class RealmsListService {
    /** Teams read per realm (a realm's whole team list; realms have few). */
    static readonly TEAMS_LIMIT = 100;

    constructor(
        private readonly _proxy: ProxyService,
        private readonly _teams: TeamsRepository,
    ) {}

    /**
     * Core's response, unchanged — except that with `with_stats` each realm with a daemon online
     * gains `teams_missing_agents`.
     *
     * @param body - The `realms/get` body as sent (forwarded as is).
     * @param token - Caller's bearer token.
     * @param org_id - The `x-org-id` header, when sent.
     */
    async get(body: unknown, token: string, org_id?: string): Promise<Record<string, unknown>> {
        const res = await this._proxy.forward('/v1/realms/get', body, token, org_id);
        if (!(body as { with_stats?: unknown } | null)?.with_stats) return res;
        const items = (res.data as { items?: unknown } | undefined)?.items;
        if (!Array.isArray(items)) return res;
        await Promise.all((items as RealmRow[]).map(async (r) => {
            if (typeof r.id !== 'string' || !(Number(r.online_daemons) > 0)) return;
            try {
                const page = await this._teams.get({ realm_id: r.id, limit: RealmsListService.TEAMS_LIMIT }, token);
                const rows = Array.isArray(page?.items) ? page.items : [];
                r.teams_missing_agents = rows.filter((t) => (t.missing_agents?.length ?? 0) > 0).length;
            } catch (err) {
                log.warn('realm_missing_agents_failed', { realm_id: r.id, ...error_fields(err) });
            }
        }));
        return res;
    }
}
