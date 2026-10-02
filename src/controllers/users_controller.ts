/**
 * Users — site-admin user management, org roles and the caller's own account.
 *
 * Routes (1:1 with this controller, mounted in routes/users.ts):
 *   POST /v1/users/get              — list users
 *   POST /v1/users/get_by_id        — one user's detail
 *   POST /v1/users/new              — create an invited user       (site_admin)
 *   POST /v1/users/update           — update a user's name / email
 *   POST /v1/users/suspend          — suspend a user               (site_admin)
 *   POST /v1/users/unsuspend        — lift a suspension            (site_admin)
 *   POST /v1/users/delete           — soft-delete a user           (site_admin)
 *   POST /v1/users/set_role         — set the site role            (site_admin)
 *   POST /v1/users/reset_password   — send a reset email           (site_admin; public with `email`)
 *   POST /v1/users/update_role      — set a member's org role
 *   POST /v1/users/update_profile   — caller's own profile
 *   POST /v1/users/change_password  — change a password            (session; public with `reset_token`)
 *
 * Every route needs a session except the two public bodies above, chosen per
 * body by routes/route_auth.ts and by `body_has` here; Core re-checks every write.
 * The public "Forgot password" body is limited per client address here
 * (config/limits.ts); Core limits it per email.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Users*Input` in `schemas/users_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { UsersService } from '../services/users_service.js';
import type { EnvConfig } from '../config/env.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    UsersGetInput, UserIdInput, UsersNewInput, UsersUpdateInput, UsersSuspendInput,
    UsersSetRoleInput, UsersResetPasswordInput, UsersForgotPasswordInput, UsersUpdateRoleInput,
    UsersUpdateProfileInput, UsersChangePasswordInput, UsersResetWithTokenInput,
} from '../schemas/users_types.js';
import type {
    UsersGetData, UserDetailData, UsersNewData, UsersUpdateData, UsersSuspendData,
    UsersDeleteData, UsersSetRoleData, UsersResetPasswordData, UsersForgotPasswordData, UsersUpdateRoleData,
    UsersUpdateProfileData, UsersChangePasswordData,
} from '../schemas/users_types.js';
import { body_has } from '../lib/request_auth.js';
import type { SlidingWindowLimiter } from '../lib/sliding_window_limiter.js';
import { ApiError } from '../errors/api_error.js';
import { set_session_cookie, wants_bearer_token } from '../lib/session_cookie.js';
import { to_password_reset_data } from '../mappers/users_mapper.js';

/** User management, org roles and the caller's own account. */
export class UsersController extends BaseController {
    /**
     * @param _forgot_limiter - Public "Forgot password" requests per client address (`req.ip`).
     */
    constructor(
        private readonly _users_service: UsersService,
        private readonly _config: EnvConfig,
        private readonly _forgot_limiter: SlidingWindowLimiter,
    ) {
        super();
    }

    /**
     * Lists users: the hub-wide list (site admins), an org's members (`org_id`)
     * or hub users to invite into a realm (`realm_id`).
     *
     * @param req - Body: {@link UsersGetInput}
     * @param res - `{ ok: true, data: UsersGetData }`; 403 for a non-admin hub-wide list
     */
    async get(req: ApiRequest<UsersGetInput, UsersGetData>, res: ApiOkResponse<UsersGetData>): Promise<void> {
        const body = this.parse_body(UsersGetInput, req);
        this.ok(res, await this._users_service.get(body, this.session(req)));
    }

    /**
     * One user's detail with the orgs they belong to and what they own.
     *
     * @param req - Body: {@link UserIdInput}
     * @param res - `{ ok: true, data: UserDetailData }`
     */
    async get_by_id(req: ApiRequest<UserIdInput, UserDetailData>, res: ApiOkResponse<UserDetailData>): Promise<void> {
        const body = this.parse_body(UserIdInput, req);
        this.ok(res, await this._users_service.get_by_id(body, this.session(req).target_token));
    }

    /**
     * Creates an invited user and emails them a set-password link (site admin);
     * `reactivate` restores a soft-deleted user.
     *
     * @param req - Body: {@link UsersNewInput}
     * @param res - `{ ok: true, data: UsersNewData }`
     */
    async new(req: ApiRequest<UsersNewInput, UsersNewData>, res: ApiOkResponse<UsersNewData>): Promise<void> {
        const body = this.parse_body(UsersNewInput, req);
        this.ok(res, await this._users_service.new(body, this.session(req).target_token));
    }

    /**
     * Updates another user's display name or email.
     *
     * @param req - Body: {@link UsersUpdateInput}
     * @param res - `{ ok: true, data: UsersUpdateData }`
     */
    async update(req: ApiRequest<UsersUpdateInput, UsersUpdateData>, res: ApiOkResponse<UsersUpdateData>): Promise<void> {
        const body = this.parse_body(UsersUpdateInput, req);
        this.ok(res, await this._users_service.update(body, this.session(req).target_token));
    }

    /**
     * Suspends a user (site admin); their sessions and tokens stop working.
     *
     * @param req - Body: {@link UsersSuspendInput}
     * @param res - `{ ok: true, data: UsersSuspendData }`
     */
    async suspend(req: ApiRequest<UsersSuspendInput, UsersSuspendData>, res: ApiOkResponse<UsersSuspendData>): Promise<void> {
        const body = this.parse_body(UsersSuspendInput, req);
        this.ok(res, await this._users_service.suspend(body, this.session(req).target_token));
    }

