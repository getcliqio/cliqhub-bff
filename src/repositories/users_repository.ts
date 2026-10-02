/**
 * Users — Core calls for `/v1/users/*` and the site-admin `/internal/users/*`.
 * Returns Core's `data` (VO); never maps.
 */

import type { CoreClient } from './core_client.js';
import type {
    UsersGetVO, UserDetailVO, UsersNewVO, UsersUpdateVO, UsersSuspendVO, UsersDeleteVO,
    UsersSetRoleVO, UsersResetPasswordVO, UsersForgotPasswordVO, UsersUpdateRoleVO, UsersUpdateProfileVO,
    UsersChangePasswordVO,
} from '../types/core/users.js';
import type {
    UserIdInput, UsersNewInput, UsersUpdateInput, UsersSuspendInput,
    UsersSetRoleInput, UsersResetPasswordInput, UsersForgotPasswordInput, UsersUpdateRoleInput,
    UsersUpdateProfileInput, UsersChangePasswordInput, UsersResetWithTokenInput,
} from '../schemas/users_types.js';

/** `users/get` body, in Core's field names (users_get_schema; `query` is Core's preferred search field). */
export interface UsersGetFilter {
    org_id?: string;
    realm_id?: string;
    query?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
}

/** Core user calls (`/v1/users/*`, site-admin `/internal/users/*`). */
export class UsersRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/users/get` */
    async get(filter: UsersGetFilter, token: string): Promise<UsersGetVO> {
        return this._client.post<UsersGetVO>('/v1/users/get', filter, token);
    }

    /** `POST /v1/users/get_by_id` */
    async get_by_id(input: UserIdInput, token: string): Promise<UserDetailVO> {
        return this._client.post<UserDetailVO>('/v1/users/get_by_id', input, token);
    }

    /** `POST /internal/users/new` */
    async new(input: UsersNewInput, token: string): Promise<UsersNewVO> {
        return this._client.post<UsersNewVO>('/internal/users/new', input, token);
    }

    /** `POST /v1/users/update` — another user's name / email. */
    async update(input: UsersUpdateInput, token: string): Promise<UsersUpdateVO> {
        return this._client.post<UsersUpdateVO>('/v1/users/update', input, token);
    }

    /** `POST /internal/users/suspend` */
    async suspend(input: UsersSuspendInput, token: string): Promise<UsersSuspendVO> {
        return this._client.post<UsersSuspendVO>('/internal/users/suspend', input, token);
    }

    /** `POST /internal/users/unsuspend` */
    async unsuspend(input: UserIdInput, token: string): Promise<UsersSuspendVO> {
        return this._client.post<UsersSuspendVO>('/internal/users/unsuspend', input, token);
    }

    /** `POST /internal/users/delete` */
    async delete(input: UserIdInput, token: string): Promise<UsersDeleteVO> {
        return this._client.post<UsersDeleteVO>('/internal/users/delete', input, token);
    }

    /** `POST /internal/users/set_role` */
    async set_role(input: UsersSetRoleInput, token: string): Promise<UsersSetRoleVO> {
        return this._client.post<UsersSetRoleVO>('/internal/users/set_role', input, token);
    }

    /** `POST /internal/users/reset_password` `{ user_id }` — site admin. */
    async reset_password(input: UsersResetPasswordInput, token: string): Promise<UsersResetPasswordVO> {
        return this._client.post<UsersResetPasswordVO>('/internal/users/reset_password', input, token);
    }

    /** `POST /internal/users/reset_password` `{ email }` — signed out (no bearer). */
    async forgot_password(input: UsersForgotPasswordInput): Promise<UsersForgotPasswordVO> {
        return this._client.post<UsersForgotPasswordVO>('/internal/users/reset_password', input);
    }

    /** `POST /internal/users/update_role` — org role of a member. */
    async update_role(input: UsersUpdateRoleInput, token: string): Promise<UsersUpdateRoleVO> {
        return this._client.post<UsersUpdateRoleVO>('/internal/users/update_role', input, token);
    }

    /** `POST /v1/users/update` without `user_id` — the caller's own profile. */
    async update_profile(input: UsersUpdateProfileInput, token: string): Promise<UsersUpdateProfileVO> {
        return this._client.post<UsersUpdateProfileVO>('/v1/users/update', input, token);
    }

    /** `POST /internal/users/change_password` `{ current_password, new_password }` — signed in. */
    async change_password(input: UsersChangePasswordInput, token: string): Promise<UsersChangePasswordVO> {
        return this._client.post<UsersChangePasswordVO>('/internal/users/change_password', input, token);
    }

    /** `POST /internal/users/change_password` `{ reset_token, new_password }` — signed out; the token is the credential. */
    async reset_with_token(input: UsersResetWithTokenInput): Promise<UsersChangePasswordVO> {
        return this._client.post<UsersChangePasswordVO>('/internal/users/change_password', input);
    }
}
