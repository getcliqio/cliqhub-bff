/**
 * Run page › Timeline / Usage / DAG — request schema (Zod, SoT for the inbound body) and response data.
 *
 * Routes (controllers/run_telemetry_controller.ts):
 *   POST /v1/run_telemetry/get — totals, phases, agent bars, per-model and per-agent usage of one run
 *
 * BFF composition over Core: runs/get_by_id, realms/get_by_id (gate), runs/get_status,
 * runs/get_telemetry { kind: 'usage' | 'spans' }, teams/get_phases.
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/run_telemetry/get */
export const RunTelemetryGetInput = z.object({
    run_id: z.string().min(1)
        .describe('Run id'),
});
export type RunTelemetryGetInput = z.infer<typeof RunTelemetryGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** What an agent is, for colouring and the time split (`hug` is always human). */
export type AgentKind = 'llm' | 'gate' | 'human' | 'connector' | 'shell' | 'builder' | 'custom';

/** One agent execution (an `agent.execute` span) on the timeline. */
export interface TelemetryBarData {
    id: string;
    phase: string;
    agent: string;
    kind: AgentKind;
    model: string | null;
    provider: string | null;
    start_ms: number;
    end_ms: number | null;
    status: 'ok' | 'error' | 'running';
    outcome: string | null;
    exit_code: number | null;
    attempts: number | null;
    unit_kind: string | null;
    units_in: number | null;
    units_out: number | null;
    cached_in: number | null;
    calls: number | null;
    cost_usd: number | null;
    /** Cost split from the phase's Hub-priced model cost (not reported on the span). */
    cost_estimated: boolean;
    /** 1-based run of this agent in this phase (reworks > 1). */
    run_index: number;
}

/** One workflow phase with its timing, cost and DAG edges. */
export interface TelemetryPhaseData {
    name: string;
    kind: AgentKind;
    type: string | null;
    status: string;
    start_ms: number | null;
    end_ms: number | null;
    duration_ms: number | null;
    cost_usd: number | null;
    tokens_in: number | null;
    tokens_out: number | null;
    runs: number;
    gate_outcome: string | null;
    depends_on: string[];
    /** Sub-team runs this phase started (a `uses:` / team phase), each with its own steps. */
    sub_runs?: TelemetrySubRunData[];
}

/** A sub-team run nested under the phase that started it. */
export interface TelemetrySubRunData {
    run_id: string;
    run_name: string | null;
    /** `@scope/name` of the sub-team. */
    team: string | null;
    state: string;
    /** Why it failed, as the run recorded it (e.g. a review that timed out or was rejected). */
    error: string | null;
    start_ms: number | null;
    end_ms: number | null;
    /** The sub-team's own steps (may nest further `sub_runs`). */
    phases: TelemetryPhaseData[];
    /** Agent bars of those steps (`phase` is the sub-team's phase name). */
    bars: TelemetryBarData[];
    /** Its model usage, its own sub-teams included (already counted in the parent run's totals). */
    usage: TelemetrySubRunUsageData;
}

/** Model usage of a sub-team run; null where nothing was reported. */
export interface TelemetrySubRunUsageData {
    cost_usd: number | null;
    tokens_in: number | null;
    tokens_out: number | null;
    cached_in: number | null;
    model_calls: number | null;
}

/** Usage per model. */
export interface TelemetryModelData {
    model: string;
    provider: string | null;
    calls: number | null;
    tokens_in: number;
    tokens_out: number;
    cached_in: number | null;
    cost_usd: number | null;
}

/** Usage per agent within a phase. */
export interface TelemetryAgentData {
    agent: string;
    phase: string;
    kind: AgentKind;
    runs: number;
    duration_ms: number;
    unit_kind: string | null;
    units_in: number | null;
    units_out: number | null;
    cost_usd: number | null;
    failures: number;
    outcome: string | null;
}

/** `run_telemetry/get` */
export interface RunTelemetryData {
    run: { run_id: string; state: string; started_at: number | null; completed_at: number | null };
    window: { start_ms: number | null; end_ms: number | null };
    totals: {
        duration_ms: number | null;
        cost_usd: number | null;
        tokens_in: number | null;
        tokens_out: number | null;
        cached_in: number | null;
        model_calls: number | null;
        agent_runs: number;
        reworks: number;
        time: { working_ms: number; people_ms: number; gates_ms: number; other_ms: number; queued_ms: number };
    };
    phases: TelemetryPhaseData[];
    bars: TelemetryBarData[];
    by_model: TelemetryModelData[];
    by_agent: TelemetryAgentData[];
    /** Per source: read ok, failed, or answered nothing. */
    sections: Record<'usage' | 'spans' | 'phases' | 'workflow', 'ok' | 'error' | 'empty'>;
    /** Some source failed. */
    partial: boolean;
}
