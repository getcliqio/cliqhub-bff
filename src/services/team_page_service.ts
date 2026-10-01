import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { ControlRunVO } from '../types/vo.js';
import type {
    TeamChangeDTO, TeamHeaderDTO, TeamInputDTO, TeamInstallDTO, TeamListDTO, TeamListRowDTO,
    TeamPageDTO, TeamPhaseDTO, TeamRunRowDTO, TeamReleaseDTO,
} from '../types/dto.js';
import type { TeamListGetInput, TeamPageGetInput } from '../schemas/team_page_schemas.js';
import { is_newer, parse_label } from './realm_teams_service.js';
import { to_run_row } from './realm_runs_service.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
type Realm = { id: string; slug: string; name: string; org_slug: string | null };
type Rec = Record<string, unknown>;

// ── helpers ──────────────────────────────────────────────────────────────

async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

function items_of(res: unknown): { items: Rec[]; total: number } {
    const r = (res ?? {}) as { data?: unknown; items?: Rec[]; teams?: Rec[]; total?: number };
    const p = (r.data && typeof r.data === 'object' ? r.data : r) as { items?: Rec[]; teams?: Rec[]; rows?: Rec[]; total?: number };
    const items = p.items ?? p.teams ?? p.rows ?? [];
    return { items, total: typeof p.total === 'number' ? p.total : items.length };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const label_of = (scope: string | null, name: string) => (scope ? `@${scope}/${name}` : name);

/** Strings from a list of strings or objects (`{ run }`, `{ url }`, `{ to }` …). */
function strings(v: unknown, keys: string[]): string[] {
    return arr(v).map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') for (const k of keys) { const s = str((x as Rec)[k]); if (s) return s; }
        return null;
    }).filter((x): x is string => Boolean(x));
}

/** Normalize one phase of a version's workflow (tolerant of field spellings). */
export function to_phase(raw: unknown, roles: Map<string, string>, support = false): TeamPhaseDTO | null {
    if (!raw || typeof raw !== 'object') return null;
    const p = raw as Rec;
    const name = str(p.name) ?? str(p.id);
    if (!name) return null;
    const review = p.review ?? p.hug ?? p.human_review;
    const review_obj = review && typeof review === 'object' ? review as Rec : null;
    const reviewers = review_obj ? (str(review_obj.reviewers) ?? (Array.isArray(review_obj.reviewers) ? (review_obj.reviewers as unknown[]).join(', ') : null)) : null;
    const max = typeof p.max_iterations === 'number' ? p.max_iterations : null;
    return {
        name,
        type: str(p.type) ?? 'standard',
        agent: str(p.agent),
        depends_on: strings(p.depends_on ?? p.needs, ['name']),
        review: Boolean(review),
        reviewers,
        max_iterations: max,
        commands: strings(p.commands, ['run', 'name']),
        sources: strings(p.sources, ['url', 'name']),
        targets: strings(p.targets ?? p.target_entries, ['to', 'file', 'name']),
        team: str(p.team) ?? str(p.uses) ?? null,
        role: roles.get(name) ?? (str(p.role) ? roles.get(String(p.role)) ?? null : null),
        support,
    };
}

const CONNECTOR_AGENTS = new Set(['jira', 'confluence', 'zendesk', 'datadog', 'hubspot', 'gdrive', 's3', 'mesh']);

/**
 * Phase kind as the builder names it (FE lib/builder/kinds): type + agent.
 * gate+hug → human; standard+exec/curl/connector → script/fetch/connector.
 */
export function kind_of_phase(type: string, agent: string | null): string {
    if (type === 'team') return 'team';
    if (type === 'gate') return agent === 'hug' ? 'human' : 'gate';
    if (type === 'pull' || type === 'push') return agent === 'curl' ? 'fetch' : 'connector';
    if (agent === 'exec') return 'script';
    if (agent === 'curl') return 'fetch';
    if (agent && CONNECTOR_AGENTS.has(agent)) return 'connector';
    return type === 'standard' ? 'agent' : type;
}

export function to_phases(workflow: unknown, roles_raw: unknown): { phases: TeamPhaseDTO[]; support: TeamPhaseDTO[] } {
    const roles = new Map<string, string>();
    for (const r of arr(roles_raw)) {
        const o = r as Rec;
        const n = str(o?.name);
        if (n) roles.set(n.replace(/\.md$/, ''), String(o.content_md ?? o.content ?? ''));
    }
    const w = (Array.isArray(workflow) ? { phases: workflow } : (workflow ?? {})) as Rec;
    const phases = arr(w.phases).map((x) => to_phase(x, roles)).filter((x): x is TeamPhaseDTO => Boolean(x));
    const support = arr(w.support).map((x) => to_phase(x, roles, true)).filter((x): x is TeamPhaseDTO => Boolean(x));
    return { phases, support };
}

