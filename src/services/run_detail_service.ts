/**
 * Run detail — one run with its phases, labels, realm and pending reviews.
 *
 * Composes Core: `/v1/runs/get_by_id` (required) → `/v1/runs/get_status` (phases)
 * + `/v1/runs/get { realm_id, query: run_id }` (team / workspace labels)
 * + `/v1/realms/get_by_id { realm_id }` + `/v1/reviews/get` (pending, filtered to the run)
 * + `/v1/artifacts/get { run_id }` (stored files and run records)
 * + `/v1/artifacts/get_by_id` for each phase output too long for the list preview
 * + `/v1/runs/get { parent_run_id }` (sub-team runs it spawned)
 * + `/v1/runs/get_by_id` of the parent (a sub-team run only)
 * The run is read with `with_history: true`: its lifecycle (started / resume requested by
 * whom / resumed / failed / completed) → attempts, with no extra call.
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlArtifactVO, ControlRealmVO, ControlRunPhaseVO, ControlRunVO } from '../types/core/control.js';
import type { InboxSectionStatusData } from '../schemas/realm_inbox_types.js';
import type {
    RunDetailAttemptData, RunDetailData, RunDetailGetInput, RunDetailPhaseOutputData, RunDetailSectionKey,
} from '../schemas/run_detail_types.js';
import { ApiError } from '../errors/api_error.js';
import { to_control_realm_data, to_section_data } from '../mappers/realm_inbox_mapper.js';
import {
    RUN_LIFECYCLE_EVENTS,
    derive_run_attempts,
    to_run_attempts_from_history,
    to_run_detail_artifact_data,
    to_run_detail_child_data,
    to_run_detail_parent_data,
    to_run_detail_phase_data,
    to_run_detail_phase_output_data,
    to_run_detail_review_data,
} from '../mappers/run_detail_mapper.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.run_detail');

/** At most this many cut-off phase outputs are read in full per request. */
const MAX_FULL_OUTPUT_READS = 25;

/**
 * Run detail: the run row plus its phases, labels (team / workspace names
 * only present on the list read), realm and pending reviews — composed here
 * so the SPA makes a single `POST /v1/run_detail/get` per poll.
 */
export class RunDetailService {
    /**
     * @param _control - Core control-plane reads.
     * @param _orgs - Org list (resolves the realm's org id for the events read); without it
     *   attempts are reconstructed from the phases.
     */
    constructor(private readonly _control: ControlRepository) {}

