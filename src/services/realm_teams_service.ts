/**
 * Realm › Teams — a realm's teams with daemon coverage, the coverage-chip
 * counts and whether a newer published version exists.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/teams/get { realm_id }` (the page + one `limit: 1` read per chip count;
 * Core answers `{ items, total, offset, limit }`)
 * + `/v1/teams/get_versions { latest_only: true }` (→ `version`) for published teams on the page.
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { TeamsGetInput } from '../schemas/teams_types.js';
import type { TeamsGetVO } from '../types/core/teams.js';
import type { RealmTeamsData, RealmTeamsGetInput } from '../schemas/realm_teams_types.js';
import { to_control_realm_data } from '../mappers/realm_inbox_mapper.js';
import { parse_label, to_realm_team_row } from '../mappers/realm_teams_mapper.js';
import { get_logger } from '../lib/log.js';
import { best_effort, warn_rejected } from '../lib/best_effort.js';
import { core_query, core_sort, sortable_keys } from '../lib/core_list.js';

const log = get_logger('svc.realm_teams');

/** `fn` over `items`, at most `limit` at a time; results keep input order. */
async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

/** Tolerant read of a `teams/get` page. */
function page_of(res: TeamsGetVO): { items: TeamsGetVO['items']; total: number } {
    const items = Array.isArray(res?.items) ? res.items : [];
    return { items, total: typeof res?.total === 'number' ? res.total : items.length };
}

/** Realm › Teams page read. */
export class RealmTeamsService {
    /** Page size when the request sends none. */
    static readonly DEFAULT_LIMIT = 25;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
    ) {}

    /**
     * One page of the realm's teams (with coverage), chip counts and latest
     * published versions. The page failing fails the call; a count failing is
     * `null` and flags `partial`; a version lookup failing is ignored.
     *
     * @param p - Realm ref + filters (`q`, `coverage`, `limit`, `offset`, `sort_by`, `sort_dir`).
     * @param token - Caller's Core token (session target_token).
     */
    async get(p: RealmTeamsGetInput, token: string): Promise<RealmTeamsData> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const limit = p.limit ?? RealmTeamsService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const list = (f: Partial<TeamsGetInput>) =>
            this._teams.get({ realm_id, sort_by: 'team', sort_dir: 'asc', ...f }, token).then(page_of);

        const [page, all, full, partial, none] = await Promise.allSettled([
            list({ limit, offset, ...core_query(p.q), ...(p.coverage ? { coverage: p.coverage } : {}), ...core_sort('teams.get:realm', p) }),
            list({ limit: 1 }),
            list({ limit: 1, coverage: 'full' }),
            list({ limit: 1, coverage: 'partial' }),
            list({ limit: 1, coverage: 'none' }),
        ]);
        if (page.status === 'rejected') throw page.reason;
        warn_rejected(log, 'realm_teams_count_failed', { all, full, partial, none }, { realm_id });
        const n = (r: PromiseSettledResult<{ total: number }>) => (r.status === 'fulfilled' ? r.value.total : null);

        const base = page.value.items.map((r) => {
            const parsed = parse_label(r.label, r.slug ?? r.name ?? '');
            return { r, scope: parsed.scope ?? r.scope ?? null, slug: parsed.slug };
        });
        // Latest published version, for "update available" (published teams only).
        const latest = await map_limited(base, 6, async ({ r, scope, slug }) => {
            if (r.origin !== 'published' || !scope) return null;
            const v = await best_effort(
                log, 'realm_teams_latest_version_failed',
                this._teams.get_versions({ name: slug, scope, latest_only: true }, token), null,
                { realm_id, scope, team: slug },
            );
            return v?.version ?? v?.latest ?? null;
        });

        return {
            realm: to_control_realm_data(realm),
            items: base.map(({ r, scope, slug }, i) => to_realm_team_row(r, scope, slug, latest[i])),
            total: page.value.total,
            offset,
            limit,
            counts: { all: n(all), full: n(full), partial: n(partial), none: n(none) },
            partial: [all, full, partial, none].some((r) => r.status === 'rejected'),
            sortable: sortable_keys('teams.get:realm'),
        };
    }
}
