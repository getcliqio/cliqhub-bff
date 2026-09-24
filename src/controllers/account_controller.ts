import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { AccountService } from '../services/account_service.js';
import {
    update_profile_schema,
    change_password_schema,
} from '../schemas/account_schemas.js';

export class AccountController extends BaseController {
    private _account_service: AccountService;

    constructor(account_service: AccountService) {
        super();
        this._account_service = account_service;
    }

    update_profile = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(update_profile_schema, req);
        const dto = await this._account_service.update_profile(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    change_password = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(change_password_schema, req);
        const dto = await this._account_service.change_password(body, req.session_data.target_token);
        this.ok(res, dto);
    });
}
