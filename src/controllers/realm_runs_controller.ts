import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmRunsService } from '../services/realm_runs_service.js';
import { realm_runs_get_schema } from '../schemas/realm_runs_schemas.js';

/** `POST /v1/realm_runs/get` → `{ ok, data: RealmRunsDTO }` (BFF composition). */
export class RealmRunsController extends BaseController {
    private _service: RealmRunsService;

    constructor(service: RealmRunsService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_runs_get_schema, req);
        this.ok(res, await this._service.get(req.session_data.target_token, body));
    });
}
