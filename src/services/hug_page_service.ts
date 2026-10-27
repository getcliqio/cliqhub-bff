/**
 * Hug page — one BFF read: the Hug, and its run's team and workflow with each phase's status
 * (for the page's graph).
 * Core routes: hugs/get_by_id; the run through the run telemetry's light read.
 *
 * A Hug is seen like its run: Core lets in anyone with `runs.view` on the Hug's realm. Answers
 * go to Core directly (`/v1/hugs/respond`).
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { HugPageGetInput, HugPageData, HugPageRunData } from '../schemas/hug_page_types.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('svc.hug_page');

/** Reads a run's team and workflow with phase statuses (`RunTelemetryService.workflow_summary`). */
export type RunWorkflowReader = (run_id: string, token: string) => Promise<HugPageRunData>;

/** Core's `data` when the reply is enveloped, else the reply itself. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

/** Hug page read. */
export class HugPageService {
    constructor(private readonly _reads: CoreReadRepository, private readonly _run_workflow: RunWorkflowReader | null = null) {}

    /**
     * One Hug, as Core returns it.
     *
     * @param input - {@link HugPageGetInput}
     * @param token - Caller's Core token
     */
    async hug(input: HugPageGetInput, token: string): Promise<Record<string, unknown>> {
        return data_of<Record<string, unknown>>(await this._reads.read('hugs.get_by_id', { hug_id: input.hug_id }, token));
    }

    /**
     * The Hug page: the Hug, and its run's workflow. The run is best-effort — when it can't be
     * read the page still shows the Hug (`run: null`).
     *
     * @param input - {@link HugPageGetInput}
     * @param token - Caller's Core token
     */
    async get(input: HugPageGetInput, token: string): Promise<HugPageData> {
        const hug = await this.hug(input, token);
        const run_id = typeof hug.run_id === 'string' ? hug.run_id : '';
        let run: HugPageRunData | null = null;
        if (run_id && this._run_workflow) {
            try {
                run = await this._run_workflow(run_id, token);
            } catch (err) {
                log.warn('hug_page_run_failed', { hug_id: input.hug_id, run_id, error: err instanceof Error ? err.message : String(err) });
            }
        }
        return { hug, run };
    }
}
