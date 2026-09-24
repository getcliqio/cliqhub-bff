import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { AdminService } from '../services/admin_service.js';
import { admin_audit_schema, admin_get_users_schema, admin_get_user_schema, admin_new_user_schema, admin_update_user_schema, admin_suspend_user_schema, admin_unsuspend_user_schema, admin_delete_user_schema, admin_set_user_role_schema, admin_reset_user_password_schema, admin_get_teams_schema, admin_set_team_listed_schema, admin_get_scopes_schema, admin_new_scope_schema, admin_update_scope_schema, admin_delete_scope_schema, admin_scopes_user_schema, admin_get_orgs_schema, admin_new_org_schema, admin_delete_org_schema } from '../schemas/admin_schemas.js';

export class AdminController extends BaseController {
    private _admin_service: AdminService;

    constructor(admin_service: AdminService) {
        super();
        this._admin_service = admin_service;
    }

    audit = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_audit_schema, req);
        const dto = await this._admin_service.audit(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_users = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_get_users_schema, req);
        // Site-admin: global list. Org members: org_id. Realm members: realm_id invite search.
        if (!body.org_id && !body.realm_id && req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const dto = await this._admin_service.get_users(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_get_user_schema, req);
        const dto = await this._admin_service.get_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    new_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_new_user_schema, req);
        const dto = await this._admin_service.new_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_update_user_schema, req);
        const dto = await this._admin_service.update_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    suspend_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_suspend_user_schema, req);
        const dto = await this._admin_service.suspend_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    unsuspend_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_unsuspend_user_schema, req);
        const dto = await this._admin_service.unsuspend_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_delete_user_schema, req);
        const dto = await this._admin_service.delete_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    set_user_role = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_set_user_role_schema, req);
        const dto = await this._admin_service.set_user_role(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    reset_user_password = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_reset_user_password_schema, req);
        const dto = await this._admin_service.reset_user_password(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_teams = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_get_teams_schema, req);
        const dto = await this._admin_service.get_teams(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    set_team_listed = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_set_team_listed_schema, req);
        const dto = await this._admin_service.set_team_listed(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_scopes = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_get_scopes_schema, req);
        const dto = await this._admin_service.get_scopes(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    new_scope = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_new_scope_schema, req);
        const dto = await this._admin_service.new_scope(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update_scope = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_update_scope_schema, req);
        const dto = await this._admin_service.update_scope(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_scope = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_delete_scope_schema, req);
        const dto = await this._admin_service.delete_scope(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    add_scope_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_scopes_user_schema, req);
        const dto = await this._admin_service.add_scope_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    remove_scope_user = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(admin_scopes_user_schema, req);
        const dto = await this._admin_service.remove_scope_user(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_orgs = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_get_orgs_schema, req);
        const dto = await this._admin_service.get_orgs(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    new_org = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_new_org_schema, req);
        const dto = await this._admin_service.new_org(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_org = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        if (req.session_data.role !== 'admin') {
            res.status(403).json({ ok: false, error: { code: 'forbidden', message: 'Admin access required' } });
            return;
        }
        const body = this.parse_body(admin_delete_org_schema, req);
        const dto = await this._admin_service.delete_org(body, req.session_data.target_token);
        this.ok(res, dto);
    });
}
