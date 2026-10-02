/**
 * Overview — the cross-org start view of the signed-in user (BFF composition).
 *
 * Routes (1:1 with this controller):
 *   POST /v1/overview/get — every org's counts, realms, what needs the user and the bell summary
 *
 * Needs a session (routes/route_auth.ts); Core is read as the session's target_token.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `OverviewGetInput` in `schemas/overview_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { OverviewService } from '../services/overview_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { OverviewGetInput } from '../schemas/overview_types.js';
import type { OverviewData } from '../schemas/overview_types.js';

/** The signed-in user's cross-org overview page. */
export class OverviewController extends BaseController {
    constructor(private readonly _overview_service: OverviewService) {
        super();
    }

    /**
     * Cross-org overview; one org failing marks it `error` and the answer `partial`.
     *
     * @param req - Body: {@link OverviewGetInput}
     * @param res - `{ ok: true, data: OverviewData }`; 403 when `org_ids` names an org the caller is not in
     */
    async get(req: ApiRequest<OverviewGetInput, OverviewData>, res: ApiOkResponse<OverviewData>): Promise<void> {
        const body = this.parse_body(OverviewGetInput, req);
        this.ok(res, await this._overview_service.get(body, this.session(req).target_token));
    }
}
