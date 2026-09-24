import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { TeamsService } from '../services/teams_service.js';
import type { BuilderService } from '../services/builder_service.js';
import { ApiError } from '../repositories/api_error.js';
import {
    teams_get_schema, teams_get_by_id_schema,
    teams_download_schema,
    teams_create_schema, teams_update_schema,
    teams_publish_schema, teams_unpublish_schema,
    teams_delete_schema, teams_rename_schema,
    teams_get_versions_schema,
    teams_get_phases_schema,
} from '../schemas/teams_schemas.js';
import { teams_build_schema } from '../schemas/builder_schemas.js';

export class TeamsController extends BaseController {
    private _teams_service: TeamsService;
    private _builder_service?: BuilderService;

    constructor(teams_service: TeamsService, builder_service?: BuilderService) {
        super();
        this._teams_service = teams_service;
        this._builder_service = builder_service;
    }

    get = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(teams_get_schema, req);
        const dto = await this._teams_service.get(body, req.session_data?.target_token);
        this.ok(res, dto);
    });

    get_by_id = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(teams_get_by_id_schema, req);
        const dto = await this._teams_service.get_by_id(body, req.session_data?.target_token);
        this.ok(res, dto);
    });

    create = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_create_schema, req);
        const dto = await this._teams_service.create(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    update = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_update_schema, req);
        const dto = await this._teams_service.update(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    download = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_download_schema, req);
        const dto = await this._teams_service.download(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    publish = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_publish_schema, req);
        const dto = await this._teams_service.publish(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    unpublish = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_unpublish_schema, req);
        const dto = await this._teams_service.unpublish(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    delete_team = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_delete_schema, req);
        const dto = await this._teams_service.delete_team(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    rename = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(teams_rename_schema, req);
        const dto = await this._teams_service.rename(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_versions = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(teams_get_versions_schema, req);
        const dto = await this._teams_service.get_versions(body);
        this.ok(res, dto);
    });

    get_phases = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(teams_get_phases_schema, req);
        const dto = await this._teams_service.get_phases(body);
        this.ok(res, dto);
    });

    private _require_builder(): BuilderService {
        if (!this._builder_service) {
            throw new ApiError('internal', 'Builder service not configured', 500);
        }
        return this._builder_service;
    }

    build = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(teams_build_schema, req);
        const token = req.session_data?.target_token;
        const dto = await this._require_builder().build(body, token);
        this.ok(res, dto);
    });
}
