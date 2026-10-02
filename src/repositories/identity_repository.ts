/**
 * Sign-in identity — the Core calls behind BFF sessions: password sign-in,
 * sign-up, act-as token minting, session-token revoke, and resolving a PAT
 * to its user. Used by services/session_service.ts only.
 */

import type { CoreClient } from './core_client.js';
import { ApiError } from '../errors/api_error.js';
import type { UserVO } from '../types/core/users.js';
import type {
    AuthenticateUserVO, SignupVO, IssueSessionTokenVO, ValidateTokenVO, IdentityUserVO,
    IdentityScopesVO, ResolvedIdentityVO,
} from '../types/core/identity.js';

/** The Core identity calls behind BFF sessions. */
export class IdentityRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /internal/auth/authenticate_user` — username + password → session PAT. */
    async authenticate_user(username: string, password: string): Promise<AuthenticateUserVO> {
        return this._client.post<AuthenticateUserVO>('/internal/auth/authenticate_user', { username, password });
    }

    /** `POST /internal/auth/signup` — new account → session PAT. */
    async signup(username: string, email: string, password: string): Promise<SignupVO> {
        return this._client.post<SignupVO>('/internal/auth/signup', { username, email, password });
    }

    /** `POST /internal/auth/issue_session_token` — a site admin's user_token mints a PAT for `user_id`. */
    async issue_session_token(user_id: string, admin_token: string): Promise<IssueSessionTokenVO> {
        return this._client.post<IssueSessionTokenVO>('/internal/auth/issue_session_token', { user_id }, admin_token);
    }

    /** `POST /internal/auth/revoke_session_token` — idempotent; internal network, no bearer. */
    async revoke_session_token(token: string): Promise<void> {
        await this._client.post<unknown>('/internal/auth/revoke_session_token', { token });
    }

    /**
     * Resolves a user PAT to its user, scope slugs and org slugs
     * (validate_token → users/get_by_id → orgs/get_scopes).
     *
     * @throws ApiError 401 when Core says the token is not valid.
     */
    async resolve_identity(token: string): Promise<ResolvedIdentityVO> {
        const validated = await this._client.post<ValidateTokenVO>('/v1/auth/validate_token', { token }, token);
        const user_id = validated.user_id;
        if (!validated.valid || typeof user_id !== 'string' || user_id.length === 0) {
            throw ApiError.unauthorized('Invalid token');
        }

        const detail = await this.get_user_by_id(user_id, token, true);
        const scopes = await this.list_scope_slugs(user_id, token);

        const user: UserVO = {
            id: String(detail.id),
            username: detail.username,
            display_name: detail.display_name || detail.username,
            email: detail.email,
            role: detail.role === 'admin' ? 'admin' : 'user',
            suspended_at: detail.suspended_at,
            suspended_reason: detail.suspended_reason ?? '',
            created_at: detail.created_at,
            preferences: detail.preferences ?? {},
        };
        return { user, scopes, org_slugs: (detail.orgs ?? []).map((o) => o.slug) };
    }

    /** `POST /v1/users/get_by_id` — a user as the token's holder sees them. */
    async get_user_by_id(user_id: string, token: string, include_preferences = false): Promise<IdentityUserVO> {
        const body = include_preferences ? { user_id, include_preferences: true } : { user_id };
        return this._client.post<IdentityUserVO>('/v1/users/get_by_id', body, token);
    }

    /** `POST /v1/orgs/get_scopes` — slugs of the scopes `user_id` can publish to. */
    async list_scope_slugs(user_id: string, token: string): Promise<string[]> {
        const res = await this._client.post<IdentityScopesVO>('/v1/orgs/get_scopes', { user_id }, token);
        return (res.items ?? [])
            .map((s) => s.slug)
            .filter((s): s is string => typeof s === 'string' && s.length > 0);
    }
}
