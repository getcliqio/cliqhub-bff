import type { ApiClient } from './api_client.js';
import { ApiError } from './api_error.js';
import type {
    SignupResponseVO, UserVO,
    CreateTokenResponseVO, RevokeTokenResponseVO, ListTokensResponseVO,
    RotateTokenResponseVO,
} from '../types/vo.js';

/** Core POST /internal/auth/authenticate_user */
export interface AuthenticateUserResponseVO {
    user: UserVO;
    token: string;
    scopes: string[];
    org_slugs: string[];
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    enroll_token?: string | null;
    orgs?: { id: string; slug: string; name: string; default_realm_slug: string }[];
}

export interface IssueSessionTokenResponseVO {
    user_id: string;
    token: string;
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    enroll_token?: string | null;
    orgs?: { id: string; slug: string; name: string; default_realm_slug: string }[];
}

export interface ResolvedIdentityVO {
    user: UserVO;
    scopes: string[];
    org_slugs: string[];
}

export class AuthRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async authenticate_user(
        username: string,
        password: string,
    ): Promise<AuthenticateUserResponseVO> {
        return this._client.post<AuthenticateUserResponseVO>(
            '/internal/auth/authenticate_user',
            { username, password },
        );
    }

    async signup(
        username: string,
        email: string,
        password: string,
    ): Promise<SignupResponseVO> {
        return this._client.post<SignupResponseVO>(
            '/internal/auth/signup',
            { username, email, password },
        );
    }

    /**
     * Site-admin Bearer (user_token) mints a session PAT as target user_id.
     */
    async issue_session_token(
        user_id: string,
        admin_token: string,
    ): Promise<IssueSessionTokenResponseVO> {
        return this._client.post<IssueSessionTokenResponseVO>(
            '/internal/auth/issue_session_token',
            { user_id },
            admin_token,
        );
    }

    /** Soft-revoke a session PAT. Idempotent; no Bearer required (internal net). */
    async revoke_session_token(token: string): Promise<{ ok: true }> {
        return this._client.post<{ ok: true }>(
            '/internal/auth/revoke_session_token',
            { token },
        );
    }

    /**
     * Resolve identity for an opaque user PAT without /v1/auth/me
     * (validate_token + users/get_by_id + scopes/get).
     */
    async resolve_identity(token: string): Promise<ResolvedIdentityVO> {
        const validated = await this._client.post<{
            valid: boolean;
            user_id?: string;
        }>('/v1/auth/validate_token', { token }, token);

        // user_id is a UUID string (not a legacy integer id).
        const user_id = validated.user_id;
        if (!validated.valid || typeof user_id !== 'string' || user_id.length === 0) {
            throw new ApiError('unauthorized', 'Invalid token', 401);
        }

        const detail = await this._client.post<{
            id: string;
            username: string;
            display_name: string;
            email: string;
            role: string;
            suspended_at: string | null;
            suspended_reason?: string;
            created_at: string;
            preferences?: Record<string, unknown>;
            orgs?: { id: string; slug: string; display_name: string; role: string }[];
        }>('/v1/users/get_by_id', { user_id, include_preferences: true }, token);

        const scopes_res = await this._client.post<{
            scopes: Array<{ slug?: string } | string>;
        }>('/v1/scopes/get', { mine: true }, token);

        const scope_slugs = (scopes_res.scopes ?? [])
            .map((s) => (typeof s === 'string' ? s : s.slug))
            .filter((s): s is string => typeof s === 'string' && s.length > 0);

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

        return {
            user,
            scopes: scope_slugs,
            org_slugs: (detail.orgs ?? []).map((o) => o.slug),
        };
    }

    /** Fetch another user (act-as target) using the admin's user_token. */
    async get_user_by_id(
        user_id: string,
        token: string,
    ): Promise<{
        id: string;
        username: string;
        display_name: string;
        email: string;
        role: string;
        suspended_at: string | null;
        orgs?: { slug: string }[];
    }> {
        return this._client.post(
            '/v1/users/get_by_id',
            { user_id },
            token,
        );
    }

    async list_scopes(token: string): Promise<{ scopes: string[] }> {
        const res = await this._client.post<{
            scopes: Array<{ slug?: string } | string>;
        }>('/v1/scopes/get', { mine: true }, token);
        const scopes = (res.scopes ?? [])
            .map((s) => (typeof s === 'string' ? s : s.slug))
            .filter((s): s is string => typeof s === 'string' && s.length > 0);
        return { scopes };
    }

    async new_token(
        opts: {
            type?: 'user' | 'realm' | 'a2a' | 'daemon_wire';
            name?: string;
            realm_ids?: string[];
            realm_id?: string;
            aud?: string;
            run_id?: string;
            action?: 'execute' | 'cancel' | 'access';
            permissions?: Record<string, unknown>;
        },
        token: string,
    ): Promise<CreateTokenResponseVO> {
        const type = opts.type ?? 'user';
        return this._client.post<CreateTokenResponseVO>(
            '/v1/auth/generate_token',
            {
                type,
                name: opts.name,
                realm_ids: opts.realm_ids,
                realm_id: opts.realm_id,
                aud: opts.aud,
                run_id: opts.run_id,
                action: opts.action,
                permissions: opts.permissions,
            },
            token,
        );
    }

    async list_tokens(
        opts: {
            type?: 'user' | 'realm';
            realm_id?: string;
            limit?: number;
            offset?: number;
        },
        token: string,
    ): Promise<ListTokensResponseVO> {
        return this._client.post<ListTokensResponseVO>(
            '/v1/auth/get_tokens',
            {
                type: opts.type ?? 'user',
                realm_id: opts.realm_id,
                limit: opts.limit,
                offset: opts.offset,
            },
            token,
        );
    }

    async revoke_token(
        opts: {
            type?: 'user' | 'realm';
            token_id: number | string;
            realm_id?: string;
        },
        token: string,
    ): Promise<RevokeTokenResponseVO> {
        return this._client.post<RevokeTokenResponseVO>(
            '/v1/auth/revoke_token',
            {
                type: opts.type ?? 'user',
                token_id: opts.token_id,
                realm_id: opts.realm_id,
            },
            token,
        );
    }

    async rotate_token(
        opts: {
            type?: 'user' | 'realm' | 'a2a';
            token_id?: number | string;
            realm_id?: string;
        },
        token: string,
    ): Promise<RotateTokenResponseVO> {
        return this._client.post<RotateTokenResponseVO>(
            '/v1/auth/rotate_token',
            {
                type: opts.type ?? 'user',
                token_id: opts.token_id,
                realm_id: opts.realm_id,
            },
            token,
        );
    }
}
