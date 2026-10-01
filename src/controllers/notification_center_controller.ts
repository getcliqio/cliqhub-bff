import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { NotificationCenterService } from '../services/notification_center_service.js';
import { notification_center_check_schema, notification_center_get_schema, notification_center_set_rules_schema } from '../schemas/notification_center_schemas.js';

/**
 * Notification center reads (BFF composition).
 *   POST /v1/notification_center/get   → `{ ok, data: NotificationCenterDTO }`
 *   POST /v1/notification_center/check → `{ ok, data: NotificationCheckDTO }`
 * Writes stay on the existing Core routes (rules set/remove, channels create/update/remove/test).
 */
export class NotificationCenterController extends BaseController {
    private _service: NotificationCenterService;

    constructor(service: NotificationCenterService) {
        super();
        this._service = service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(notification_center_get_schema, req);
        const s = req.session_data;
        // Effective user (take-over aware) decides what is editable.
        const viewer = { user_id: s.act_as_user_id || s.user_id, site_admin: s.role === 'admin' };
        this.ok(res, await this._service.get(s.target_token, body, viewer));
    });

    check = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(notification_center_check_schema, req);
        this.ok(res, await this._service.check(req.session_data.target_token, body));
    });

    /** `POST /v1/notification_center/set_rules` → `{ ok, data: NotifSetRulesDTO }` (one rule per event). */
    set_rules = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(notification_center_set_rules_schema, req);
        this.ok(res, await this._service.set_rules(req.session_data.target_token, body));
    });
}
