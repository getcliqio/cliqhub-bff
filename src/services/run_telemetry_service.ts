/**
 * Run page › Timeline / Usage / DAG and the summary strip — one BFF read.
 * Core routes (all existing): runs/get_by_id, runs/get_status (phases),
 * runs/get_telemetry {kind:'usage'} (Hub-priced snapshot) and {kind:'spans'}
 * (OTEL: run.execute → phase.execute → agent.execute with flat `usage.*`),
 * realms/get_by_id (access gate — Core's run reads don't check the realm),
 * teams/get_phases (workflow: phase type + depends_on for the DAG), and for sub-teams
 * runs/get { parent_run_id } with each child's phases and spans (nested under the phase
 * that started it, `phases[].sub_runs`). Everything but the run and the realm gate is best-effort (`sections`).
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlRunPhaseVO, ControlRunVO } from '../types/core/control.js';
import type { RunUsageSnapshotVO } from '../types/core/telemetry.js';
import type {
    AgentKind, RunTelemetryData, RunTelemetryGetInput, TelemetryAgentData, TelemetryBarData, TelemetryModelData, TelemetryPhaseData,
    TelemetrySubRunData, TelemetrySubRunUsageData,
} from '../schemas/run_telemetry_types.js';
import { ApiError } from '../errors/api_error.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.run_telemetry');

/** Sub-team nesting levels read for the timeline, and sub-team runs read per level. */
const MAX_SUB_DEPTH = 3;
const MAX_SUB_RUNS = 50;

type Obj = Record<string, unknown>;
/** `v` as a plain record (not an array), or `{}`. */
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {});
/** A finite number (non-blank numeric strings too), or null. */
const num = (v: unknown): number | null => { const n = typeof v === 'string' && v.trim() ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? n : null; };
/** A non-empty string, or null. */
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
/** Core's `data` when the reply is enveloped, else the reply itself. */
const data_of = (res: unknown): unknown => { const r = obj(res); return 'data' in r ? r.data : res; };
/** OTEL nanoseconds (number or digit string — strings may exceed 2^53) → ms. */
function ns_to_ms(v: unknown): number | null {
    if (typeof v === 'number') return Math.round(v / 1e6);
    if (typeof v !== 'string' || !/^\d+$/.test(v)) return null;
    // A digits-only string always parses as a BigInt, so no catch is needed.
    return Number(BigInt(v) / 1000000n);
}
/** Agent kinds the page knows; anything else is `custom`. */
const KINDS: AgentKind[] = ['llm', 'gate', 'human', 'connector', 'shell', 'builder', 'custom'];
/** The bar's agent kind (`hug` is always human). */
function kind_of(agent: string, raw: unknown): AgentKind {
    if (agent === 'hug') return 'human';
    return KINDS.includes(raw as AgentKind) ? raw as AgentKind : 'custom';
}
/** Sum of the non-null values, or null when there are none. */
/** A sub-team run as read here: what the page gets, plus where it hangs and its models (for roll-up). */
type SubRun = TelemetrySubRunData & { parent_phase: string | null; models: TelemetryModelData[] };

/** Hang each sub-team run under the phase that started it (internal fields dropped). */
function attach_sub_runs(phases: TelemetryPhaseData[], subs: SubRun[]): void {
    for (const ph of phases) {
        const mine = subs.filter((r) => r.parent_phase === ph.name);
        if (mine.length) ph.sub_runs = mine.map(({ parent_phase: _p, models: _m, ...r }) => r);
    }
}

const sum = (xs: Array<number | null>): number | null => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

/** Total length of the union of [start, end) intervals. */
export function union_ms(iv: Array<[number, number]>): number {
    const s = iv.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
    let total = 0; let cur: [number, number] | null = null;
    for (const [a, b] of s) {
        if (!cur || a > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b);
    }
    if (cur) total += cur[1] - cur[0];
    return total;
}

