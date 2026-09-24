import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { DraftsService } from '../services/drafts_service.js';
import {
    drafts_get_schema, drafts_get_by_id_schema,
    drafts_new_schema, drafts_update_schema, drafts_delete_schema,
} from '../schemas/drafts_schemas.js';

export class DraftsController extends BaseController {
    private _drafts_service: DraftsService;

    constructor(drafts_service: DraftsService) {
        super();
        this._drafts_service = drafts_service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        this.parse_body(drafts_get_schema, req);
        const dto = await this._drafts_service.get(req.session_data.target_token);
        this.ok(res, dto);
    });

    get_by_id = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(drafts_get_by_id_schema, req);
        const dto = await this._drafts_service.get_by_id(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    new_draft = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(drafts_new_schema, req);
        const dto = await this._drafts_service.new_draft(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(drafts_update_schema, req);
        const dto = await this._drafts_service.update(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_draft = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(drafts_delete_schema, req);
        const dto = await this._drafts_service.delete_draft(body, req.session_data.target_token);
        this.ok(res, dto);
    });
}
