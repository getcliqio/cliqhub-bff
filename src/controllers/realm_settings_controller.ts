import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmSettingsService } from '../services/realm_settings_service.js';
import { realm_settings_get_schema } from '../schemas/realm_settings_schemas.js';

/** `POST /v1/realm_settings/get` → `{ ok, data: RealmSettingsDTO }` (BFF composition). */
export class RealmSettingsController extends BaseController {
    private _service: RealmSettingsService;

    constructor(service: RealmSettingsService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_settings_get_schema, req);
        const s = req.session_data;
        this.ok(res, await this._service.get(s.target_token, body, { user_id: s.act_as_user_id || s.user_id, site_admin: s.role === 'admin' }));
    });
}
