import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { SessionService } from '../services/session_service.js';
import type { EnvConfig } from '../config/env.js';
import {
    session_create_schema,
    session_update_schema,
} from '../schemas/session_schemas.js';

export class SessionController extends BaseController {
    private _session_service: SessionService;
    private _config: EnvConfig;

    constructor(session_service: SessionService, config: EnvConfig) {
        super();
        this._session_service = session_service;
        this._config = config;
    }

    /**
     * POST /v1/session/create — credentials → dual-token session + Set-Cookie.
     * CLI (`X-Client: cli`): also return target_token as `data.token`.
     */
    create = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(session_create_schema, req);
        const { session_id, target_token, dto } = await this._session_service.create(
            body.username.trim().toLowerCase(),
            body.password,
        );

        this._set_session_cookie(res, session_id);
        if (this._wants_bearer_token(req)) {
            this.ok(res, {
                ...dto,
                scopes: dto.scopes.map((s) => s.slug),
                token: target_token,
            });
            return;
        }
        this.ok(res, dto);
    });

    /** POST /v1/session/get — identity for act_as_user_id; acting_as when unequal. */
    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const dto = await this._session_service.get(req.session_data);
        this.ok(res, dto);
    });

    /**
     * POST /v1/session/update — `{ act_as_user_id: number | null }`.
     * null = exit act-as. Changes only target_token + act_as_user_id.
     */
    update = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const body = this.parse_body(session_update_schema, req);
        const dto = await this._session_service.update(
            req.session_data,
            body.act_as_user_id,
        );
        this.ok(res, dto);
    });

    /** POST /v1/session/delete — revoke PAT(s), destroy session, clear cookie. */
    delete = this.wrap(async (req: Request, res: Response) => {
        if (req.session_data) {
            await this._session_service.delete(req.session_data);
        }
        res.clearCookie(this._config.cookie_name);
        this.ok(res, { deleted: true });
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

    private _wants_bearer_token(req: Request): boolean {
        const client = (req.get('x-client') ?? '').trim().toLowerCase();
        return client === 'cli';
    }
}
