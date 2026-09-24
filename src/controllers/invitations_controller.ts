import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { InvitationsService } from '../services/invitations_service.js';
import type { SessionService } from '../services/session_service.js';
import type { EnvConfig } from '../config/env.js';
import {
    invitations_create_schema,
    invitations_get_schema,
    invitations_get_by_id_schema,
    invitations_revoke_schema,
    invitations_get_by_token_schema,
    invitations_accept_schema,
} from '../schemas/invitations_schemas.js';

export class InvitationsController extends BaseController {
    private _invitations_service: InvitationsService;
    private _session_service: SessionService;
    private _config: EnvConfig;

    constructor(
        invitations_service: InvitationsService,
        session_service: SessionService,
        config: EnvConfig,
    ) {
        super();
        this._invitations_service = invitations_service;
        this._session_service = session_service;
        this._config = config;
    }

    create = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(invitations_create_schema, req);
        const dto = await this._invitations_service.create(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(invitations_get_schema, req);
        const dto = await this._invitations_service.get(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_by_id = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(invitations_get_by_id_schema, req);
        const dto = await this._invitations_service.get_by_id(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    revoke = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(invitations_revoke_schema, req);
        const dto = await this._invitations_service.revoke(body, req.session_data.target_token);
        this.ok(res, dto);
    });

    get_by_token = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(invitations_get_by_token_schema, req);
        const dto = await this._invitations_service.get_by_token(
            body,
            req.session_data?.target_token,
        );
        this.ok(res, dto);
    });

    accept = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(invitations_accept_schema, req);
        const result = await this._invitations_service.accept(
            body,
            req.session_data?.target_token,
        ) as {
            token?: string;
            [key: string]: unknown;
        };

        if (!result.token) {
            this.ok(res, result);
            return;
        }

        const { session_id, target_token, dto } = await this._session_service.create_from_backend_token(
            result.token,
        );
        this._set_session_cookie(res, session_id);

        const { token: _omit, ...rest } = result;
        const client = (req.get('x-client') ?? '').trim().toLowerCase();
        if (client === 'cli') {
            this.ok(res, {
                ...rest,
                ...dto,
                token: target_token,
            });
            return;
        }

        this.ok(res, {
            ...rest,
            ...dto,
        });
    });

    private _set_session_cookie(res: Response, session_id: string): void {
        res.cookie(this._config.cookie_name, session_id, {
            httpOnly: true,
            secure: this._config.node_env === 'production',
            sameSite: 'lax',
            maxAge: this._config.session_ttl_seconds * 1000,
            path: '/',
        });
    }
}