    /**
     * Lifts a suspension (site admin).
     *
     * @param req - Body: {@link UserIdInput}
     * @param res - `{ ok: true, data: UsersSuspendData }`
     */
    async unsuspend(req: ApiRequest<UserIdInput, UsersSuspendData>, res: ApiOkResponse<UsersSuspendData>): Promise<void> {
        const body = this.parse_body(UserIdInput, req);
        this.ok(res, await this._users_service.unsuspend(body, this.session(req).target_token));
    }

    /**
     * Soft-deletes a user (site admin); 409 `owns_orgs` while they own other orgs.
     *
     * @param req - Body: {@link UserIdInput}
     * @param res - `{ ok: true, data: UsersDeleteData }`
     */
    async delete(req: ApiRequest<UserIdInput, UsersDeleteData>, res: ApiOkResponse<UsersDeleteData>): Promise<void> {
        const body = this.parse_body(UserIdInput, req);
        this.ok(res, await this._users_service.delete(body, this.session(req).target_token));
    }

    /**
     * Sets a user's site role (site admin).
     *
     * @param req - Body: {@link UsersSetRoleInput}
     * @param res - `{ ok: true, data: UsersSetRoleData }`
     */
    async set_role(req: ApiRequest<UsersSetRoleInput, UsersSetRoleData>, res: ApiOkResponse<UsersSetRoleData>): Promise<void> {
        const body = this.parse_body(UsersSetRoleInput, req);
        this.ok(res, await this._users_service.set_role(body, this.session(req).target_token));
    }

    /**
     * Sends a password reset email. A site admin sends `{ user_id }`; a
     * signed-out "Forgot password" sends `{ email }` and always gets
     * `{ requested: true }`: 429 `rate_limited` (with `Retry-After`) over the
     * per-address limit, before Core is called; Core's per-email 429 passes through.
     *
     * @param req - Body: {@link UsersResetPasswordInput} or {@link UsersForgotPasswordInput}
     * @param res - `{ ok: true, data: UsersResetPasswordData | UsersForgotPasswordData }`
     */
    async reset_password(
        req: ApiRequest<UsersResetPasswordInput | UsersForgotPasswordInput, UsersResetPasswordData | UsersForgotPasswordData>,
        res: ApiOkResponse<UsersResetPasswordData | UsersForgotPasswordData>,
    ): Promise<void> {
        if (body_has(req, 'email')) {
            const body = this.parse_body(UsersForgotPasswordInput, req);
            const limit = this._forgot_limiter.hit(req.ip ?? req.socket.remoteAddress ?? 'unknown');
            if (!limit.allowed) {
                const retry_after_seconds = Math.ceil(limit.retry_after_ms / 1000);
                res.set('Retry-After', String(retry_after_seconds));
                throw new ApiError('rate_limited', 'Too many password reset requests from this address. Try again later.', 429, { retry_after_seconds });
            }
            this.ok(res, await this._users_service.forgot_password(body));
            return;
        }
        const body = this.parse_body(UsersResetPasswordInput, req);
        this.ok(res, await this._users_service.reset_password(body, this.session(req).target_token));
    }

    /**
     * Sets a member's role in one org (`org.members.manage` in Core).
     *
     * @param req - Body: {@link UsersUpdateRoleInput}
     * @param res - `{ ok: true, data: UsersUpdateRoleData }`
     */
    async update_role(
        req: ApiRequest<UsersUpdateRoleInput, UsersUpdateRoleData>,
        res: ApiOkResponse<UsersUpdateRoleData>,
    ): Promise<void> {
        const body = this.parse_body(UsersUpdateRoleInput, req);
        this.ok(res, await this._users_service.update_role(body, this.session(req).target_token));
    }

    /**
     * Updates the caller's own display name, email or preferences.
     *
     * @param req - Body: {@link UsersUpdateProfileInput}
     * @param res - `{ ok: true, data: UsersUpdateProfileData }`
     */
    async update_profile(
        req: ApiRequest<UsersUpdateProfileInput, UsersUpdateProfileData>,
        res: ApiOkResponse<UsersUpdateProfileData>,
    ): Promise<void> {
        const body = this.parse_body(UsersUpdateProfileInput, req);
        this.ok(res, await this._users_service.update_profile(body, this.session(req).target_token));
    }

    /**
     * Changes a password. Signed in: `{ current_password, new_password }`.
     * From an emailed link: `{ reset_token, new_password }` (public) — the
     * person is then signed in (session cookie set; `session` carries the
     * sign-in data, with the bearer token for `X-Client: cli`).
     *
     * @param req - Body: {@link UsersChangePasswordInput} or {@link UsersResetWithTokenInput}
     * @param res - `{ ok: true, data: UsersChangePasswordData }`
     */
    async change_password(
        req: ApiRequest<UsersChangePasswordInput | UsersResetWithTokenInput, UsersChangePasswordData>,
        res: ApiOkResponse<UsersChangePasswordData>,
    ): Promise<void> {
        if (body_has(req, 'reset_token')) {
            const body = this.parse_body(UsersResetWithTokenInput, req);
            const outcome = await this._users_service.reset_with_token(body);
            if (outcome.session) set_session_cookie(res, this._config, outcome.session.session_id);
            this.ok(res, to_password_reset_data(outcome, wants_bearer_token(req)));
            return;
        }
        const body = this.parse_body(UsersChangePasswordInput, req);
        this.ok(res, await this._users_service.change_password(body, this.session(req).target_token));
    }
}
