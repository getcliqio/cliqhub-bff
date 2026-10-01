import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlRunVO } from '../types/vo.js';
import type { RunDetailDTO, RunDetailSectionKey, InboxSectionStatusDTO } from '../types/dto.js';
import { ApiError } from '../repositories/api_error.js';
import { to_control_realm_dto, to_run_detail_phase_dto, to_run_detail_review_dto } from '../types/mappers.js';
import { section } from './realm_inbox_service.js';

/**
 * Run detail: the run row plus its phases, labels (team / workspace names
 * only present on the list read), realm and pending reviews — composed here
 * so the SPA makes a single `POST /v1/run_detail/get` per poll.
 */
export class RunDetailService {
    private _control: ControlRepository;

    constructor(control: ControlRepository) {
        this._control = control;
    }

    async get(token: string, params: { run_id: string }): Promise<RunDetailDTO> {
        const { run_id } = params;
        // The run itself is required; everything else is best-effort.
        const run = await this._control.run_by_id(run_id, token);
        if (!run) throw new ApiError('not_found', 'Run not found', 404);

        const realm_id = run.realm_id ?? null;
        const skip = Promise.reject(new ApiError('not_applicable', 'Run has no realm', 409));
        skip.catch(() => undefined);

        const [phases, labels, realm, reviews] = await Promise.allSettled([
            this._control.run_phases(run_id, token),
            realm_id ? this._control.runs({ realm_id, query: run_id, limit: 5 }, token) : skip,
            realm_id ? this._control.realm_by_id(realm_id, token) : skip,
            realm_id ? this._control.pending_reviews(realm_id, token, 100) : skip,
        ]);

        const match: ControlRunVO | undefined = labels.status === 'fulfilled'
            ? labels.value.items.find((r) => r.run_id === run_id)
            : undefined;

        const sections: Record<RunDetailSectionKey, InboxSectionStatusDTO> = {
            phases: section(phases),
            labels: section(labels),
            realm: section(realm),
            reviews: section(reviews),
        };

        return {
            run: {
                ...run,
                team_label: run.team_label ?? match?.team_label ?? null,
                workspace_name: run.workspace_name ?? match?.workspace_name ?? null,
            },
            phases: phases.status === 'fulfilled' ? phases.value.map(to_run_detail_phase_dto) : [],
            realm: realm.status === 'fulfilled' ? to_control_realm_dto(realm.value) : null,
            reviews: reviews.status === 'fulfilled'
                ? reviews.value.items.filter((r) => r.run_id === run_id).map(to_run_detail_review_dto)
                : [],
            sections,
            // A run without a realm has nothing more to load — that is not "partial".
            partial: realm_id ? Object.values(sections).some((s) => s.status === 'error') : sections.phases.status === 'error',
        };
    }
}
