/**
 * Hug page — one BFF read: the Hug, and its run's team and workflow with each phase's status
 * (for the page's graph).
 * Core routes: hugs/get_by_id; the run through the run telemetry's light read; the rounds of the Hug's phase through
 * hugs/get { run_id } and each earlier round's hugs/get_by_id (who answered what).
 *
 * A Hug is seen like its run: Core lets in anyone with `runs.view` on the Hug's realm. Answers
 * go to Core directly (`/v1/hugs/respond`).
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { HugPageGetInput, HugPageData, HugPageRunData, HugRoundData } from '../schemas/hug_page_types.js';
import { get_logger } from '../lib/log.js';
import type { HugContentService } from './hug_content_service.js';

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
    constructor(
        private readonly _reads: CoreReadRepository,
        private readonly _run_workflow: RunWorkflowReader | null = null,
        private readonly _content: HugContentService | null = null,
    ) {}

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
     * The Hug page: the Hug, where its hug is framed from (`content_url`, PLAN-hug-widgets §11.2), and its run's
     * workflow. The run is best-effort — when it can't be read the page still shows the Hug (`run: null`).
     *
     * @param input - {@link HugPageGetInput}
     * @param token - Caller's Core token
     */
    async get(input: HugPageGetInput, token: string): Promise<HugPageData> {
        const hug = await this.hug(input, token);
        const content_url = this._content ? await this._content.content_url(hug.hug) : null;
        const run_id = typeof hug.run_id === 'string' ? hug.run_id : '';
        let run: HugPageRunData | null = null;
        if (run_id && this._run_workflow) {
            try {
                run = await this._run_workflow(run_id, token);
            } catch (err) {
                log.warn('hug_page_run_failed', { hug_id: input.hug_id, run_id, error: err instanceof Error ? err.message : String(err) });
            }
        }
        const rounds = run_id ? await this._rounds(hug, run_id, token) : [];
        return { hug, content_url, run, rounds };
    }

    /**
     * The rounds of the Hug's phase (each its own Hug, oldest first), with who answered what before this one —
     * PLAN owner, e2e 2026-11-10: "somewhere there should be a log of the iterations". Best-effort: [] on failure.
     */
    private async _rounds(hug: Record<string, unknown>, run_id: string, token: string): Promise<HugRoundData[]> {
        try {
            const list = data_of<{ items?: RunHugItem[] }>(await this._reads.read('hugs.get', { run_id, limit: 100 }, token));
            const same_phase = (list.items ?? []).filter((h) => h.phase === hug.phase);
            if (same_phase.length < 2) return [];
            // Numbered by order: a gate sent back (a new iteration) and a phase asking again in the same iteration
            // (a follow-up question) are both another round (e2e: three follow-ups all read "Round 1").
            return await Promise.all(same_phase.map(async (h, i): Promise<HugRoundData> => {
                const current = h.hug_id === hug.id;
                const answers = current ? [] : answers_of(data_of<Record<string, unknown>>(await this._reads.read('hugs.get_by_id', { hug_id: h.hug_id }, token)));
                return {
                    hug_id: h.hug_id, round: i + 1, status: h.status ?? 'open', outcome: h.outcome ?? null,
                    created_at: h.created_at ?? null, closed_at: h.closed_at ?? null, current, answers,
                };
            }));
        } catch (err) {
            log.warn('hug_page_rounds_failed', { hug_id: hug.id, run_id, error: err instanceof Error ? err.message : String(err) });
            return [];
        }
    }
}

/** One row of Core's `hugs/get { run_id }`. */
interface RunHugItem {
    hug_id: string;
    phase?: string;
    iteration?: number;
    status?: string;
    outcome?: string | null;
    created_at?: number | null;
    closed_at?: number | null;
}

/** A Hug's answers, as a round shows them: who, the summary, and a note (an approval's reason, else its comment). */
function answers_of(hug: Record<string, unknown>): HugRoundData['answers'] {
    const responses = Array.isArray(hug.responses) ? hug.responses as Array<Record<string, unknown>> : [];
    return responses.map((r) => {
        const values = (r.values && typeof r.values === 'object' ? r.values : {}) as Record<string, unknown>;
        const note = [values.reason, values.comment].find((v): v is string => typeof v === 'string' && v.trim() !== '') ?? null;
        const responder = (r.responder && typeof r.responder === 'object' ? (r.responder as { name?: unknown }).name : null);
        return {
            responder: typeof responder === 'string' && responder ? responder : 'Someone',
            summary: typeof r.summary === 'string' ? r.summary : null,
            note,
            responded_at: typeof r.responded_at === 'string' ? r.responded_at : null,
        };
    });
}
