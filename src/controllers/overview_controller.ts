import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { OverviewService } from '../services/overview_service.js';
import { overview_get_schema } from '../schemas/overview_schemas.js';

/**
 * `POST /v1/overview/get` — cross-org start view (BFF composition).
 * Envelope: `{ ok: true, data: OverviewDTO }`.
 */
export class OverviewController extends BaseController {
    private _service: OverviewService;

    constructor(service: OverviewService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        // Session (or hydrated Bearer) required — the view is per-user.
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        // Reject unknown fields early (strict schema).
        const body = this.parse_body(overview_get_schema, req);
        // target_token = the effective user (respects admin take-over).
        const dto = await this._service.get(req.session_data.target_token, { org_ids: body.org_ids, inbox_seen_ms: body.inbox_seen_ms });
        this.ok(res, dto);
    });
}