/** One timeline bar per `agent.execute` span (reruns numbered per phase and agent). */
function to_bars(raw_spans: Obj[]): TelemetryBarData[] {
    const agent_spans = raw_spans.filter((s) => s.name === 'agent.execute').sort((a, b) => (ns_to_ms(a.start_unix_nano) ?? 0) - (ns_to_ms(b.start_unix_nano) ?? 0));
    const seen: Record<string, number> = {};
    return agent_spans.map((s) => {
        const a = obj(s.attributes);
        const agent = str(a['agent.name']) ?? str(a['usage.agent_name']) ?? 'agent';
        const phase = str(a['phase.name']) ?? '';
        const key = `${phase}/${agent}`;
        seen[key] = (seen[key] ?? 0) + 1;
        const start = ns_to_ms(s.start_unix_nano) ?? 0;
        const end = ns_to_ms(s.end_unix_nano);
        const outcome = str(a['usage.outcome']) ?? str(a['agent.outcome']);
        const cost = num(a['usage.cost_usd']);
        return {
            id: String(s.span_id ?? `${key}#${seen[key]}`),
            phase, agent,
            kind: kind_of(agent, a['usage.agent_kind'] ?? a['agent.kind']),
            model: str(a['usage.model']), provider: str(a['usage.provider']),
            start_ms: start, end_ms: end && end >= start ? end : null,
            status: s.status_code === 'ERROR' || outcome === 'failure' || outcome === 'failed' ? 'error' : end ? 'ok' : 'running',
            outcome, exit_code: num(a['usage.exit_code']) ?? num(a['agent.exit_code']),
            attempts: num(a['usage.attempts']), unit_kind: str(a['usage.unit_kind']),
            units_in: num(a['usage.units_in']), units_out: num(a['usage.units_out']),
            cached_in: num(a['usage.extras.cache_read_tokens']), calls: num(a['usage.external_calls']),
            cost_usd: cost, cost_estimated: false, run_index: seen[key],
        };
    });
}

/** Phase names: the status rows' order, else the workflow's, else the spans'. */
function phase_names(rows: ControlRunPhaseVO[], wf: Obj[], bars: TelemetryBarData[]): string[] {
    return rows.length ? rows.map((r) => r.phase) : [...new Set([...wf.map((w) => str(w.name) ?? ''), ...bars.map((b) => b.phase)])].filter(Boolean);
}

/** One entry per phase: status row, spans, bars, usage and workflow merged. */
/** Models a run used, from its usage snapshot (LLM calls only), else from its token bars. */
function to_models(snap: RunUsageSnapshotVO | null, bars: TelemetryBarData[]): TelemetryModelData[] {
    const bm = Object.values(obj(snap?.by_model)).map(obj);
    return bm.length
        ? bm.map((m) => { const model = str(m.model) ?? 'unknown'; return { model, provider: str(m.provider), calls: num(m.llm_calls), tokens_in: num(m.tokens_in) ?? 0, tokens_out: num(m.tokens_out) ?? 0, cached_in: sum(bars.filter((b) => b.model === model).map((b) => b.cached_in)), cost_usd: num(m.cost_usd) }; })
        : [...new Set(bars.filter((b) => b.model).map((b) => b.model as string))].map((model) => { const g = bars.filter((b) => b.model === model); return { model, provider: g[0].provider, calls: sum(g.map((b) => b.calls)), tokens_in: sum(g.map((b) => b.units_in)) ?? 0, tokens_out: sum(g.map((b) => b.units_out)) ?? 0, cached_in: sum(g.map((b) => b.cached_in)), cost_usd: sum(g.map((b) => b.cost_usd)) }; });
}

/**
 * Model usage of one run: cost, tokens, calls and cache, from its models only. Shell bytes and
 * connector calls are not tokens (Core's snapshot totals mix them in, so they aren't used here).
 */
