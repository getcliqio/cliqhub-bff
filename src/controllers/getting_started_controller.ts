import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { GettingStartedService } from '../services/getting_started_service.js';
import { getting_started_get_schema } from '../schemas/getting_started_schemas.js';

/** `POST /v1/getting_started/get` → `{ ok: true, data: GettingStartedDTO }`. */
export class GettingStartedController extends BaseController {
    private _service: GettingStartedService;

    constructor(service: GettingStartedService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        this.parse_body(getting_started_get_schema, req);
        // target_token = the effective user (respects admin take-over).
        this.ok(res, await this._service.get(req.session_data.target_token));
    });
}
