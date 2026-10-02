/**
 * Org page — Manage › Organization for org owners / admins.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/org_page/get — org, members, roles, scopes, invites, permission catalogue
 *
 * Writes stay on Core: orgs/*, users/update_role, invitations/*, orgs/mesh/update.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `OrgPageGetInput` in `schemas/org_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { OrgPageService } from '../services/org_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { OrgPageGetInput } from '../schemas/org_page_types.js';
import type { OrgPageData } from '../schemas/org_page_types.js';

/** Manage › Organization page. */
export class OrgPageController extends BaseController {
    constructor(private readonly _org_page_service: OrgPageService) {
        super();
    }

    /**
     * The org page in one read; invites / permissions are best-effort (`partial`).
     *
     * @param req - Body: {@link OrgPageGetInput}
     * @param res - `{ ok: true, data: OrgPageData }`
     */
    async get(req: ApiRequest<OrgPageGetInput, OrgPageData>, res: ApiOkResponse<OrgPageData>): Promise<void> {
        const body = this.parse_body(OrgPageGetInput, req);
        this.ok(res, await this._org_page_service.get(body, this.session(req).target_token));
    }
}
