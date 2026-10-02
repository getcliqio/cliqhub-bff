/**
 * Reports — site-admin reports.
 *
 * Routes (1:1 with this controller, mounted in routes/reports.ts):
 *   POST /v1/reports/audit — audit log (site_admin)
 *
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Reports*Input` in `schemas/reports_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { ReportsService } from '../services/reports_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { ReportsAuditInput } from '../schemas/reports_types.js';
import type { ReportsAuditData } from '../schemas/reports_types.js';

/** Site-admin reports. */
export class ReportsController extends BaseController {
    constructor(private readonly _reports_service: ReportsService) {
        super();
    }

    /**
     * One page of the hub audit log, newest first.
     *
     * @param req - Body: {@link ReportsAuditInput}
     * @param res - `{ ok: true, data: ReportsAuditData }`
     */
    async audit(req: ApiRequest<ReportsAuditInput, ReportsAuditData>, res: ApiOkResponse<ReportsAuditData>): Promise<void> {
        const body = this.parse_body(ReportsAuditInput, req);
        this.ok(res, await this._reports_service.audit(body, this.session(req).target_token));
    }
}
