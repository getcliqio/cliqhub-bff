/**
 * Realm › Teams — a realm's teams with daemon coverage and update hints (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/realm_teams/get — teams page + coverage-chip counts + latest published versions
 *
 * Session route (routes/route_auth.ts); Core re-checks realm membership.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RealmTeamsGetInput` in `schemas/realm_teams_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmTeamsService } from '../services/realm_teams_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RealmTeamsGetInput } from '../schemas/realm_teams_types.js';
import type { RealmTeamsData } from '../schemas/realm_teams_types.js';

/** Realm › Teams page. */
export class RealmTeamsController extends BaseController {
    constructor(private readonly _realm_teams_service: RealmTeamsService) {
        super();
    }

    /**
     * One page of a realm's teams with coverage counts.
     *
     * @param req - Body: {@link RealmTeamsGetInput}
     * @param res - `{ ok: true, data: RealmTeamsData }`; 403/404 when the realm is not visible
     */
    async get(req: ApiRequest<RealmTeamsGetInput, RealmTeamsData>, res: ApiOkResponse<RealmTeamsData>): Promise<void> {
        const body = this.parse_body(RealmTeamsGetInput, req);
        this.ok(res, await this._realm_teams_service.get(body, this.session(req).target_token));
    }
}