function model_usage(models: TelemetryModelData[], cost_fallback: number | null): TelemetrySubRunUsageData {
    return {
        cost_usd: sum(models.map((m) => m.cost_usd)) ?? cost_fallback,
        tokens_in: models.length ? models.reduce((a, m) => a + m.tokens_in, 0) : null,
        tokens_out: models.length ? models.reduce((a, m) => a + m.tokens_out, 0) : null,
        cached_in: sum(models.map((m) => m.cached_in)),
        model_calls: sum(models.map((m) => m.calls)),
    };
}

/** Add `b` into `a` field by field (null + null stays null). */
function add_usage(a: TelemetrySubRunUsageData, b: TelemetrySubRunUsageData): TelemetrySubRunUsageData {
    const plus = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
    return { cost_usd: plus(a.cost_usd, b.cost_usd), tokens_in: plus(a.tokens_in, b.tokens_in), tokens_out: plus(a.tokens_out, b.tokens_out), cached_in: plus(a.cached_in, b.cached_in), model_calls: plus(a.model_calls, b.model_calls) };
}

/** Merge model rows by model + provider (a sub-team's models into its parent's). */
function merge_models(rows: TelemetryModelData[]): TelemetryModelData[] {
    const out = new Map<string, TelemetryModelData>();
    const plus = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
    for (const m of rows) {
        const k = `${m.provider ?? ''}\u0000${m.model}`;
        const prev = out.get(k);
        out.set(k, prev ? { ...prev, calls: plus(prev.calls, m.calls), tokens_in: prev.tokens_in + m.tokens_in, tokens_out: prev.tokens_out + m.tokens_out, cached_in: plus(prev.cached_in, m.cached_in), cost_usd: plus(prev.cost_usd, m.cost_usd) } : { ...m });
    }
    return [...out.values()];
}

function to_phases(names: string[], rows: ControlRunPhaseVO[], phase_spans: Obj[], bars: TelemetryBarData[], wf: Obj[], by_phase: Obj): TelemetryPhaseData[] {
    const wf_by = new Map(wf.map((w) => [str(w.name) ?? '', w]));
    const phase_cost = (n: string): number | null => sum(Object.values(obj(obj(by_phase[n]).by_model)).map((m) => num(obj(m).cost_usd)));
    return names.map((n, i) => {
        const r = rows.find((x) => x.phase === n);
        const ps = phase_spans.filter((s) => obj(s.attributes)['phase.name'] === n);
        const pb = bars.filter((b) => b.phase === n);
        const w = wf_by.get(n) ?? {};
        const type = str(obj(ps[0]?.attributes)['phase.type']) ?? str(w.type);
        const kind: AgentKind = pb.some((b) => b.kind === 'human') || str(w.agent) === 'hug' ? 'human'
            : (type ?? '').toUpperCase() === 'GATE' ? 'gate' : pb[0]?.kind ?? 'custom';
        const start = num(r?.started_at) ?? (ps.length ? Math.min(...ps.map((s) => ns_to_ms(s.start_unix_nano) ?? Infinity)) : null);
        const end = num(r?.completed_at) ?? (ps.length && ps.every((s) => ns_to_ms(s.end_unix_nano)) ? Math.max(...ps.map((s) => ns_to_ms(s.end_unix_nano) ?? 0)) : null);
        const bp = obj(by_phase[n]);
        const deps = Array.isArray(w.depends_on) ? (w.depends_on as unknown[]).map(String) : (i > 0 && !wf.length ? [names[i - 1]] : []);
        return {
            name: n, kind, type, status: r?.status ?? (pb.some((b) => b.status === 'running') ? 'running' : pb.length ? 'completed' : 'pending'),
            start_ms: start !== null && Number.isFinite(start) ? start : null, end_ms: end,
            duration_ms: start !== null && end !== null && Number.isFinite(start) ? Math.max(0, end - start) : null,
            cost_usd: phase_cost(n), tokens_in: num(bp.tokens_in) ?? sum(pb.filter((b) => b.unit_kind === 'tokens').map((b) => b.units_in)),
            tokens_out: num(bp.tokens_out) ?? sum(pb.filter((b) => b.unit_kind === 'tokens').map((b) => b.units_out)),
            // A route-back re-runs the phase's agent without a new phase span: count agent runs too.
            runs: Math.max(1, ps.length, ...pb.map((b) => b.run_index ?? 1)), gate_outcome: str(obj(ps[ps.length - 1]?.attributes)['gate.outcome']),
            depends_on: deps, error: str(r?.error),
        };
    });
}

