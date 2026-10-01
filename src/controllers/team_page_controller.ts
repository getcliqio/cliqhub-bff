import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { TeamPageService } from '../services/team_page_service.js';
import { team_list_get_schema, team_page_get_schema } from '../schemas/team_page_schemas.js';

/**
 * `POST /v1/team_list/get` → `{ ok, data: TeamListDTO }`
 * `POST /v1/team_page/get` → `{ ok, data: TeamPageDTO }` (BFF composition).
 */
export class TeamPageController extends BaseController {
    private _service: TeamPageService;

    constructor(service: TeamPageService) {
        super();
        this._service = service;
    }

    list = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(team_list_get_schema, req);
        this.ok(res, await this._service.list(req.session_data.target_token, body));
    });

    page = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(team_page_get_schema, req);
        this.ok(res, await this._service.page(req.session_data.target_token, body));
    });
}
