import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmDaemonsService } from '../services/realm_daemons_service.js';
import { realm_daemons_get_schema } from '../schemas/realm_daemons_schemas.js';

/** `POST /v1/realm_daemons/get` → `{ ok, data: RealmDaemonsDTO }` (BFF composition). */
export class RealmDaemonsController extends BaseController {
    private _service: RealmDaemonsService;

    constructor(service: RealmDaemonsService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_daemons_get_schema, req);
        this.ok(res, await this._service.get(req.session_data.target_token, body));
    });
}
