import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmTeamsService } from '../services/realm_teams_service.js';
import { realm_teams_get_schema } from '../schemas/realm_teams_schemas.js';

/** `POST /v1/realm_teams/get` → `{ ok, data: RealmTeamsDTO }` (BFF composition). */
export class RealmTeamsController extends BaseController {
    private _service: RealmTeamsService;

    constructor(service: RealmTeamsService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_teams_get_schema, req);
        this.ok(res, await this._service.get(req.session_data.target_token, body));
    });
}