/** Run page › Timeline / Usage / DAG read. */
export class RunTelemetryService {
    constructor(private readonly _reads: CoreReadRepository, private readonly _control: ControlRepository) {}

    /**
     * The run's team workflow. `run.team_id` is the team's install on a daemon,
     * not the published team `teams/get_phases` reads — so the published team is
     * found by the run's `@scope/name` label (`teams/get_by_id { scope, name }`).
     * `team_id` is tried first for runs that do carry a published id.
     */
    private async _workflow(run: ControlRunVO, team_id: string, version_id: string | null, token: string): Promise<unknown> {
        const label = /^@?([^/\s]+)\/([^/\s]+)$/.exec(str(run.team_label) ?? '');
        try {
            return await this._reads.read('teams.get_phases', { team_id, ...(version_id ? { version_id } : {}) }, token);
        } catch (err) {
            if (!label || !(err instanceof ApiError) || err.status !== 404) throw err;
        }
        const team = data_of(await this._reads.read('teams.get_by_id', { scope: label[1], name: label[2] }, token)) as { id?: string };
        if (!team?.id) return null;
        // version_id names a published version of that team, so it still applies.
        return this._reads.read('teams.get_phases', { team_id: team.id, ...(version_id ? { version_id } : {}) }, token);
    }

    /**
     * The sub-team runs a run started, each with its own phases and agent bars, nested to
     * `MAX_SUB_DEPTH` levels. Best-effort: a child that can't be read is left out (logged).
     *
     * @param run_id - The parent run.
     * @param token - Caller's Core token.
     * @param depth - Nesting level of the children being read (1 = direct sub-teams).
     */
    private async _sub_runs(run_id: string, token: string, depth: number): Promise<SubRun[]> {
        if (depth > MAX_SUB_DEPTH) return [];
        let children: ControlRunVO[];
        try {
            children = (await this._control.child_runs(run_id, token, MAX_SUB_RUNS)).items ?? [];
        } catch (err) {
            log.warn('run_telemetry_sub_runs_failed', { run_id, error: err instanceof Error ? err.message : String(err) });
            return [];
        }
        const read = async (child: ControlRunVO): Promise<SubRun | null> => {
            try {
                const [rows, spans, usage] = await Promise.all([
                    this._control.run_phases(child.run_id, token),
                    this._reads.read('runs.get_telemetry', { kind: 'spans', run_id: child.run_id }, token),
                    // Usage is optional: without it the sub-team still shows, with no cost.
                    this._reads.read('runs.get_telemetry', { kind: 'usage', run_id: child.run_id }, token).catch(() => null),
                ]);
                const snap = usage ? ((obj(data_of(usage)).run as RunUsageSnapshotVO | null) ?? null) : null;
                const raw: Obj[] = ((d) => (Array.isArray(d) ? d.map(obj) : []))(data_of(spans));
                const bars = to_bars(raw);
                const phases = to_phases(phase_names(rows, [], bars), rows, raw.filter((x) => x.name === 'phase.execute'), bars, [], obj(snap?.by_phase));
                const grand = await this._sub_runs(child.run_id, token, depth + 1);
                attach_sub_runs(phases, grand);
                // Its own models plus its sub-teams' (they roll up into the parent run's totals).
                const models = merge_models([...to_models(snap, bars), ...grand.flatMap((g) => g.models)]);
                return {
                    run_id: child.run_id, run_name: str(child.run_name), team: str(child.team_label), state: child.state,
                    error: str(child.error), start_ms: num(child.started_at), end_ms: num(child.completed_at),
                    phases, bars, usage: model_usage(models, num(snap?.total_cost_usd)), parent_phase: str(child.parent_phase), models,
                };
            } catch (err) {
                log.warn('run_telemetry_sub_run_failed', { run_id: child.run_id, error: err instanceof Error ? err.message : String(err) });
                return null;
            }
        };
        return (await Promise.all(children.map(read))).filter((r): r is SubRun => r !== null);
    }

