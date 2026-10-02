/**
 * Realm › Settings — realm, people, pending invites and access tokens (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/realm_settings/get — everything the realm Settings tab shows
 *
 * Session route (routes/route_auth.ts); Core re-checks realm membership and
 * admin-only sections (reported per section, not as a failed call).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RealmSettingsGetInput` in `schemas/realm_settings_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmSettingsService } from '../services/realm_settings_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RealmSettingsGetInput } from '../schemas/realm_settings_types.js';
import type { RealmSettingsData } from '../schemas/realm_settings_types.js';
import { to_realm_settings_viewer } from '../mappers/realm_settings_mapper.js';

/** Realm › Settings page. */
export class RealmSettingsController extends BaseController {
    constructor(private readonly _realm_settings_service: RealmSettingsService) {
        super();
    }

    /**
     * The realm Settings tab, with the viewer's realm role.
     *
     * @param req - Body: {@link RealmSettingsGetInput}
     * @param res - `{ ok: true, data: RealmSettingsData }`; 403/404 when the realm is not visible
     */
    async get(req: ApiRequest<RealmSettingsGetInput, RealmSettingsData>, res: ApiOkResponse<RealmSettingsData>): Promise<void> {
        const body = this.parse_body(RealmSettingsGetInput, req);
        const session = this.session(req);
        this.ok(res, await this._realm_settings_service.get(body, session.target_token, to_realm_settings_viewer(session)));
    }
}