function to_inputs(raw: unknown): TeamInputDTO[] {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        // `{ key: { description, required } }` form
        return Object.entries(raw as Rec).map(([name, v]) => {
            const o = (v && typeof v === 'object' ? v : {}) as Rec;
            return { name, description: str(o.description), required: Boolean(o.required), default: o.default != null ? String(o.default) : null };
        });
    }
    return arr(raw).map((v) => {
        const o = (v ?? {}) as Rec;
        const name = str(o.name) ?? str(o.key);
        if (!name) return null;
        return { name, description: str(o.description), required: Boolean(o.required), default: o.default != null ? String(o.default) : null };
    }).filter((x): x is TeamInputDTO => Boolean(x));
}

/** Phase-level differences between two versions (plus role and input changes). */
export function diff_versions(a: { phases: TeamPhaseDTO[]; inputs: TeamInputDTO[] }, b: { phases: TeamPhaseDTO[]; inputs: TeamInputDTO[] }): TeamChangeDTO[] {
    const out: TeamChangeDTO[] = [];
    const A = new Map(a.phases.map((p) => [p.name, p]));
    const B = new Map(b.phases.map((p) => [p.name, p]));
    for (const [n, p] of B) {
        const o = A.get(n);
        if (!o) { out.push({ kind: 'added', target: 'phase', name: n, detail: `new ${p.type} phase${p.depends_on.length ? ` after ${p.depends_on.join(', ')}` : ''}` }); continue; }
        const d: string[] = [];
        if (o.type !== p.type) d.push(`type ${o.type} → ${p.type}`);
        if ((o.agent ?? '') !== (p.agent ?? '')) d.push(`agent ${o.agent ?? '—'} → ${p.agent ?? '—'}`);
        if (o.depends_on.join(',') !== p.depends_on.join(',')) d.push(`depends on [${o.depends_on.join(', ')}] → [${p.depends_on.join(', ')}]`);
        if (o.max_iterations !== p.max_iterations) d.push(`max_iterations ${o.max_iterations ?? '—'} → ${p.max_iterations ?? '—'}`);
        if (o.review !== p.review) d.push(p.review ? 'human review added' : 'human review removed');
        if (o.commands.join('\n') !== p.commands.join('\n')) d.push('commands changed');
        if (o.sources.join('\n') !== p.sources.join('\n') || o.targets.join('\n') !== p.targets.join('\n')) d.push('sources/targets changed');
        if (d.length) out.push({ kind: 'changed', target: 'phase', name: n, detail: d.join(' · ') });
        if ((o.role ?? '') !== (p.role ?? '')) {
            const lines = (s: string | null) => new Set((s ?? '').split('\n'));
            const lo = lines(o.role); const lp = lines(p.role);
            const add = [...lp].filter((x) => !lo.has(x)).length; const del = [...lo].filter((x) => !lp.has(x)).length;
            out.push({ kind: o.role && p.role ? 'changed' : p.role ? 'added' : 'removed', target: 'role', name: `roles/${n}.md`, detail: `+${add} −${del} lines` });
        }
    }
    for (const n of A.keys()) if (!B.has(n)) out.push({ kind: 'removed', target: 'phase', name: n, detail: 'phase removed' });
    const ia = new Set(a.inputs.map((i) => i.name)); const ib = new Set(b.inputs.map((i) => i.name));
    const added = [...ib].filter((x) => !ia.has(x)); const removed = [...ia].filter((x) => !ib.has(x));
    if (added.length || removed.length) out.push({ kind: 'changed', target: 'inputs', name: 'inputs', detail: [added.length ? `+ ${added.join(', ')}` : '', removed.length ? `− ${removed.join(', ')}` : ''].filter(Boolean).join(' · ') });
    return out;
}

function to_versions(raw: unknown): TeamReleaseDTO[] {
    const rows = arr(raw).map((v) => v as Rec).filter((v) => str(v.version));
    const latest = rows[0] ? String(rows[0].version) : null;
    return rows.map((v) => ({
        version: String(v.version),
        changelog: str(v.changelog),
        published_at: typeof v.published_at === 'number' ? v.published_at : (v.published_at ? Date.parse(String(v.published_at)) || null : null),
        is_latest: String(v.version) === latest,
    }));
}

