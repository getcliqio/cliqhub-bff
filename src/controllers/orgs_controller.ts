import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { OrgsService } from '../services/orgs_service.js';
import {
    orgs_get_schema,
    orgs_get_by_id_schema,
    orgs_update_schema,
    orgs_leave_schema,
    orgs_add_member_schema,
    orgs_remove_member_schema,
    orgs_list_roles_schema,
    orgs_get_role_schema,
    orgs_create_role_schema,
    orgs_update_role_schema,
    orgs_delete_role_schema,
    users_update_role_schema,
    orgs_new_scope_schema,
    orgs_delete_scope_schema,
    orgs_assign_scope_member_schema,
    orgs_unassign_scope_member_schema,
} from '../schemas/orgs_schemas.js';

export class OrgsController extends BaseController {
    private _orgs_service: OrgsService;

    constructor(orgs_service: OrgsService) {
        super();
        this._orgs_service = orgs_service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_get_schema, req);
        const dto = await this._orgs_service.get(req.session_data.target_token, { mine: body.mine });
        this.ok(res, dto);
    });

    get_by_id = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_get_by_id_schema, req);
        const dto = await this._orgs_service.get_by_id(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_update_schema, req);
        const dto = await this._orgs_service.update(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    leave = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_leave_schema, req);
        const dto = await this._orgs_service.leave(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    add_member = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_add_member_schema, req);
        const dto = await this._orgs_service.add_member(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    remove_member = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_remove_member_schema, req);
        const dto = await this._orgs_service.remove_member(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    list_roles = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_list_roles_schema, req);
        const dto = await this._orgs_service.list_roles(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_get_role_schema, req);
        const dto = await this._orgs_service.get_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    create_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_create_role_schema, req);
        const dto = await this._orgs_service.create_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_update_role_schema, req);
        const dto = await this._orgs_service.update_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_delete_role_schema, req);
        const dto = await this._orgs_service.delete_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update_user_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(users_update_role_schema, req);
        const dto = await this._orgs_service.update_user_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    new_scope = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_new_scope_schema, req);
        const dto = await this._orgs_service.new_scope(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_scope = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_delete_scope_schema, req);
        const dto = await this._orgs_service.delete_scope(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    assign_scope_member = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_assign_scope_member_schema, req);
        const dto = await this._orgs_service.assign_scope_member(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    unassign_scope_member = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(orgs_unassign_scope_member_schema, req);
        const dto = await this._orgs_service.unassign_scope_member(body, req.session_data.target_token);
        this.ok(res, dto);
    });


}

