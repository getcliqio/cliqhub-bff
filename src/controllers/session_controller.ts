/**
 * Session — sign in / out and act-as for the SPA (cookie) and CLI (bearer).
 *
 * Routes (1:1 with this controller, mounted in routes/auth.ts):
 *   POST /v1/session/create  — sign in                       (public)
 *   POST /v1/session/get     — the signed-in (acted-as) user
 *   POST /v1/session/update  — act as another user, or stop  (site admins; checked in SessionService)
 *   POST /v1/session/delete  — sign out                      (public; no-op without a session)
 *
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Session*Input` in `schemas/session_types.ts`.
 */

import type { Request } from 'express';
import { BaseController } from './base_controller.js';
import type { SessionService } from '../services/session_service.js';
import type { EnvConfig } from '../config/env.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { SessionCreateInput, SessionUpdateInput } from '../schemas/session_types.js';
import type { SessionData, LoginData, CliLoginData, SessionDeleteData } from '../schemas/session_types.js';
import { set_session_cookie, clear_session_cookie, wants_bearer_token } from '../lib/session_cookie.js';
import { to_cli_login_data } from '../mappers/session_mapper.js';

/** Sign in / out, session read and act-as. */
export class SessionController extends BaseController {
    constructor(
        private readonly _session_service: SessionService,
        private readonly _config: EnvConfig,
    ) {
        super();
    }

    /**
     * Signs in with username + password and sets the session cookie.
     * A CLI client (`X-Client: cli`) also gets the bearer token and scope slugs.
     *
     * @param req - Body: {@link SessionCreateInput}
     * @param res - `{ ok: true, data: LoginData | CliLoginData }`; 401 on bad credentials
     */
    async create(
        req: ApiRequest<SessionCreateInput, LoginData | CliLoginData>,
        res: ApiOkResponse<LoginData | CliLoginData>,
    ): Promise<void> {
        const body = this.parse_body(SessionCreateInput, req);
        const created = await this._session_service.create(body);
        set_session_cookie(res, this._config, created.session_id);
        this.ok(res, wants_bearer_token(req) ? to_cli_login_data(created.login, created.target_token) : created.login);
    }

    /**
     * The signed-in user — the acted-as user while a site admin acts as someone
     * (`acting_as` names the admin).
     *
     * @param req - No body
     * @param res - `{ ok: true, data: SessionData }`
     */
    async get(req: Request, res: ApiOkResponse<SessionData>): Promise<void> {
        this.ok(res, await this._session_service.get(this.session(req)));
    }

    /**
     * Site admins: act as another user (`act_as_user_id`) or stop (`null`).
     * Only the bearer sent to Core changes; the admin stays signed in.
     *
     * @param req - Body: {@link SessionUpdateInput}
     * @param res - `{ ok: true, data: SessionData }`; 403 for non-admins
     */
    async update(req: ApiRequest<SessionUpdateInput, SessionData>, res: ApiOkResponse<SessionData>): Promise<void> {
        const body = this.parse_body(SessionUpdateInput, req);
        this.ok(res, await this._session_service.update(this.session(req), body));
    }

    /**
     * Signs out: revokes the session's tokens, destroys it, clears the cookie.
     * Answers the same without a session.
     *
     * @param req - No body
     * @param res - `{ ok: true, data: SessionDeleteData }`
     */
    async delete(req: Request, res: ApiOkResponse<SessionDeleteData>): Promise<void> {
        const data = await this._session_service.delete(req.session_data);
        clear_session_cookie(res, this._config);
        this.ok(res, data);
    }
}
