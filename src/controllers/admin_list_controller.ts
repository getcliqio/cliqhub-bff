/**
 * Admin lists — accounts, daemons, teams, audit, realms, workspaces, runs,
 * logs and scopes across the hub (CliqHub site admins only).
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/admin_list/get — one list by `kind`, with per-filter chip counts   (site_admin)
 *
 * Writes stay the existing single routes (users/suspend, teams/unpublish, …).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `AdminListGetInput` in `schemas/admin_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { AdminPageService } from '../services/admin_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { AdminListGetInput } from '../schemas/admin_page_types.js';
import type { AdminListData } from '../schemas/admin_page_types.js';

/** Site-admin hub-wide lists (one `get`, the list named in the body). */
export class AdminListController extends BaseController {
    constructor(private readonly _admin_page_service: AdminPageService) {
        super();
    }

    /**
     * One admin list page with a count per filter chip; filters the connected
     * Core can't apply are listed in `unsupported`.
     *
     * @param req - Body: {@link AdminListGetInput}
     * @param res - `{ ok: true, data: AdminListData }`
     */
    async get(req: ApiRequest<AdminListGetInput, AdminListData>, res: ApiOkResponse<AdminListData>): Promise<void> {
        const body = this.parse_body(AdminListGetInput, req);
        this.ok(res, await this._admin_page_service.list(body, this.session(req).target_token));
    }
}
