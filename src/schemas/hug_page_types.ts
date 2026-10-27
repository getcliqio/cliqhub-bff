/**
 * Hug page — request schema (Zod, SoT for the inbound body) and response data.
 *
 * Routes (controllers/hug_page_controller.ts):
 *   POST /v1/hug_page/get — one Hug (prompt, context, requested inputs, responses) and its
 *                          run's workflow with each phase's status
 *
 * Core: hugs/get_by_id (runs.view on the Hug's realm); for the run, the run telemetry reads
 * (runs/get_by_id, realms/get_by_id, runs/get_status, teams/get_by_id + teams/get_phases).
 * Answers go to Core directly (`/v1/hugs/respond`, files through `/v1/artifacts/upload`).
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/hug_page/get */
export const HugPageGetInput = z.object({
    hug_id: z.string().min(1).max(200)
        .describe('Hug id'),
});
export type HugPageGetInput = z.infer<typeof HugPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One phase of the Hug's run, for the page's workflow graph. */
export interface HugPageRunPhaseData {
    name: string;
    /** Phase type (`standard`, `gate`, `team`, `map`), when the workflow says. */
    type: string | null;
    agent: string | null;
    /** Run status of the phase (`pending` before it starts). */
    status: string;
    depends_on: string[];
}

/** The Hug's run: which team, how far it has got. */
export interface HugPageRunData {
    run_id: string;
    run_name: string | null;
    state: string;
    /** `@scope/name`. */
    team_label: string | null;
    team_version: string | null;
    /** In workflow order. */
    phases: HugPageRunPhaseData[];
}

/** `hug_page/get` */
export interface HugPageData {
    /** Core `hugs/get_by_id` data as sent. */
    hug: Record<string, unknown>;
    /** The Hug's run for the workflow graph; null when it couldn't be read (the Hug still shows). */
    run: HugPageRunData | null;
}
