/**
 * Auth — account sign-up.
 *
 * Routes (1:1 with this controller, mounted in routes/auth.ts):
 *   POST /v1/auth/signup — new account → signed-in session (public)
 *
 * Tokens: controllers/tokens_controller.ts. Dispatch keys: controllers/dispatch_key_controller.ts.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `AuthSignupInput` in `schemas/auth_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { SessionService } from '../services/session_service.js';
import type { EnvConfig } from '../config/env.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { AuthSignupInput } from '../schemas/auth_types.js';
import type { LoginData, CliLoginData } from '../schemas/session_types.js';
import { set_session_cookie, wants_bearer_token } from '../lib/session_cookie.js';
import { to_cli_login_data } from '../mappers/session_mapper.js';

/** Account sign-up. */
export class AuthController extends BaseController {
    constructor(
        private readonly _session_service: SessionService,
        private readonly _config: EnvConfig,
    ) {
        super();
    }

    /**
     * Creates an account (with its personal org and realm in Core) and signs
     * it in. A CLI client (`X-Client: cli`) also gets the bearer token.
     *
     * @param req - Body: {@link AuthSignupInput}
     * @param res - HTTP 201 `{ ok: true, data: LoginData | CliLoginData }`
     */
    async signup(
        req: ApiRequest<AuthSignupInput, LoginData | CliLoginData>,
        res: ApiOkResponse<LoginData | CliLoginData>,
    ): Promise<void> {
        const body = this.parse_body(AuthSignupInput, req);
        const created = await this._session_service.create_from_signup(body);
        set_session_cookie(res, this._config, created.session_id);
        this.ok(res, wants_bearer_token(req) ? to_cli_login_data(created.login, created.target_token) : created.login, 201);
    }
}
