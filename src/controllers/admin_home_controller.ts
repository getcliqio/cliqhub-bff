/**
 * Admin home — the site admin's landing page (CliqHub site admins only,
 * `users.role = 'admin'`, never org admins).
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/admin_home/get — hub counts, attention items, recent audit   (site_admin)
 *
 * Writes stay the existing single routes (users/suspend, teams/unpublish, …).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `AdminHomeGetInput` in `schemas/admin_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { AdminPageService } from '../services/admin_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { AdminHomeGetInput } from '../schemas/admin_page_types.js';
import type { AdminHomeData } from '../schemas/admin_page_types.js';

/** Site-admin landing page. */
export class AdminHomeController extends BaseController {
    constructor(private readonly _admin_page_service: AdminPageService) {
        super();
    }

    /**
     * Hub-wide counts (hub-wide parts need Core API 3), attention items and
     * the latest admin audit entries; failed Core calls mark it `partial`.
     *
     * @param req - Body: {@link AdminHomeGetInput}
     * @param res - `{ ok: true, data: AdminHomeData }`
     */
    async get(req: ApiRequest<AdminHomeGetInput, AdminHomeData>, res: ApiOkResponse<AdminHomeData>): Promise<void> {
        const body = this.parse_body(AdminHomeGetInput, req);
        this.ok(res, await this._admin_page_service.home(body, this.session(req).target_token));
    }
}
