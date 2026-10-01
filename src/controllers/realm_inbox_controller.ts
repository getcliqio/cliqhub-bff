import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmInboxService } from '../services/realm_inbox_service.js';
import type { RunDetailService } from '../services/run_detail_service.js';
import { realm_inbox_get_schema, run_detail_get_schema } from '../schemas/realm_inbox_schemas.js';

/**
 * BFF composition reads for the realm workspace.
 *   POST /v1/realm_inbox/get → `{ ok: true, data: RealmInboxDTO }`
 *   POST /v1/run_detail/get  → `{ ok: true, data: RunDetailDTO }`
 */
export class RealmInboxController extends BaseController {
    private _inbox: RealmInboxService;
    private _run_detail: RunDetailService;

    constructor(inbox: RealmInboxService, run_detail: RunDetailService) {
        super();
        this._inbox = inbox;
        this._run_detail = run_detail;
    }

    inbox = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_inbox_get_schema, req);
        // target_token = the effective user (respects admin take-over).
        this.ok(res, await this._inbox.get(req.session_data.target_token, body));
    });

    run_detail = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(run_detail_get_schema, req);
        this.ok(res, await this._run_detail.get(req.session_data.target_token, body));
    });
}
