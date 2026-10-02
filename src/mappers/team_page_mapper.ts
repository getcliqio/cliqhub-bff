/**
 * Build › Teams — Core team / run shapes → team list and team page data.
 *
 * Phases, roles and inputs come from a version's workflow (`teams/get_by_id`,
 * `teams/get_phases`); the readers here are tolerant of field spellings.
 */

import type { ControlRunVO } from '../types/core/control.js';
import type { TeamChangeData, TeamInputData, TeamPhaseData, TeamReleaseData, TeamRunRowData } from '../schemas/team_page_types.js';
import { to_run_row } from './realm_runs_mapper.js';

type Rec = Record<string, unknown>;

/** A realm as the team pages show it. */
export type TeamPageRealm = { id: string; slug: string; name: string; org_slug: string | null };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** `@scope/name`, or the bare name without a scope. */
export const label_of = (scope: string | null, name: string): string => (scope ? `@${scope}/${name}` : name);

/** Strings from a list of strings or objects (`{ run }`, `{ url }`, `{ to }` …). */
function strings(v: unknown, keys: string[]): string[] {
    return arr(v).map((x) => {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') for (const k of keys) { const s = str((x as Rec)[k]); if (s) return s; }
        return null;
    }).filter((x): x is string => Boolean(x));
}

/** Normalize one phase of a version's workflow (tolerant of field spellings). */
export function to_team_phase_data(raw: unknown, roles: Map<string, string>, support = false): TeamPhaseData | null {
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

/** Workflow (`{ phases, support }` or a bare phase list) + role briefs → phases and support phases. */
export function to_team_phases_data(workflow: unknown, roles_raw: unknown): { phases: TeamPhaseData[]; support: TeamPhaseData[] } {
    const roles = new Map<string, string>();
    for (const r of arr(roles_raw)) {
        const o = r as Rec;
        const n = str(o?.name);
        if (n) roles.set(n.replace(/\.md$/, ''), String(o.content_md ?? o.content ?? ''));
    }
    const w = (Array.isArray(workflow) ? { phases: workflow } : (workflow ?? {})) as Rec;
    const phases = arr(w.phases).map((x) => to_team_phase_data(x, roles)).filter((x): x is TeamPhaseData => Boolean(x));
    const support = arr(w.support).map((x) => to_team_phase_data(x, roles, true)).filter((x): x is TeamPhaseData => Boolean(x));
    return { phases, support };
}

/** Team inputs, from a list of `{ name, … }` or a `{ key: { description, required } }` map. */
export function to_team_inputs_data(raw: unknown): TeamInputData[] {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return Object.entries(raw as Rec).map(([name, v]) => {
            const o = (v && typeof v === 'object' ? v : {}) as Rec;
            return { name, description: str(o.description), required: Boolean(o.required), default: o.default != null ? String(o.default) : null, type: str(o.type) };
        });
    }
    return arr(raw).map((v) => {
        const o = (v ?? {}) as Rec;
        const name = str(o.name) ?? str(o.key);
        if (!name) return null;
        return { name, description: str(o.description), required: Boolean(o.required), default: o.default != null ? String(o.default) : null, type: str(o.type) };
    }).filter((x): x is TeamInputData => Boolean(x));
}

/** Phase-level differences between two versions (plus role and input changes). */
export function diff_versions(a: { phases: TeamPhaseData[]; inputs: TeamInputData[] }, b: { phases: TeamPhaseData[]; inputs: TeamInputData[] }): TeamChangeData[] {
    const out: TeamChangeData[] = [];
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

/** Version history (newest first) → releases; the first one is the latest. */
export function to_team_releases_data(raw: unknown): TeamReleaseData[] {
    const rows = arr(raw).map((v) => v as Rec).filter((v) => str(v.version));
    const latest = rows[0] ? String(rows[0].version) : null;
    return rows.map((v) => ({
        version: String(v.version),
        changelog: str(v.changelog),
        published_at: typeof v.published_at === 'number' ? v.published_at : (v.published_at ? Date.parse(String(v.published_at)) || null : null),
        is_latest: String(v.version) === latest,
    }));
}

/** A run row with its realm's slugs (null when the realm is not in `realms`). */
export function to_team_run_row(r: ControlRunVO, realms: Map<string, TeamPageRealm>): TeamRunRowData {
    const realm = r.realm_id ? realms.get(r.realm_id) : undefined;
    return { ...to_run_row(r), realm_id: r.realm_id ?? null, realm_slug: realm?.slug ?? null, org_slug: realm?.org_slug ?? null };
}
