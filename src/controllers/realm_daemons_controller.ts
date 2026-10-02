/**
 * Realm › Daemons — a realm's daemons with status, load and teams ready (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/realm_daemons/get — daemons + status counts + running runs + teams ready
 *
 * Session route (routes/route_auth.ts); Core re-checks realm membership.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RealmDaemonsGetInput` in `schemas/realm_daemons_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmDaemonsService } from '../services/realm_daemons_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RealmDaemonsGetInput } from '../schemas/realm_daemons_types.js';
import type { RealmDaemonsData } from '../schemas/realm_daemons_types.js';

/** Realm › Daemons page. */
export class RealmDaemonsController extends BaseController {
    constructor(private readonly _realm_daemons_service: RealmDaemonsService) {
        super();
    }

    /**
     * A realm's daemons with status counts.
     *
     * @param req - Body: {@link RealmDaemonsGetInput}
     * @param res - `{ ok: true, data: RealmDaemonsData }`; 403/404 when the realm is not visible
     */
    async get(req: ApiRequest<RealmDaemonsGetInput, RealmDaemonsData>, res: ApiOkResponse<RealmDaemonsData>): Promise<void> {
        const body = this.parse_body(RealmDaemonsGetInput, req);
        this.ok(res, await this._realm_daemons_service.get(body, this.session(req).target_token));
    }
}
