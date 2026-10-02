/**
 * Build › Teams — the team list and one team's page, tab by tab.
 *
 * Composes Core routes as the bearer (the session's target token):
 *   teams/get { mine }        — the caller's teams (paged; read in full)
 *   teams/get { realm_id }    — a realm's roster with coverage ("installed in")
 *   teams/get_by_id           — the team (also the visibility gate), any version
 *   teams/get_phases          — phase shape per team / per run version
 *   realms/get                — realms to check for installs
 *   runs/get { team_id }, runs/get_by_id, runs/get_status — runs and the workflow overlay
 */

import type { ControlOrgTeamVO, ControlOrgVO, ControlRepository, ControlRunState } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { TeamVO } from '../types/core/teams.js';
import {
    CATALOG_HAS,
    type CatalogHas, type TeamCatalogFacetsData, type TeamCatalogRowData,
    type TeamListGetInput, type TeamPageGetInput,
    type TeamHeaderData, type TeamInstallData, type TeamListData, type TeamListRowData, type TeamPageData, type TeamPhaseData,
} from '../schemas/team_page_types.js';
import { ApiError } from '../errors/api_error.js';
import { is_newer, parse_label } from '../mappers/realm_teams_mapper.js';
import {
    type TeamPageRealm, label_of, kind_of_phase, to_team_phases_data, to_team_inputs_data, diff_versions,
    to_team_releases_data, to_team_run_row,
} from '../mappers/team_page_mapper.js';
import { core_query, core_sort, sortable_keys } from '../lib/core_list.js';
import { get_logger } from '../lib/log.js';
import { best_effort, error_fields, warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.team_page');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Page size for reading the caller's whole "mine" list (Core's max). */
const MINE_PAGE = 200;
/** Core caps catalog pages at 100. */
const CATALOG_PAGE = 100;

/** `[value, count]` pairs, most frequent first, then by value. */
function count_by(values: string[]): Array<[string, number]> {
    const m = new Map<string, number>();
    for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
type Realm = TeamPageRealm;

// ── helpers ──────────────────────────────────────────────────────────────

/** `fn` over `items`, at most `limit` at a time; results keep input order. */
async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

/** A non-blank string, or null. */
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

// ── service ──────────────────────────────────────────────────────────────

/** Build › Teams. The list and every team-page tab in one BFF read each. */
export class TeamPageService {
    /** Page size for the list and the runs tab. */
    static readonly DEFAULT_LIMIT = 25;
    /** `team_list/get` sort keys (sorted here, over the whole list). */
    static readonly SORTABLE = ['name', 'status'] as const;
    /** Marketplace sort keys. */
    static readonly CATALOG_SORTABLE = ['popular', 'newest', 'updated', 'name'] as const;
    /** Most catalog teams the marketplace reads. */
    static readonly CATALOG_CAP = 1000;
    /** Realms inspected for "installed in" — beyond this the answer is marked partial. */
    static readonly REALM_CAP = 25;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
        private readonly _now: () => number = Date.now,
    ) {}

    /** First 100 realms the caller sees (optionally one org's), with the total. */
    private async _realms(token: string, org_id?: string): Promise<{ items: Realm[]; total: number }> {
        const r = await this._control.realms_page({ ...(org_id ? { org_id } : {}), limit: 100, offset: 0 }, token);
        return { items: r.items.map((x) => ({ id: x.id, slug: x.slug, name: x.name || x.slug, org_slug: x.org_slug ?? null })), total: r.total };
    }

    /**
     * Install rows per realm (full roster per realm), keyed by team label.
     * A realm whose roster read fails is skipped (logged) and sets `failed`.
     */
    private async _installs_by_label(token: string, realms: Realm[], latest: (label: string) => string | null, only?: { name: string; scope: string | null }): Promise<{ map: Map<string, TeamInstallData[]>; failed: boolean }> {
        const map = new Map<string, TeamInstallData[]>();
        let failed = false;
        await map_limited(realms, 4, async (realm) => {
            try {
                const res = await this._teams.get({ realm_id: realm.id, limit: only ? 20 : 200, offset: 0, ...(only ? { query: only.name } : {}) }, token);
                for (const row of res.items ?? []) {
                    const { scope, slug } = parse_label(str(row.label) ?? undefined, String(row.slug ?? row.name ?? ''));
                    const label = label_of(scope, slug);
                    if (only && label !== label_of(only.scope, only.name)) continue;
                    const installed = Number(row.installed_count ?? 0);
                    if (!row.in_team_list && installed === 0) continue;
                    const version = str(row.version);
                    const entry: TeamInstallData = {
                        realm_id: realm.id, realm_slug: realm.slug, realm_name: realm.name, org_slug: realm.org_slug,
                        version, behind: is_newer(latest(label), version),
                        in_team_list: Boolean(row.in_team_list), installed_count: installed,
                        online_daemon_count: Number(row.online_daemon_count ?? 0),
                        last_run_at: typeof row.last_run_at === 'number' ? row.last_run_at : null,
                        missing_agents: (row.missing_agents ?? []).map(String),
                    };
                    map.set(label, [...(map.get(label) ?? []), entry]);
                }
            } catch (err) {
                // One realm's roster missing only makes "installed in" partial; keep the rest.
                log.warn('team_installs_realm_failed', { realm_id: realm.id, ...error_fields(err) });
                failed = true;
            }
        });
        for (const v of map.values()) v.sort((a, b) => a.realm_slug.localeCompare(b.realm_slug));
        return { map, failed };
    }

    /** The caller's orgs, each with its team library (an org whose library can't be read is left out). */
    private async _org_libraries(token: string): Promise<Array<{ org: ControlOrgVO; teams: ControlOrgTeamVO[] }> | null> {
        const orgs = await best_effort(log, 'team_org_list_failed', this._control.my_orgs(token), null, {});
        if (!orgs) return null;
        const libs = await map_limited(orgs, 4, async (org) => {
            const teams = await best_effort(log, 'team_org_library_failed', this._control.org_teams(org.id, token), null, { org_id: org.id });
            return teams ? { org, teams } : null;
        });
        return libs.filter((x): x is { org: ControlOrgVO; teams: ControlOrgTeamVO[] } => x !== null);
    }

    // ── list ─────────────────────────────────────────────────────────────

    /** Every team in the caller's scopes (+ their drafts), read page by page. */
    private async _mine(token: string): Promise<TeamVO[]> {
        const first = await this._teams.get({ mine: true, limit: MINE_PAGE, offset: 0 }, token);
        const out = [...(first.items ?? [])];
        while (out.length < first.total) {
            const next = await this._teams.get({ mine: true, limit: MINE_PAGE, offset: out.length }, token);
            if (!next.items?.length) break;
            out.push(...next.items);
        }
        return out;
    }

    /**
     * The caller's teams: status counts, phase shape and "installed in" per row.
     * Filters and pages in the BFF over the full "mine" list.
     *
     * @param input - scope / status / q filters, org for "installed in", paging, sort (name | status)
     * @param token - The caller's Core token
     */
    async list(input: TeamListGetInput, token: string): Promise<TeamListData> {
        if (input.source === 'catalog') return this._catalog(input, token);
        if (input.sort_by && !(TeamPageService.SORTABLE as readonly string[]).includes(input.sort_by)) {
            throw new ApiError('invalid_params', `sort_by '${input.sort_by}' applies to the marketplace only`, 422, { field: 'sort_by' });
        }
        const limit = input.limit ?? TeamPageService.DEFAULT_LIMIT;
        const offset = input.offset ?? 0;
        const status = input.status ?? 'all';
        const all = (await this._mine(token))
            .filter((t) => !input.scope || t.scope === input.scope)
            .filter((t) => {
                if (!input.q) return true;
                const q = input.q.toLowerCase();
                return String(t.name ?? '').toLowerCase().includes(q) || String(t.description ?? '').toLowerCase().includes(q);
            });
        const status_of = (t: TeamVO): 'draft' | 'published' => (t.status === 'draft' || t.visibility === 'draft' ? 'draft' : 'published');
        const counts = { all: all.length, published: all.filter((t) => status_of(t) === 'published').length, draft: all.filter((t) => status_of(t) === 'draft').length };
        const filtered = status === 'all' ? [...all] : all.filter((t) => status_of(t) === status);
        // The BFF holds the whole list, so sorting here is correct across pages.
        if (input.sort_by) {
            const dir = input.sort_dir === 'desc' ? -1 : 1;
            const by_name = (a: TeamVO, b: TeamVO) => label_of(str(a.scope), String(a.name)).localeCompare(label_of(str(b.scope), String(b.name)));
            filtered.sort(input.sort_by === 'status'
                ? (a, b) => status_of(a).localeCompare(status_of(b)) * dir || by_name(a, b)
                : (a, b) => by_name(a, b) * dir);
        }
        const page = filtered.slice(offset, offset + limit);

        const realms_res = await best_effort(log, 'team_list_realms_failed', this._realms(token, input.org_id), null, { org_id: input.org_id });
        const realms = realms_res?.items.slice(0, TeamPageService.REALM_CAP) ?? [];
        const latest = new Map(page.map((t) => [label_of(str(t.scope), String(t.name)), str(t.latest_version) && t.latest_version !== '0.0.0' ? String(t.latest_version) : null]));

        const [phases, installs] = await Promise.all([
            map_limited(page, 6, async (t) => {
                if (!str(t.id)) return null;
                return best_effort(log, 'team_list_phases_failed', this._teams.get_phases({ team_id: String(t.id) }, token).then((r) => {
                    const ps = to_team_phases_data({ phases: r.phases }, []).phases;
                    return { types: ps.map((x) => x.type), kinds: ps.map((x) => kind_of_phase(x.type, x.agent)) };
                }), null, { team_id: t.id });
            }),
            this._installs_by_label(token, realms, (l) => latest.get(l) ?? null),
        ]);

        const items: TeamListRowData[] = page.map((t, i) => {
            const scope = str(t.scope);
            const name = String(t.name);
            const lv = latest.get(label_of(scope, name)) ?? null;
            return {
                id: str(t.id), name, scope, description: String(t.description ?? ''),
                status: status_of(t), latest_version: lv, author: str(t.author),
                phase_types: phases[i]?.types ?? null, phase_kinds: phases[i]?.kinds ?? null, installs: installs.map.get(label_of(scope, name)) ?? [],
            };
        });
        return {
            items, total: filtered.length, offset, limit, counts,
            realms_checked: realms.length, realms_total: realms_res?.total ?? 0,
            partial: !realms_res || installs.failed || (realms_res.total > realms.length),
            sortable: [...TeamPageService.SORTABLE],
        };
    }

    // ── marketplace ──────────────────────────────────────────────────────

    /** Every catalog team the caller can see, with workflow details, read page by page (capped). */
    private async _catalog_all(token: string): Promise<TeamVO[]> {
        const out: TeamVO[] = [];
        for (let offset = 0; offset < TeamPageService.CATALOG_CAP; offset += CATALOG_PAGE) {
            const page = await this._teams.get({ with_workflow: true, limit: CATALOG_PAGE, offset }, token);
            out.push(...(page.items ?? []));
            if (!page.items?.length || out.length >= page.total) break;
        }
        return out;
    }

    /**
     * The marketplace: every catalog team the caller can see, filtered, sorted
     * and paged here so facet counts cover the whole catalog. Install state is
     * read for one realm (`realm_id`) only.
     *
     * @param input - search, facets (tags, publisher scope, verified, has, runnable), realm, paging, sort
     * @param token - The caller's Core token
     */
    private async _catalog(input: TeamListGetInput, token: string): Promise<TeamListData> {
        const limit = input.limit ?? TeamPageService.DEFAULT_LIMIT;
        const offset = input.offset ?? 0;
        if (input.sort_by && !(TeamPageService.CATALOG_SORTABLE as readonly string[]).includes(input.sort_by)) {
            throw new ApiError('invalid_params', `sort_by '${input.sort_by}' does not apply to the marketplace`, 422, { field: 'sort_by' });
        }
        const q = input.q?.toLowerCase();
        const all = (await this._catalog_all(token)).filter((t) => !q
            || String(t.name ?? '').toLowerCase().includes(q)
            || String(t.description ?? '').toLowerCase().includes(q)
            || (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)));

        const realm = input.realm_id ? await best_effort(log, 'catalog_realm_failed', this._realm(token, input.realm_id), null, { realm_id: input.realm_id }) : null;
        const latest = new Map(all.map((t) => [label_of(str(t.scope), String(t.name)), str(t.latest_version) && t.latest_version !== '0.0.0' ? String(t.latest_version) : null]));
        const [installs, libraries] = await Promise.all([
            realm ? this._installs_by_label(token, [realm], (l) => latest.get(l) ?? null) : Promise.resolve(null),
            this._org_libraries(token),
        ]);
        const in_orgs = new Map<string, string[]>();
        for (const lib of libraries ?? []) for (const t of lib.teams) in_orgs.set(t.team_id, [...(in_orgs.get(t.team_id) ?? []), lib.org.slug]);

        const rows = all.map((t) => {
            const scope = str(t.scope);
            const name = String(t.name);
            const label = label_of(scope, name);
            const kinds = (t.phases ?? []).map((p) => kind_of_phase(p.type ?? 'standard', p.agent));
            const inst = installs?.map.get(label) ?? [];
            const runnable = inst.some((i) => i.installed_count > 0 && i.online_daemon_count > 0 && i.missing_agents.length === 0);
            const has = CATALOG_HAS.filter((h) => kinds.includes(h));
            return { t, scope, name, label, kinds, inst, catalog: {
                tags: (t.tags ?? []).map(String), install_count: t.install_count ?? 0,
                version_count: t.version_count ?? 0, fork_count: t.fork_count ?? 0, verified: t.verified === true,
                updated_at: typeof t.updated_at === 'number' ? t.updated_at : null, has, runnable,
                in_orgs: in_orgs.get(String(t.id)) ?? [],
            } satisfies TeamCatalogRowData };
        });

        const facets: TeamCatalogFacetsData = {
            tags: count_by(rows.flatMap((r) => r.catalog.tags)).map(([tag, count]) => ({ tag, count })),
            publishers: count_by(rows.map((r) => r.scope ?? '')).filter(([scope]) => scope)
                .map(([scope, count]) => ({ scope, count, verified: rows.some((r) => r.scope === scope && r.catalog.verified) })),
            has: Object.fromEntries(CATALOG_HAS.map((h) => [h, rows.filter((r) => r.catalog.has.includes(h)).length])) as Record<CatalogHas, number>,
            verified: rows.filter((r) => r.catalog.verified).length,
            installed: realm ? rows.filter((r) => r.inst.length > 0).length : null,
            runnable: realm ? rows.filter((r) => r.catalog.runnable).length : null,
        };

        const filtered = rows
            .filter((r) => !input.tags?.length || r.catalog.tags.some((tag) => input.tags!.includes(tag)))
            .filter((r) => !input.scope || r.scope === input.scope)
            .filter((r) => !input.verified || r.catalog.verified)
            .filter((r) => !input.has?.length || input.has.every((h) => r.catalog.has.includes(h)))
            .filter((r) => !input.runnable || r.catalog.runnable);

        const sort = input.sort_by ?? 'popular';
        const dir = input.sort_dir === 'asc' ? 1 : input.sort_dir === 'desc' ? -1 : (sort === 'name' ? 1 : -1);
        const by_label = (a: typeof rows[number], b: typeof rows[number]) => a.label.localeCompare(b.label);
        filtered.sort((a, b) => {
            const d = sort === 'name' ? by_label(a, b)
                : sort === 'newest' ? Number(a.t.created_at ?? 0) - Number(b.t.created_at ?? 0)
                    : sort === 'updated' ? Number(a.catalog.updated_at ?? 0) - Number(b.catalog.updated_at ?? 0)
                        : a.catalog.install_count - b.catalog.install_count;
            return d * dir || by_label(a, b);
        });

        const items: TeamListRowData[] = filtered.slice(offset, offset + limit).map((r) => ({
            id: str(r.t.id), name: r.name, scope: r.scope, description: String(r.t.description ?? ''),
            status: r.t.status === 'draft' || r.t.visibility === 'draft' ? 'draft' : 'published',
            latest_version: latest.get(r.label) ?? null, author: str(r.t.author),
            phase_types: (r.t.phases ?? []).map((p) => p.type ?? 'standard'), phase_kinds: r.kinds,
            installs: r.inst, catalog: r.catalog,
        }));
        return {
            items, total: filtered.length, offset, limit,
            counts: { all: rows.length, published: rows.length, draft: 0 },
            realms_checked: realm ? 1 : 0, realms_total: realm ? 1 : 0,
            partial: Boolean(input.realm_id && (!realm || installs?.failed)),
            sortable: [...TeamPageService.CATALOG_SORTABLE],
            facets,
        };
    }

    /** One realm the caller sees, by id. */
    private async _realm(token: string, realm_id: string): Promise<Realm | null> {
        const r = await this._control.realms_page({ limit: 100, offset: 0 }, token);
        const x = r.items.find((i) => i.id === realm_id);
        return x ? { id: x.id, slug: x.slug, name: x.name || x.slug, org_slug: x.org_slug ?? null } : null;
    }

    // ── one team, one tab ────────────────────────────────────────────────

    /**
     * One team: the header (permissions, versions, counts) plus the data of one tab (`view`).
     *
     * @param input - scope + name, the tab and its filters
     * @param token - The caller's Core token
     * @throws ApiError 404 when the caller cannot see the team (from teams/get_by_id)
     */
    async page(input: TeamPageGetInput, token: string): Promise<TeamPageData> {
        const view = input.view ?? 'overview';
        // get_by_id is also the visibility gate (404 when the caller can't see it).
        const raw = await this._teams.get_by_id({ name: input.name, scope: input.scope, ...(input.version ? { version: input.version } : {}) }, token);
        const team_id = String(raw.id);
        const versions = to_team_releases_data(raw.versions);
        const latest_version = versions[0]?.version ?? null;
        const { phases, support } = to_team_phases_data(raw.workflow, raw.roles);
        const inputs = to_team_inputs_data(raw.inputs);
        const status: 'draft' | 'published' = raw.status === 'draft' || raw.visibility === 'draft' ? 'draft' : 'published';
        const scope = str(raw.scope);
        const name = String(raw.name ?? input.name);
        const header: TeamHeaderData = {
            id: team_id, name, scope, label: label_of(scope, name),
            description: String(raw.description ?? ''), status, latest_version,
            version: input.version ?? latest_version, versions,
            author: str(raw.author), listed: raw.listed !== false,
            tags: (raw.tags ?? []).map(String),
            can_edit: Boolean(raw.can_edit), can_delete: Boolean(raw.can_delete), can_toggle_listing: Boolean(raw.can_toggle_listing),
            forked_from: raw.forked_from ?? null,
            fork_count: raw.fork_count ?? 0,
            draft_saved_at: raw.draft?.saved_at ?? null,
            orgs: null,
        };
        // Started now, awaited last: which of the caller's orgs have the team.
        const orgs = this._org_libraries(token).then((libraries) => (libraries ? libraries.map(({ org, teams }) => {
            const t = teams.find((x) => x.team_id === team_id);
            return {
                org_id: org.id, org_slug: org.slug, org_name: org.display_name || org.slug, role: org.role,
                in_library: Boolean(t), own: Boolean(t?.own), added_at: t?.added_at ?? null, added_by: t?.added_by ?? null,
                realms: t?.realms ?? [],
            };
        }) : null));
        const run_scope = { team_id, ...(input.org_id ? { org_id: input.org_id } : {}) };
        // Started now, awaited last (only when the tab didn't already count runs).
        const runs_total = best_effort(log, 'team_page_runs_total_failed', this._control.runs_for_team({ ...run_scope, limit: 1 }, token).then((r) => r.total), null, { team_id });

        const data: TeamPageData = { team: header, counts: { phases: phases.length, versions: versions.length, runs: null }, view, partial: false };
        const latest_of = () => latest_version;

        if (view === 'overview') {
            const realms = await best_effort(log, 'team_page_realms_failed', this._realms(token, input.org_id), null, { team_id, view });
            const inst = realms ? await this._installs_by_label(token, realms.items.slice(0, TeamPageService.REALM_CAP), latest_of, { name, scope }) : null;
            const agents = [...new Set([...phases, ...support].map((x) => x.agent).filter((x): x is string => Boolean(x)))];
            data.overview = { phases, support, inputs, agents, latest: versions[0] ?? null, installs: inst?.map.get(label_of(scope, name)) ?? [] };
            data.partial = !realms || Boolean(inst?.failed);
        } else if (view === 'workflow') {
            const realms = await best_effort(log, 'team_page_realms_failed', this._realms(token, input.org_id), null, { team_id, view });
            const rmap = new Map((realms?.items ?? []).map((r) => [r.id, r]));
            const recent = await best_effort(log, 'team_page_recent_runs_failed', this._control.runs_for_team({ ...run_scope, limit: 8 }, token), null, { team_id });
            let overlay: NonNullable<TeamPageData['workflow']>['overlay'] = null;
            const run_id = input.run_id === 'latest' ? recent?.items[0]?.run_id : input.run_id;
            if (run_id) {
                // run_by_id is the access check for the run; statuses only after it.
                const run = await best_effort(log, 'team_page_overlay_run_failed', this._control.run_by_id(run_id, token), null, { team_id, run_id });
                if (run && run.team_id === team_id) {
                    const rows = await best_effort(log, 'team_page_overlay_phases_failed', this._control.run_phases(run_id, token), [], { team_id, run_id });
                    const statuses: Record<string, string> = {};
                    for (const r of rows) statuses[r.phase] = r.status;
                    let run_phases: TeamPhaseData[] | null = null;
                    let run_version: string | null = null;
                    const vid = str(run.team_version_id);
                    if (vid) {
                        const g = await best_effort(log, 'team_page_overlay_workflow_failed', this._teams.get_phases({ team_id, version_id: vid }, token), null, { team_id, run_id, version_id: vid });
                        run_version = g?.version ?? null;
                        if (g && run_version !== header.version) run_phases = to_team_phases_data({ phases: g.phases }, raw.roles).phases;
                    }
                    overlay = { run: to_team_run_row(run, rmap), version: run_version, phases: run_phases, statuses };
                }
            }
            data.workflow = { phases, support, recent_runs: (recent?.items ?? []).map((r) => to_team_run_row(r, rmap)), overlay };
            data.partial = !recent;
        } else if (view === 'files') {
            const files: Array<{ path: string; kind: 'yaml' | 'md'; content: string }> = [];
            const manifest = str(raw.raw_manifest) ?? str(raw.team_json);
            if (manifest) files.push({ path: 'team.yml', kind: 'yaml', content: manifest });
            if (str(raw.readme)) files.push({ path: 'README.md', kind: 'md', content: String(raw.readme) });
            for (const r of raw.roles ?? []) {
                const n = str(r.name);
                if (n) files.push({ path: `roles/${n.replace(/\.md$/, '')}.md`, kind: 'md', content: String(r.content_md ?? '') });
            }
            data.files = { files };
        } else if (view === 'runs') {
            const limit = input.limit ?? TeamPageService.DEFAULT_LIMIT;
            const offset = input.offset ?? 0;
            const base = { ...run_scope, ...(input.realm_id ? { realm_id: input.realm_id } : {}) };
            const state: ControlRunState | ControlRunState[] | undefined = input.state === 'failed' ? ['failed', 'crashed'] : input.state;
            const since = input.state === 'failed' ? this._now() - WEEK_MS : undefined;
            const [realms, page, all, running, awaiting, failed] = await Promise.allSettled([
                this._realms(token, input.org_id),
                this._control.runs_for_team({ ...base, ...(state ? { state } : {}), ...(since ? { since_ms: since } : {}), ...core_query(input.q), ...core_sort('runs.get', input), limit, offset }, token),
                this._control.runs_for_team({ ...base, limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: 'running', limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: 'awaiting_input', limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: ['failed', 'crashed'], since_ms: this._now() - WEEK_MS, limit: 1 }, token),
            ]);
            if (page.status === 'rejected') throw page.reason;
            warn_rejected(log, 'team_page_runs_section_failed', { realms, all, running, awaiting_input: awaiting, failed_7d: failed }, { team_id });
            const n = (r: PromiseSettledResult<{ total: number }>) => (r.status === 'fulfilled' ? r.value.total : null);
            const rl = realms.status === 'fulfilled' ? realms.value.items : [];
            const rmap = new Map(rl.map((r) => [r.id, r]));
            data.runs = {
                items: page.value.items.map((r) => to_team_run_row(r, rmap)), total: page.value.total, offset, limit,
                counts: { all: n(all), running: n(running), awaiting_input: n(awaiting), failed_7d: n(failed) },
                realms: rl,
                sortable: sortable_keys('runs.get'),
            };
            data.partial = [realms, all, running, awaiting, failed].some((r) => r.status === 'rejected');
            if (all.status === 'fulfilled') data.counts.runs = all.value.total;
        } else if (view === 'run') {
            const realms = await this._realms(token);
            const inst = await this._installs_by_label(token, realms.items.slice(0, TeamPageService.REALM_CAP), latest_of, { name, scope });
            const runnable = (inst.map.get(label_of(scope, name)) ?? []).filter((i) => i.installed_count > 0 || i.in_team_list);
            const realm_id = runnable.find((i) => i.realm_id === input.realm_id)?.realm_id ?? runnable[0]?.realm_id ?? null;
            const [members, channels] = realm_id
                ? await Promise.all([
                    best_effort(log, 'team_run_members_failed', this._control.realm_members(realm_id, token), null, { team_id, realm_id }),
                    best_effort(log, 'team_run_channels_failed', this._control.realm_channels(realm_id, token), null, { team_id, realm_id }),
                ])
                : [[], []];
            data.run = {
                realms: runnable, realm_id, inputs,
                human_phases: phases.filter((p) => kind_of_phase(p.type, p.agent) === 'human' || p.review).map((p) => ({ name: p.name, default_reviewers: p.reviewers })),
                people: (members ?? []).filter((m) => m.member_type === 'user' && m.username).map((m) => ({ username: String(m.username), role: m.role }))
                    .sort((a, b) => a.username.localeCompare(b.username)),
                channels: (channels ?? []).map((c) => ({ name: c.name, enabled: Boolean(c.enabled), types: (c.destinations ?? []).map((d) => String(d.type)) }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
            };
            data.partial = inst.failed || members === null || channels === null;
        } else if (view === 'installs') {
            const realms = await this._realms(token, input.org_id);
            const checked = realms.items.slice(0, TeamPageService.REALM_CAP);
            const inst = await this._installs_by_label(token, checked, latest_of, { name, scope });
            const items = inst.map.get(label_of(scope, name)) ?? [];
            const have = new Set(items.map((i) => i.realm_id));
            data.installs = { items, not_installed: checked.filter((r) => !have.has(r.id)), realms_checked: checked.length, realms_total: realms.total };
            data.partial = inst.failed || realms.total > checked.length;
        } else if (view === 'versions') {
            let compare: NonNullable<TeamPageData['versions']>['compare'] = null;
            const to = input.compare_to ?? header.version ?? latest_version;
            const from = input.compare_from ?? versions[versions.findIndex((v) => v.version === to) + 1]?.version;
            if (to && from && from !== to) {
                const load = async (v: string) => {
                    if (v === header.version) return { phases, inputs };
                    const r = await this._teams.get_by_id({ name: input.name, scope: input.scope, version: v }, token);
                    return { phases: to_team_phases_data(r.workflow, r.roles).phases, inputs: to_team_inputs_data(r.inputs) };
                };
                try {
                    const [a, b] = await Promise.all([load(from), load(to)]);
                    compare = { from, to, changes: diff_versions(a, b) };
                } catch (err) {
                    // The versions list still renders; only the diff is missing.
                    log.warn('team_page_compare_failed', { team_id, from, to, ...error_fields(err) });
                    data.partial = true;
                }
            }
            data.versions = { items: versions, compare };
        }

        if (data.counts.runs === null) data.counts.runs = await runs_total;
        header.orgs = await orgs;
        return data;
    }
}
