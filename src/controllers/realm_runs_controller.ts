/**
 * Realm › Runs — one page of a realm's runs plus the state-chip counts (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/realm_runs/get — runs page + counts (all, running, awaiting input, failed 7d)
 *
 * Session route (routes/route_auth.ts); Core re-checks realm membership.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RealmRunsGetInput` in `schemas/realm_runs_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmRunsService } from '../services/realm_runs_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RealmRunsGetInput } from '../schemas/realm_runs_types.js';
import type { RealmRunsData } from '../schemas/realm_runs_types.js';

/** Realm › Runs page. */
export class RealmRunsController extends BaseController {
    constructor(private readonly _realm_runs_service: RealmRunsService) {
        super();
    }

    /**
     * One page of a realm's runs with the state-chip counts.
     *
     * @param req - Body: {@link RealmRunsGetInput}
     * @param res - `{ ok: true, data: RealmRunsData }`; 403/404 when the realm is not visible
     */
    async get(req: ApiRequest<RealmRunsGetInput, RealmRunsData>, res: ApiOkResponse<RealmRunsData>): Promise<void> {
        const body = this.parse_body(RealmRunsGetInput, req);
        this.ok(res, await this._realm_runs_service.get(body, this.session(req).target_token));
    }
}
