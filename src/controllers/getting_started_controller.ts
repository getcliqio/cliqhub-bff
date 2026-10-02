/**
 * Getting started — onboarding progress of the signed-in user (BFF composition).
 *
 * Routes (1:1 with this controller):
 *   POST /v1/getting_started/get — which onboarding steps are done
 *
 * Needs a session (routes/route_auth.ts); Core is read as the session's target_token.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `GettingStartedGetInput` in `schemas/getting_started_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { GettingStartedService } from '../services/getting_started_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { GettingStartedGetInput } from '../schemas/getting_started_types.js';
import type { GettingStartedData } from '../schemas/getting_started_types.js';

/** The signed-in user's onboarding checklist. */
export class GettingStartedController extends BaseController {
    constructor(private readonly _getting_started_service: GettingStartedService) {
        super();
    }

    /**
     * Onboarding checklist (cli, daemon, team, run) computed from existing data.
     *
     * @param req - Body: {@link GettingStartedGetInput}
     * @param res - `{ ok: true, data: GettingStartedData }`
     */
    async get(
        req: ApiRequest<GettingStartedGetInput, GettingStartedData>,
        res: ApiOkResponse<GettingStartedData>,
    ): Promise<void> {
        const body = this.parse_body(GettingStartedGetInput, req);
        this.ok(res, await this._getting_started_service.get(body, this.session(req).target_token));
    }
}
