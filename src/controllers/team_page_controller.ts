/**
 * Build › Teams › one team — the header plus one tab's data
 * (BFF composition, services/team_page_service.ts).
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/team_page/get — one team, one tab (`view`)
 *
 * Needs a session (routes/route_auth.ts); 404 when the caller cannot see the team.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `TeamPageGetInput` in `schemas/team_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { TeamPageService } from '../services/team_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { TeamPageGetInput } from '../schemas/team_page_types.js';
import type { TeamPageData } from '../schemas/team_page_types.js';

/** Build › Teams › one team page (header + one tab). */
export class TeamPageController extends BaseController {
    constructor(private readonly _team_page_service: TeamPageService) {
        super();
    }

    /**
     * One team: header, permissions, counts and the data of the requested tab.
     *
     * @param req - Body: {@link TeamPageGetInput}
     * @param res - `{ ok: true, data: TeamPageData }`
     */
    async get(req: ApiRequest<TeamPageGetInput, TeamPageData>, res: ApiOkResponse<TeamPageData>): Promise<void> {
        const body = this.parse_body(TeamPageGetInput, req);
        this.ok(res, await this._team_page_service.page(body, this.session(req).target_token));
    }
}
