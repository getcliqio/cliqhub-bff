/**
 * Build › Teams list — the caller's teams with status counts, phase shape and
 * the realms each is installed in (BFF composition, services/team_page_service.ts).
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/team_list/get — the caller's teams
 *
 * Needs a session (routes/route_auth.ts).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `TeamListGetInput` in `schemas/team_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { TeamPageService } from '../services/team_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { TeamListGetInput } from '../schemas/team_page_types.js';
import type { TeamListData } from '../schemas/team_page_types.js';

/** Build › Teams list page. */
export class TeamListController extends BaseController {
    constructor(private readonly _team_page_service: TeamPageService) {
        super();
    }

    /**
     * The caller's teams, filtered and paged, with "installed in" per row.
     *
     * @param req - Body: {@link TeamListGetInput}
     * @param res - `{ ok: true, data: TeamListData }`
     */
    async get(req: ApiRequest<TeamListGetInput, TeamListData>, res: ApiOkResponse<TeamListData>): Promise<void> {
        const body = this.parse_body(TeamListGetInput, req);
        this.ok(res, await this._team_page_service.list(body, this.session(req).target_token));
    }
}
