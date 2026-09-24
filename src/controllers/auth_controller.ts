import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { AuthService } from '../services/auth_service.js';
import type { SessionService } from '../services/session_service.js';
import type { EnvConfig } from '../config/env.js';
import {
    signup_schema,
    new_token_schema, revoke_token_schema,
    rotate_token_schema, list_tokens_schema,
} from '../schemas/auth_schemas.js';

/**
 * Auth controller — signup + token CRUD only.
 * Session create/get/update/delete are on SessionController (/v1/session/*).
 */
export class AuthController extends BaseController {
    private _auth_service: AuthService;
    private _session_service: SessionService;
    private _config: EnvConfig;

    constructor(
        auth_service: AuthService,
        session_service: SessionService,
        config: EnvConfig,
    ) {
        super();
        this._auth_service = auth_service;
        this._session_service = session_service;
        this._config = config;
    }

    signup = this.wrap(async (req: Request, res: Response) => {
        const body = this.parse_body(signup_schema, req);
        const { session_id, target_token, dto } = await this._session_service.create_from_signup(
            body.username.trim().toLowerCase(),
            body.email.trim().toLowerCase(),
            body.password,
        );

        this._set_session_cookie(res, session_id);
        if (this._wants_bearer_token(req)) {
            this.ok(res, {
                ...dto,
                scopes: dto.scopes.map((s) => s.slug),
                token: target_token,
            }, 201);
            return;
        }
        this.ok(res, dto, 201);
    });

    new_token = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const body = this.parse_body(new_token_schema, req);
        const dto = await this._auth_service.new_token({
            type: body.type,
            name: body.name,
            realm_ids: body.realm_ids,
            realm_id: body.realm_id,
            aud: body.aud,
            run_id: body.run_id,
            action: body.action,
            permissions: body.permissions,
        }, backend_token);
        this.ok(res, dto, 201);
    });

    list_tokens = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const body = this.parse_body(list_tokens_schema, req);
        const dto = await this._auth_service.list_tokens({
            type: body.type,
            realm_id: body.realm_id,
            limit: body.limit,
            offset: body.offset,
        }, backend_token);
        this.ok(res, dto);
    });

    revoke_token = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const body = this.parse_body(revoke_token_schema, req);
        const dto = await this._auth_service.revoke_token({
            type: body.type,
            token_id: body.token_id,
            realm_id: body.realm_id,
        }, backend_token);
        this.ok(res, dto);
    });

    rotate_token = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({
                ok: false,
                error: { code: 'unauthorized', message: 'Login required' },
            });
            return;
        }
        const body = this.parse_body(rotate_token_schema, req);
        const dto = await this._auth_service.rotate_token({
            type: body.type,
            token_id: body.token_id,
            realm_id: body.realm_id,
        }, backend_token);
        this.ok(res, dto);
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

    /** Prefer Authorization Bearer; else cookie session target_token. */
    private _resolve_backend_token(req: Request): string | null {
        const header = req.headers.authorization ?? '';
        if (header.startsWith('Bearer ')) {
            const bearer = header.slice(7).trim();
            if (bearer) return bearer;
        }
        const session_token = req.session_data?.target_token;
        if (session_token) return session_token;
        return null;
    }
}