    /**
     * The run plus best-effort phases, labels, realm and this run's pending reviews.
     * 404 when Core has no such run; a run without a realm skips the realm reads.
     *
     * @param params - `{ run_id }`
     * @param token - Caller's Core token (session target_token).
     */
    async get(params: RunDetailGetInput, token: string): Promise<RunDetailData> {
        const { run_id } = params;
        // The run itself is required; everything else is best-effort.
        const run = await this._control.run_by_id(run_id, token, { with_history: true });
        if (!run) throw ApiError.not_found('Run not found');

        const realm_id = run.realm_id ?? null;
        const skip = Promise.reject(new ApiError('not_applicable', 'Run has no realm', 409));
        // Mark `skip` handled up front: allSettled below reports it as a section
        // status, but it may be created without being passed there.
        skip.catch(() => undefined);

        const parent_run_id = typeof run.parent_run_id === 'string' && run.parent_run_id ? run.parent_run_id : null;
        const [phases, labels, realm, reviews, artifacts, children, parent] = await Promise.allSettled([
            this._control.run_phases(run_id, token),
            realm_id ? this._control.runs({ realm_id, query: run_id, limit: 5 }, token) : skip,
            realm_id ? this._control.realm_by_id(realm_id, token) : skip,
            realm_id ? this._control.pending_reviews(realm_id, token, 100) : skip,
            this._control.run_artifacts(run_id, token),
            this._control.child_runs(run_id, token),
            parent_run_id ? this._control.run_by_id(parent_run_id, token) : Promise.resolve(null),
        ]);

        // `skip` is a run without a realm, not a failure — don't warn about it.
        if (realm_id) warn_rejected(log, 'run_detail_section_failed', { phases, labels, realm, reviews, artifacts, children, parent }, { run_id, realm_id });
        else warn_rejected(log, 'run_detail_section_failed', { phases, artifacts, children, parent }, { run_id });

        const realm_vo: ControlRealmVO | null = realm.status === 'fulfilled' ? realm.value : null;
        const phase_rows: ControlRunPhaseVO[] = phases.status === 'fulfilled' ? phases.value : [];
        // History comes with the run (Core API 7+); older Cores: rebuilt from the phases.
        const events: PromiseSettledResult<null> = { status: 'fulfilled', value: null };
        const { attempts, attempts_source } = this._attempts(run, phase_rows, phases.status === 'fulfilled');

        const match: ControlRunVO | undefined = labels.status === 'fulfilled'
            ? labels.value.items.find((r) => r.run_id === run_id)
            : undefined;

        const phase_outputs = artifacts.status === 'fulfilled'
            ? await this._phase_outputs(artifacts.value, token, run_id)
            : [];

        const sections: Record<RunDetailSectionKey, InboxSectionStatusData> = {
            phases: to_section_data(phases),
            labels: to_section_data(labels),
            realm: to_section_data(realm),
            reviews: to_section_data(reviews),
            artifacts: to_section_data(artifacts),
            events: to_section_data(events),
            parent: to_section_data(parent),
            children: to_section_data(children),
        };

        return {
            run: {
                ...run,
                history: undefined,
                team_label: run.team_label ?? match?.team_label ?? null,
                workspace_name: run.workspace_name ?? match?.workspace_name ?? null,
            },
            phases: phases.status === 'fulfilled' ? phases.value.map(to_run_detail_phase_data) : [],
            realm: realm.status === 'fulfilled' ? to_control_realm_data(realm.value) : null,
            reviews: reviews.status === 'fulfilled'
                ? reviews.value.items.filter((r) => r.run_id === run_id).map(to_run_detail_review_data)
                : [],
            artifacts: artifacts.status === 'fulfilled' ? artifacts.value.map(to_run_detail_artifact_data) : [],
            phase_outputs,
            attempts,
            attempts_source,
            parent: to_run_detail_parent_data(run, parent.status === 'fulfilled' ? parent.value : null, {
                realm_slug: realm_vo?.slug ?? null,
                org_slug: realm_vo?.org_slug ?? null,
            }),
            children: children.status === 'fulfilled' ? children.value.items.map(to_run_detail_child_data) : [],
            sections,
            // A run without a realm has nothing more to load — that is not "partial".
            partial: realm_id
                ? Object.values(sections).some((s) => s.status === 'error')
                : (['phases', 'artifacts', 'events', 'parent', 'children'] as const).some((k) => sections[k].status === 'error'),
        };
    }

    /**
     * The run's attempts: from its lifecycle events when any are visible, else
     * reconstructed from the phases' attempt history. Null when the events read
     * failed (the page shows no attempt history rather than a wrong one).
     */
    private _attempts(
        run: ControlRunVO,
        phases: ControlRunPhaseVO[],
        phases_ok: boolean,
    ): { attempts: RunDetailAttemptData[] | null; attempts_source: 'events' | 'phases' | null } {
        if (Array.isArray(run.history) && run.history.length) {
            const from_history = to_run_attempts_from_history(run.history, run);
            if (from_history.length) return { attempts: from_history, attempts_source: 'events' };
        }
        if (!phases_ok) return { attempts: null, attempts_source: null };
        return { attempts: derive_run_attempts(phases, run), attempts_source: 'phases' };
    }

    /**
     * The run's phase outputs read for display, oldest first. The artifact list
     * carries only a preview; an output longer than that is read in full
     * (`artifacts/get_by_id`), and kept as its preview when that read fails.
     */
    private async _phase_outputs(artifacts: ControlArtifactVO[], token: string, run_id: string): Promise<RunDetailPhaseOutputData[]> {
        const outputs = artifacts
            .filter((a) => a.source === 'record' && a.kind === 'output')
            .sort((a, b) => (Number(a.created_at) || 0) - (Number(b.created_at) || 0));
        let reads = 0;
        return Promise.all(outputs.map(async (a) => {
            const preview = a.content_preview ?? '';
            // Core cuts a long record to its start plus "\n…"; anything else is the whole text.
            const whole = !preview.endsWith('\n…') || Buffer.byteLength(preview, 'utf8') === Number(a.size_bytes);
            if (whole) return to_run_detail_phase_output_data(a, preview, true);
            if (reads >= MAX_FULL_OUTPUT_READS) return to_run_detail_phase_output_data(a, preview, false);
            reads += 1;
            try {
                const full = await this._control.artifact_by_id(String(a.artifact_id), token);
                if (typeof full?.content === 'string') return to_run_detail_phase_output_data(a, full.content, true);
            } catch (err) {
                log.warn('phase_output_read_failed', { run_id, artifact_id: a.artifact_id, error: err instanceof Error ? err.message : String(err) });
            }
            return to_run_detail_phase_output_data(a, preview, false);
        }));
    }
}
