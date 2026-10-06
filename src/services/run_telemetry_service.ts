/**
 * Run page › Timeline / Usage / DAG and the summary strip — one BFF read.
 * Core routes (all existing): runs/get_by_id, runs/get_status (phases),
 * runs/get_telemetry {kind:'usage'} (Hub-priced snapshot) and {kind:'spans'}
 * (OTEL: run.execute → phase.execute → agent.execute with flat `usage.*`),
 * realms/get_by_id (access gate — Core's run reads don't check the realm),
 * teams/get_phases (workflow: phase type + depends_on for the DAG).
 * Everything but the run and the realm gate is best-effort (`sections`).
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlRunPhaseVO, ControlRunVO } from '../types/core/control.js';
import type { RunUsageSnapshotVO } from '../types/core/telemetry.js';
import type {
    AgentKind, RunTelemetryData, RunTelemetryGetInput, TelemetryAgentData, TelemetryBarData, TelemetryModelData, TelemetryPhaseData,
} from '../schemas/run_telemetry_types.js';
import { ApiError } from '../errors/api_error.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.run_telemetry');

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
        const agent_spans = raw_spans.filter((s) => s.name === 'agent.execute').sort((a, b) => (ns_to_ms(a.start_unix_nano) ?? 0) - (ns_to_ms(b.start_unix_nano) ?? 0));
        const seen: Record<string, number> = {};
        const bars: TelemetryBarData[] = agent_spans.map((s) => {
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

        // ── Phases: status rows first (authoritative order), spans / usage / workflow merged in.
        const by_phase = obj(snap?.by_phase);
        const wf_by = new Map(wf.map((w) => [str(w.name) ?? '', w]));
        const names = rows.length ? rows.map((r) => r.phase) : [...new Set([...wf.map((w) => str(w.name) ?? ''), ...bars.map((b) => b.phase)])].filter(Boolean);
        const phase_cost = (n: string): number | null => sum(Object.values(obj(obj(by_phase[n]).by_model)).map((m) => num(obj(m).cost_usd)));
        const out_phases: TelemetryPhaseData[] = names.map((n, i) => {
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
                runs: Math.max(1, ps.length), gate_outcome: str(obj(ps[ps.length - 1]?.attributes)['gate.outcome']),
                depends_on: deps,
            };
        });

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
        const bm = Object.values(obj(snap?.by_model)).map(obj);
        const by_model: TelemetryModelData[] = bm.length
            ? bm.map((m) => { const model = str(m.model) ?? 'unknown'; return { model, provider: str(m.provider), calls: num(m.llm_calls), tokens_in: num(m.tokens_in) ?? 0, tokens_out: num(m.tokens_out) ?? 0, cached_in: sum(bars.filter((b) => b.model === model).map((b) => b.cached_in)), cost_usd: num(m.cost_usd) }; })
            : [...new Set(bars.filter((b) => b.model).map((b) => b.model as string))].map((model) => { const g = bars.filter((b) => b.model === model); return { model, provider: g[0].provider, calls: sum(g.map((b) => b.calls)), tokens_in: sum(g.map((b) => b.units_in)) ?? 0, tokens_out: sum(g.map((b) => b.units_out)) ?? 0, cached_in: sum(g.map((b) => b.cached_in)), cost_usd: sum(g.map((b) => b.cost_usd)) }; });
        by_model.sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0) || b.tokens_in - a.tokens_in);
        const agents = new Map<string, TelemetryBarData[]>();
        for (const b of bars) { const k = `${b.phase}\u0000${b.agent}`; agents.set(k, [...(agents.get(k) ?? []), b]); }
        const by_agent: TelemetryAgentData[] = [...agents.values()].map((g) => ({
            agent: g[0].agent, phase: g[0].phase, kind: g[0].kind, runs: g.length,
            duration_ms: g.reduce((a, b) => a + ((b.end_ms ?? now) - b.start_ms), 0),
            unit_kind: g[0].unit_kind, units_in: sum(g.map((b) => b.units_in)), units_out: sum(g.map((b) => b.units_out)),
            cost_usd: sum(g.map((b) => b.cost_usd)), failures: g.filter((b) => b.status === 'error').length, outcome: g[g.length - 1].outcome,
        })).sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0) || b.duration_ms - a.duration_ms);

        const token_bars = bars.filter((b) => b.unit_kind === 'tokens');
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
                cost_usd: num(snap?.total_cost_usd) ?? sum(bars.map((b) => b.cost_usd)),
                tokens_in: num(snap?.total_tokens_in) ?? sum(token_bars.map((b) => b.units_in)),
                tokens_out: num(snap?.total_tokens_out) ?? sum(token_bars.map((b) => b.units_out)),
                cached_in: sum(bars.map((b) => b.cached_in)),
                model_calls: num(snap?.total_llm_calls) ?? sum(bars.filter((b) => b.kind === 'llm').map((b) => b.calls)),
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
