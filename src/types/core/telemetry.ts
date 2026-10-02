/**
 * Run telemetry — response shapes as Core sends them (`/v1/runs/get_telemetry`).
 */

/** `runs/get_telemetry { kind: 'usage' }` → `data.run`: the Hub-priced usage snapshot of a run. */
export interface RunUsageSnapshotVO {
    total_tokens_in?: number;
    total_tokens_out?: number;
    total_cost_usd?: number;
    total_llm_calls?: number;
    /** phase name → `{ tokens_in, tokens_out, by_model: { key → { model, cost_usd } } }` */
    by_phase?: Record<string, Record<string, unknown>>;
    /** key → `{ model, provider, llm_calls, tokens_in, tokens_out, cost_usd }` */
    by_model?: Record<string, Record<string, unknown>>;
}
