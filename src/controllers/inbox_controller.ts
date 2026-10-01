import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { InboxService } from '../services/inbox_service.js';
import { inbox_get_schema } from '../schemas/inbox_schemas.js';

/**
 * `POST /v1/inbox/get` — in-app notifications across the caller's orgs (BFF composition).
 * Envelope: `{ ok: true, data: InboxDTO }`.
 */
export class InboxController extends BaseController {
    private _service: InboxService;

    constructor(service: InboxService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(inbox_get_schema, req);
        this.ok(res, await this._service.list(req.session_data.target_token, body));
    });
}