function run_row(r: ControlRunVO, realms: Map<string, Realm>): TeamRunRowDTO {
    const realm = r.realm_id ? realms.get(r.realm_id) : undefined;
    return { ...to_run_row(r), realm_id: r.realm_id ?? null, realm_slug: realm?.slug ?? null, org_slug: realm?.org_slug ?? null };
}

// ── service ──────────────────────────────────────────────────────────────

/**
 * Build › Teams. The list and every team-page tab in one BFF read each,
 * composed from existing Core routes as the bearer (the session's target token).
 */
export class TeamPageService {
    static readonly DEFAULT_LIMIT = 25;
    /** Realms inspected for "installed in" — beyond this the answer is marked partial. */
    static readonly REALM_CAP = 25;

    private _control: ControlRepository;
    private _teams: TeamsRepository;
    private _now: () => number;

    constructor(control: ControlRepository, teams: TeamsRepository, now: () => number = Date.now) {
        this._control = control;
        this._teams = teams;
        this._now = now;
    }

    private async _realms(token: string, org_id?: string): Promise<{ items: Realm[]; total: number }> {
        const r = await this._control.realms_page({ ...(org_id ? { org_id } : {}), limit: 100, offset: 0 }, token);
        return { items: r.items.map((x) => ({ id: x.id, slug: x.slug, name: x.name || x.slug, org_slug: x.org_slug ?? null })), total: r.total };
    }

    /** Install rows per realm (full roster per realm), keyed by team label. */
    private async _installs_by_label(token: string, realms: Realm[], latest: (label: string) => string | null, only?: { name: string; scope: string | null }): Promise<{ map: Map<string, TeamInstallDTO[]>; failed: boolean }> {
        const map = new Map<string, TeamInstallDTO[]>();
        let failed = false;
        await map_limited(realms, 4, async (realm) => {
            try {
                const res = items_of(await this._teams.get({ realm_id: realm.id, limit: only ? 20 : 200, offset: 0, ...(only ? { query: only.name } : {}) } as never, token));
                for (const row of res.items) {
                    const { scope, slug } = parse_label(str(row.label) ?? undefined, String(row.slug ?? row.name ?? ''));
                    const label = label_of(scope, slug);
                    if (only && label !== label_of(only.scope, only.name)) continue;
                    const installed = Number(row.installed_count ?? 0);
                    if (!row.in_team_list && installed === 0) continue;
                    const version = str(row.version);
                    const entry: TeamInstallDTO = {
                        realm_id: realm.id, realm_slug: realm.slug, realm_name: realm.name, org_slug: realm.org_slug,
                        version, behind: is_newer(latest(label), version),
                        in_team_list: Boolean(row.in_team_list), installed_count: installed,
                        online_daemon_count: Number(row.online_daemon_count ?? 0),
                        last_run_at: typeof row.last_run_at === 'number' ? row.last_run_at : null,
                        missing_agents: arr(row.missing_agents).map(String),
                    };
                    map.set(label, [...(map.get(label) ?? []), entry]);
                }
            } catch {
                failed = true;
            }
        });
        for (const v of map.values()) v.sort((a, b) => a.realm_slug.localeCompare(b.realm_slug));
        return { map, failed };
    }

    // ── list ─────────────────────────────────────────────────────────────

