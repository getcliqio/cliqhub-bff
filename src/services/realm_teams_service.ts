/**
 * Realm › Teams — a realm's teams: the version the realm runs, the online daemons not on it, and whether a
 * newer published version exists.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/teams/get { realm_id }` (the page + one `limit: 1` read per chip count;
 * Core answers `{ items, total, offset, limit }`)
 * + `/v1/teams/get_versions { latest_only: true }` (→ `version`) for published teams on the page.
 */

import { realm_team_tree, uses_and_used_by, type RealmTreeTeam } from '../lib/team_tree.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { TeamsGetVO } from '../types/core/teams.js';
import type { RealmTeamRowData, RealmTeamsData, RealmTeamsGetInput } from '../schemas/realm_teams_types.js';
import { to_control_realm_data } from '../mappers/realm_inbox_mapper.js';
import { parse_label, to_realm_team_row } from '../mappers/realm_teams_mapper.js';
import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';
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

/** A realm `teams/get` row as the tree reads it: its label, installed version and installed tree (complete calls only). */
export function to_realm_tree_team(r: TeamsGetVO['items'][number]): RealmTreeTeam {
    const parsed = parse_label(r.label, r.slug ?? r.name ?? '');
    const label = r.label ?? (parsed.scope ? `@${parsed.scope}/${parsed.slug}` : parsed.slug);
    return {
        team_id: r.id ?? null, label, version: r.version ?? null, version_id: r.version_id ?? null,
        tree: (r.sub_teams ?? []).filter((c): c is typeof c & { parent_version_id: string; version_id: string; version: string; team_id: string } =>
            Boolean(c.parent_version_id && c.version_id && c.version && c.team_id)),
    };
}

/** The rows in the asked order, as Core would sort them: by team (label), or by origin then team. */
function sort_rows(items: TeamsGetVO['items'], by: string, dir: 'asc' | 'desc'): TeamsGetVO['items'] {
    const label = (r: TeamsGetVO['items'][number]) => to_realm_tree_team(r).label;
    const cmp = (a: TeamsGetVO['items'][number], b: TeamsGetVO['items'][number]) =>
        (by === 'origin' ? String(a.origin ?? '').localeCompare(String(b.origin ?? '')) : 0) || label(a).localeCompare(label(b));
    const sorted = [...items].sort(cmp);
    return dir === 'desc' ? sorted.reverse() : sorted;
}

/** Tolerant read of a `teams/get` page. */
export function page_of(res: TeamsGetVO): { items: TeamsGetVO['items']; total: number } {
    const items = Array.isArray(res?.items) ? res.items : [];
    return { items, total: typeof res?.total === 'number' ? res.total : items.length };
}

/** Realm › Teams page read. */
export class RealmTeamsService {
    /** Page size when the request sends none. */
    static readonly DEFAULT_LIMIT = 25;
    /** The most teams the whole-list read takes (one Core page); a bigger realm pages in Core, all teams shown. */
    static readonly TREE_LIMIT = 200;
    /** Teams in Recently run. */
    static readonly RECENT = 5;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
    ) {}

    /**
     * One page of the realm's teams and their latest published versions. The page failing fails the call;
     * a version lookup failing is ignored.
     *
     * @param p - Realm ref + filters (`q`, `limit`, `offset`, `sort_by`, `sort_dir`).
     * @param token - Caller's Core token (session target_token).
     */
    async get(p: RealmTeamsGetInput, token: string): Promise<RealmTeamsData> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const limit = p.limit ?? RealmTeamsService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const show = p.show ?? 'teams';

        // The whole list (one read): who calls whom, the Teams view, Recently run and the counts all need it.
        const whole_page = await best_effort(log, 'realm_teams_tree_read_failed',
            this._teams.get({ realm_id, sort_by: 'team', sort_dir: 'asc', limit: RealmTeamsService.TREE_LIMIT, offset: 0 }, token).then(page_of), null, { realm_id });
        const whole = whole_page && whole_page.items.length >= whole_page.total ? whole_page.items : null;
        const tree_teams = (whole_page?.items ?? []).map(to_realm_tree_team);
        const { uses, used_by } = uses_and_used_by(tree_teams.flatMap((t) => t.tree.filter((c) => c.parent_version_id === t.version_id).map((c) => [t.label, c.ref] as const)));
        const label_of_row = (r: TeamsGetVO['items'][number]) => to_realm_tree_team(r).label;
        /** Called by another team in this realm. */
        const is_sub = (r: TeamsGetVO['items'][number]) => (used_by.get(label_of_row(r)) ?? []).some((caller) => caller !== label_of_row(r));

        // A search pages in Core over every team (sub-teams too). Otherwise, with the whole list read, the BFF
        // picks the view (Teams: not called by another team; All), takes out Recently run, then sorts and pages.
        let page_items: TeamsGetVO['items'];
        let total: number;
        let recent_items: TeamsGetVO['items'] = [];
        let shown: 'teams' | 'all' = 'all';
        if (p.q || !whole) {
            const page = await this._teams.get({ realm_id, sort_by: 'team', sort_dir: 'asc', limit, offset, ...core_query(p.q), ...core_sort('teams.get:realm', p) }, token).then(page_of);
            page_items = page.items;
            total = page.total;
        } else {
            shown = show;
            const in_view = show === 'teams' ? whole.filter((r) => !is_sub(r)) : whole;
            recent_items = [...in_view].filter((r) => typeof r.last_run_at === 'number')
                .sort((a, b) => (b.last_run_at ?? 0) - (a.last_run_at ?? 0)).slice(0, RealmTeamsService.RECENT);
            const rest = sort_rows(in_view.filter((r) => !recent_items.includes(r)), p.sort_by ?? 'team', p.sort_dir ?? 'asc');
            page_items = rest.slice(offset, offset + limit);
            total = rest.length;
        }

        const rows = async (items: TeamsGetVO['items']): Promise<RealmTeamRowData[]> => {
            const base = items.map((r) => {
                const parsed = parse_label(r.label, r.slug ?? r.name ?? '');
                return { r, scope: parsed.scope ?? r.scope ?? null, slug: parsed.slug };
            });
            // Latest published version, for "update available" (published teams only).
            const latest = await map_limited(base, 6, async ({ r, scope, slug }) => {
                if (r.origin !== 'hub' || !scope) return null;
                const v = await best_effort(
                    log, 'realm_teams_latest_version_failed',
                    this._teams.get_versions({ name: slug, scope, latest_only: true }, token), null,
                    { realm_id, scope, team: slug },
                );
                return v?.version ?? v?.latest ?? null;
            });
            return base.map(({ r, scope, slug }, i) => {
                const row = to_realm_team_row(r, scope, slug, latest[i]);
                return { ...row, uses: uses.get(row.label) ?? [], used_by: (used_by.get(row.label) ?? []).filter((c) => c !== row.label) };
            });
        };
        const [items, recent] = await Promise.all([rows(page_items), rows(recent_items)]);

        return {
            realm: to_control_realm_data(realm),
            items,
            recent,
            show: shown,
            counts: whole ? { teams: whole.filter((r) => !is_sub(r)).length, all: whole.length } : null,
            total,
            offset,
            limit,
            sortable: whole && !p.q ? ['team', 'origin'] : sortable_keys('teams.get:realm'),
            tree: whole_page ? realm_team_tree(tree_teams) : null,
        };
    }
}
