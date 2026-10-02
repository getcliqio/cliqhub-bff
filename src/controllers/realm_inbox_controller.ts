/**
 * Realm inbox — everything in one realm that needs a person (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/realm_inbox/get — pending reviews, runs awaiting input, recent failures, running runs
 *
 * Session route (routes/route_auth.ts); Core re-checks realm membership.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RealmInboxGetInput` in `schemas/realm_inbox_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmInboxService } from '../services/realm_inbox_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RealmInboxGetInput } from '../schemas/realm_inbox_types.js';
import type { RealmInboxData } from '../schemas/realm_inbox_types.js';

/** Realm inbox page. */
export class RealmInboxController extends BaseController {
    constructor(private readonly _realm_inbox_service: RealmInboxService) {
        super();
    }

    /**
     * One realm's inbox: items that need a person, live runs, counts and section status.
     *
     * @param req - Body: {@link RealmInboxGetInput}
     * @param res - `{ ok: true, data: RealmInboxData }`; 403/404 when the realm is not visible
     */
    async get(req: ApiRequest<RealmInboxGetInput, RealmInboxData>, res: ApiOkResponse<RealmInboxData>): Promise<void> {
        const body = this.parse_body(RealmInboxGetInput, req);
        this.ok(res, await this._realm_inbox_service.get(body, this.session(req).target_token));
    }
}
