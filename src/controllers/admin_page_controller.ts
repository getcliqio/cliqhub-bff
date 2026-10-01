import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { AdminPageService } from '../services/admin_page_service.js';
import { admin_home_get_schema, admin_list_get_schema } from '../schemas/admin_page_schemas.js';

/**
 * Admin mode (CliqHub site admins only — `users.role = 'admin'`, never org admins).
 * `POST /v1/admin_home/get` → `{ ok, data: AdminHomeDTO }`
 * `POST /v1/admin_list/get` → `{ ok, data: AdminListDTO }` (accounts | daemons | teams, with chip counts)
 * Writes stay the existing single routes (users/suspend, teams/unpublish, …).
 */
export class AdminPageController extends BaseController {
    constructor(private _service: AdminPageService) {
        super();
    }

    private _guard(req: Request, res: Response): boolean {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return false;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return false;
        }
        return true;
    }

    home = this.wrap(async (req: Request, res: Response) => {
        if (!this._guard(req, res)) return;
        this.parse_body(admin_home_get_schema, req);
        this.ok(res, await this._service.home(req.session_data!.target_token));
    });

    list = this.wrap(async (req: Request, res: Response) => {
        if (!this._guard(req, res)) return;
        const body = this.parse_body(admin_list_get_schema, req);
        this.ok(res, await this._service.list(req.session_data!.target_token, body));
    });
}