    /**
     * Timeline / usage / DAG of one run. The run and the realm gate are required;
     * usage, spans, phase rows and the workflow are best-effort (`sections`, `partial`).
     *
     * @param p - {@link RunTelemetryGetInput}
     * @param token - Caller's Core token
     * @param now - Clock for live runs (tests)
     */
    async get(p: RunTelemetryGetInput, token: string, now: number = Date.now()): Promise<RunTelemetryData> {
        const run: ControlRunVO | null = await this._control.run_by_id(p.run_id, token);
        if (!run) throw ApiError.not_found('Run not found');
        // Gate: Core's run reads don't check realm membership; the realm read does.
        if (run.realm_id) await this._control.realm_by_id(run.realm_id, token);

        const team_id = str(run.team_id);
        const version_id = str((run as Obj).team_version_id);
        const [usage, spans, phases, workflow] = await Promise.allSettled([
            this._reads.read('runs.get_telemetry', { kind: 'usage', run_id: p.run_id }, token),
            this._reads.read('runs.get_telemetry', { kind: 'spans', run_id: p.run_id }, token),
            this._control.run_phases(p.run_id, token),
            team_id ? this._workflow(run, team_id, version_id, token) : Promise.resolve(null),
        ]);

        warn_rejected(log, 'run_telemetry_section_failed', { usage, spans, phases, workflow }, { run_id: p.run_id });

        const snap: RunUsageSnapshotVO | null = usage.status === 'fulfilled' ? (obj(data_of(usage.value)).run as RunUsageSnapshotVO | null) ?? null : null;
        const raw_spans: Obj[] = spans.status === 'fulfilled' ? ((d) => (Array.isArray(d) ? d.map(obj) : []))(data_of(spans.value)) : [];
        const rows: ControlRunPhaseVO[] = phases.status === 'fulfilled' ? phases.value : [];
        const wf: Obj[] = workflow.status === 'fulfilled' && workflow.value ? ((d) => (Array.isArray(d.phases) ? d.phases.map(obj) : []))(obj(data_of(workflow.value))) : [];

        // ── Bars: agent.execute spans (phase.execute kept for phase outcome / reruns).
        const phase_spans = raw_spans.filter((s) => s.name === 'phase.execute');
        const bars = to_bars(raw_spans);

        // ── Phases: status rows first (authoritative order), spans / usage / workflow merged in.
        const by_phase = obj(snap?.by_phase);
        const names = phase_names(rows, wf, bars);
        const out_phases = to_phases(names, rows, phase_spans, bars, wf, by_phase);
        // Sub-teams: each child run hangs under the phase that started it (best-effort).
        const sub = await this._sub_runs(p.run_id, token, 1);
        attach_sub_runs(out_phases, sub);

        // ── Agent cost: reported on the span, else the phase's Hub-priced model cost split by token share.
        for (const ph of names) {
            const models = obj(obj(by_phase[ph]).by_model);
            for (const m of Object.values(models).map(obj)) {
                const model = str(m.model); const c = num(m.cost_usd);
                if (!model || c === null) continue;
                const group = bars.filter((b) => b.phase === ph && b.model === model && b.cost_usd === null);
                const w = group.reduce((a, b) => a + (b.units_in ?? 0) + (b.units_out ?? 0), 0);
                for (const b of group) { b.cost_usd = w ? c * (((b.units_in ?? 0) + (b.units_out ?? 0)) / w) : c / group.length; b.cost_estimated = true; }
            }
        }

        // ── Window + time split.
        const t0 = num(run.started_at) ?? (bars.length ? Math.min(...bars.map((b) => b.start_ms)) : null);
        const live = run.state === 'running' || run.state === 'awaiting_input';
        const t1 = num(run.completed_at) ?? (live ? now : bars.length ? Math.max(...bars.map((b) => b.end_ms ?? now)) : null);
        const iv = (k: (b: TelemetryBarData) => boolean): Array<[number, number]> => bars.filter(k).map((b) => [b.start_ms, b.end_ms ?? now]);
        const total = t0 !== null && t1 !== null ? Math.max(0, t1 - t0) : null;
        const covered = union_ms(iv(() => true));
        const time = {
            working_ms: union_ms(iv((b) => b.kind === 'llm' || b.kind === 'builder' || b.kind === 'custom')),
            people_ms: union_ms(iv((b) => b.kind === 'human')),
            gates_ms: union_ms(iv((b) => b.kind === 'gate')),
            other_ms: union_ms(iv((b) => b.kind === 'shell' || b.kind === 'connector')),
            queued_ms: total !== null && bars.length ? Math.max(0, total - covered) : 0,
        };

        // ── Models and agents.
        // This run's models plus its sub-teams': a run's cost includes the sub-teams it started.
        const own_models = to_models(snap, bars);
        const by_model = merge_models([...own_models, ...sub.flatMap((r) => r.models)]);
        const own_usage = model_usage(own_models, num(snap?.total_cost_usd) ?? sum(bars.map((b) => b.cost_usd)));
        const usage_total = sub.reduce((acc, r) => add_usage(acc, r.usage), own_usage);
        by_model.sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0) || b.tokens_in - a.tokens_in);
        const agents = new Map<string, TelemetryBarData[]>();
        for (const b of bars) { const k = `${b.phase}\u0000${b.agent}`; agents.set(k, [...(agents.get(k) ?? []), b]); }
        const by_agent: TelemetryAgentData[] = [...agents.values()].map((g) => ({
            agent: g[0].agent, phase: g[0].phase, kind: g[0].kind, runs: g.length,
            duration_ms: g.reduce((a, b) => a + ((b.end_ms ?? now) - b.start_ms), 0),
            unit_kind: g[0].unit_kind, units_in: sum(g.map((b) => b.units_in)), units_out: sum(g.map((b) => b.units_out)),
            cost_usd: sum(g.map((b) => b.cost_usd)), failures: g.filter((b) => b.status === 'error').length, outcome: g[g.length - 1].outcome,
        })).sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0) || b.duration_ms - a.duration_ms);

        const sections = {
            usage: usage.status === 'rejected' ? 'error' as const : snap ? 'ok' as const : 'empty' as const,
            spans: spans.status === 'rejected' ? 'error' as const : raw_spans.length ? 'ok' as const : 'empty' as const,
            phases: phases.status === 'rejected' ? 'error' as const : rows.length ? 'ok' as const : 'empty' as const,
            workflow: workflow.status === 'rejected' ? 'error' as const : wf.length ? 'ok' as const : 'empty' as const,
        };
        return {
            run: { run_id: run.run_id, state: run.state, started_at: num(run.started_at), completed_at: num(run.completed_at) },
            window: { start_ms: t0, end_ms: t1 },
            totals: {
                duration_ms: total,
                cost_usd: usage_total.cost_usd,
                tokens_in: usage_total.tokens_in,
                tokens_out: usage_total.tokens_out,
                cached_in: usage_total.cached_in,
                model_calls: usage_total.model_calls,
                agent_runs: bars.length,
                reworks: out_phases.reduce((a, ph) => a + Math.max(0, ph.runs - 1), 0),
                time,
            },
            phases: out_phases,
            bars,
            by_model,
            by_agent,
            sections,
            partial: Object.values(sections).includes('error'),
        };
    }
}