    async list(token: string, p: TeamListGetInput): Promise<TeamListDTO> {
        const limit = p.limit ?? TeamPageService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const status = p.status ?? 'all';
        // Core's "mine" list is unpaged: every team in the caller's scopes + their drafts.
        const all = items_of(await this._teams.get({ mine: true } as never, token)).items
            .filter((t) => !p.scope || t.scope === p.scope)
            .filter((t) => {
                if (!p.q) return true;
                const q = p.q.toLowerCase();
                return String(t.name ?? '').toLowerCase().includes(q) || String(t.description ?? '').toLowerCase().includes(q);
            });
        const status_of = (t: Rec): 'draft' | 'published' => (t.status === 'draft' || t.visibility === 'draft' ? 'draft' : 'published');
        const counts = { all: all.length, published: all.filter((t) => status_of(t) === 'published').length, draft: all.filter((t) => status_of(t) === 'draft').length };
        const filtered = status === 'all' ? all : all.filter((t) => status_of(t) === status);
        const page = filtered.slice(offset, offset + limit);

        const realms_res = await this._realms(token, p.org_id).catch(() => null);
        const realms = realms_res?.items.slice(0, TeamPageService.REALM_CAP) ?? [];
        const latest = new Map(page.map((t) => [label_of(str(t.scope), String(t.name)), str(t.latest_version) && t.latest_version !== '0.0.0' ? String(t.latest_version) : null]));

        const [phases, installs] = await Promise.all([
            map_limited(page, 6, async (t) => {
                if (!str(t.id)) return null;
                try {
                    const r = await this._teams.get_phases({ team_id: String(t.id) }, token);
                    const ps = to_phases({ phases: r.phases }, []).phases;
                    return { types: ps.map((x) => x.type), kinds: ps.map((x) => kind_of_phase(x.type, x.agent)) };
                } catch { return null; }
            }),
            this._installs_by_label(token, realms, (l) => latest.get(l) ?? null),
        ]);

        const items: TeamListRowDTO[] = page.map((t, i) => {
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
        };
    }

    // ── one team, one tab ────────────────────────────────────────────────

    async page(token: string, p: TeamPageGetInput): Promise<TeamPageDTO> {
        const view = p.view ?? 'overview';
        // get_by_id is also the visibility gate (404 when the caller can't see it).
        const raw = await this._teams.get_by_id({ name: p.name, scope: p.scope, ...(p.version ? { version: p.version } : {}) }, token) as unknown as Rec;
        const team_id = String(raw.id);
        const versions = to_versions(raw.versions);
        const latest_version = versions[0]?.version ?? null;
        const { phases, support } = to_phases(raw.workflow, raw.roles);
        const inputs = to_inputs(raw.inputs);
        const status: 'draft' | 'published' = raw.status === 'draft' || raw.visibility === 'draft' ? 'draft' : 'published';
        const scope = str(raw.scope);
        const name = String(raw.name ?? p.name);
        const header: TeamHeaderDTO = {
            id: team_id, name, scope, label: label_of(scope, name),
            description: String(raw.description ?? ''), status, latest_version,
            version: p.version ?? latest_version, versions,
            author: str(raw.author), listed: raw.listed !== false,
            tags: arr(raw.tags).map(String),
            can_edit: Boolean(raw.can_edit), can_delete: Boolean(raw.can_delete), can_toggle_listing: Boolean(raw.can_toggle_listing),
        };
        const run_scope = { team_id, ...(p.org_id ? { org_id: p.org_id } : {}) };
        const runs_total = this._control.runs_for_team({ ...run_scope, limit: 1 }, token).then((r) => r.total).catch(() => null);

        const dto: TeamPageDTO = { team: header, counts: { phases: phases.length, versions: versions.length, runs: null }, view, partial: false };
        const latest_of = () => latest_version;

        if (view === 'overview') {
            const realms = await this._realms(token, p.org_id).catch(() => null);
            const inst = realms ? await this._installs_by_label(token, realms.items.slice(0, TeamPageService.REALM_CAP), latest_of, { name, scope }) : null;
            const agents = [...new Set([...phases, ...support].map((x) => x.agent).filter((x): x is string => Boolean(x)))];
            dto.overview = { phases, support, inputs, agents, latest: versions[0] ?? null, installs: inst?.map.get(label_of(scope, name)) ?? [] };
            dto.partial = !realms || Boolean(inst?.failed);
        } else if (view === 'workflow') {
            const realms = await this._realms(token, p.org_id).catch(() => null);
            const rmap = new Map((realms?.items ?? []).map((r) => [r.id, r]));
            const recent = await this._control.runs_for_team({ ...run_scope, limit: 8 }, token).catch(() => null);
            let overlay: NonNullable<TeamPageDTO['workflow']>['overlay'] = null;
            const run_id = p.run_id === 'latest' ? recent?.items[0]?.run_id : p.run_id;
            if (run_id) {
                // run_by_id is the access check for the run; statuses only after it.
                const run = await this._control.run_by_id(run_id, token).catch(() => null);
                if (run && run.team_id === team_id) {
                    const rows = await this._control.run_phases(run_id, token).catch(() => []);
                    const statuses: Record<string, string> = {};
                    for (const r of rows) statuses[r.phase] = r.status;
                    let run_phases: TeamPhaseDTO[] | null = null;
                    let run_version: string | null = null;
                    const vid = str(run.team_version_id);
                    if (vid) {
                        const g = await this._teams.get_phases({ team_id, version_id: vid }, token).catch(() => null);
                        run_version = g?.version ?? null;
                        if (g && run_version !== header.version) run_phases = to_phases({ phases: g.phases }, raw.roles).phases;
                    }
                    overlay = { run: run_row(run, rmap), version: run_version, phases: run_phases, statuses };
                }
            }
            dto.workflow = { phases, support, recent_runs: (recent?.items ?? []).map((r) => run_row(r, rmap)), overlay };
            dto.partial = !recent;
        } else if (view === 'files') {
            const files: Array<{ path: string; kind: 'yaml' | 'md'; content: string }> = [];
            const manifest = str(raw.raw_manifest) ?? str(raw.team_json);
            if (manifest) files.push({ path: 'team.yml', kind: 'yaml', content: manifest });
            if (str(raw.readme)) files.push({ path: 'README.md', kind: 'md', content: String(raw.readme) });
            for (const r of arr(raw.roles)) {
                const o = r as Rec; const n = str(o.name);
                if (n) files.push({ path: `roles/${n.replace(/\.md$/, '')}.md`, kind: 'md', content: String(o.content_md ?? '') });
            }
            dto.files = { files };
        } else if (view === 'runs') {
            const limit = p.limit ?? TeamPageService.DEFAULT_LIMIT;
            const offset = p.offset ?? 0;
            const base = { ...run_scope, ...(p.realm_id ? { realm_id: p.realm_id } : {}) };
            const state = p.state === 'failed' ? (['failed', 'crashed'] as const) : p.state;
            const since = p.state === 'failed' ? this._now() - WEEK_MS : undefined;
            const [realms, page, all, running, awaiting, failed] = await Promise.allSettled([
                this._realms(token, p.org_id),
                this._control.runs_for_team({ ...base, ...(state ? { state: state as never } : {}), ...(since ? { since_ms: since } : {}), ...(p.q ? { query: p.q } : {}), limit, offset }, token),
                this._control.runs_for_team({ ...base, limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: 'running', limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: 'awaiting_input', limit: 1 }, token),
                this._control.runs_for_team({ ...base, state: ['failed', 'crashed'], since_ms: this._now() - WEEK_MS, limit: 1 }, token),
            ]);
            if (page.status === 'rejected') throw page.reason;
            const n = (r: PromiseSettledResult<{ total: number }>) => (r.status === 'fulfilled' ? r.value.total : null);
            const rl = realms.status === 'fulfilled' ? realms.value.items : [];
            const rmap = new Map(rl.map((r) => [r.id, r]));
            dto.runs = {
                items: page.value.items.map((r) => run_row(r, rmap)), total: page.value.total, offset, limit,
                counts: { all: n(all), running: n(running), awaiting_input: n(awaiting), failed_7d: n(failed) },
                realms: rl,
            };
            dto.partial = [realms, all, running, awaiting, failed].some((r) => r.status === 'rejected');
            if (all.status === 'fulfilled') dto.counts.runs = all.value.total;
        } else if (view === 'installs') {
            const realms = await this._realms(token, p.org_id);
            const checked = realms.items.slice(0, TeamPageService.REALM_CAP);
            const inst = await this._installs_by_label(token, checked, latest_of, { name, scope });
            const items = inst.map.get(label_of(scope, name)) ?? [];
            const have = new Set(items.map((i) => i.realm_id));
            dto.installs = { items, not_installed: checked.filter((r) => !have.has(r.id)), realms_checked: checked.length, realms_total: realms.total };
            dto.partial = inst.failed || realms.total > checked.length;
        } else if (view === 'versions') {
            let compare: NonNullable<TeamPageDTO['versions']>['compare'] = null;
            const to = p.compare_to ?? header.version ?? latest_version;
            const from = p.compare_from ?? versions[versions.findIndex((v) => v.version === to) + 1]?.version;
            if (to && from && from !== to) {
                const load = async (v: string) => {
                    if (v === header.version) return { phases, inputs };
                    const r = await this._teams.get_by_id({ name: p.name, scope: p.scope, version: v }, token) as unknown as Rec;
                    return { phases: to_phases(r.workflow, r.roles).phases, inputs: to_inputs(r.inputs) };
                };
                try {
                    const [a, b] = await Promise.all([load(from), load(to)]);
                    compare = { from, to, changes: diff_versions(a, b) };
                } catch {
                    dto.partial = true;
                }
            }
            dto.versions = { items: versions, compare };
        }

        if (dto.counts.runs === null) dto.counts.runs = await runs_total;
        return dto;
    }
}
