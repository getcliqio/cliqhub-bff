/**
 * BFF session service — dual-token model.
 *
 * Every session always stores BOTH:
 *   user_token     — session PAT for user_id (set at login; never replaced on act-as)
 *   target_token   — session PAT for act_as_user_id (ALWAYS used as Bearer to Core)
 *
 * Login:  mint once → user_token = target_token; user_id = act_as_user_id
 * Act-as: mint via Core issue_session_token → change ONLY target_token + act_as_user_id
 *         (revoke previous target if ≠ user_token). user_token is immutable.
 * Exit:   revoke target if ≠ user_token; target_token = user_token; act_as_user_id = user_id
 * Logout: revoke both if distinct; destroy session
 *
 * default_realm_* is stored on the session row so session/get can drive SPA
 * redirects (/daemons|/runs → /o/{org}/realms/{slug}/...) without re-hitting Core.
 */

import type { AuthRepository } from '../repositories/auth_repository.js';
import type { SessionStore, SessionRecord } from '../repositories/session_store.js';
import type { EnvConfig } from '../config/env.js';
import type { LoginResponseDTO, MeResponseDTO, ScopeDTO } from '../types/dto.js';
import { to_user_dto } from '../types/mappers.js';
import { ApiError } from '../repositories/api_error.js';
import type { UserVO } from '../types/vo.js';

type OrgDefault = { id: string; slug: string; name: string; default_realm_slug: string };

function scopes_from_slugs(slugs: string[]): ScopeDTO[] {
    return slugs.map((slug) => ({
        id: '0',
        slug,
        display_name: slug,
        owner_id: '0',
        org_id: null,
        visibility: 'private' as const,
        scope_type: 'user' as const,
    }));
}

function parse_scope_slugs(scopes_json: string): string[] {
    const raw = JSON.parse(scopes_json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((s) => (typeof s === 'string' ? s : (s as { slug?: string }).slug ?? ''))
        .filter(Boolean);
}

function parse_orgs_json(orgs_json: string | null | undefined): OrgDefault[] {
    if (!orgs_json) return [];
    try {
        const raw = JSON.parse(orgs_json) as unknown;
        if (!Array.isArray(raw)) return [];
        return raw.filter(
            (o): o is OrgDefault =>
                !!o
                && typeof o === 'object'
                && typeof (o as OrgDefault).id === 'number'
                && typeof (o as OrgDefault).slug === 'string',
        );
    } catch {
        return [];
    }
}

function me_from_session(session: SessionRecord): MeResponseDTO {
    const scope_slugs = parse_scope_slugs(session.scopes_json);
    const org_slugs = JSON.parse(session.org_slugs_json) as string[];
    const acting_as =
        session.act_as_user_id !== session.user_id
            ? {
                actor_id: session.user_id,
                actor_username: session.actor_username,
            }
            : null;

    return {
        user: {
            id: session.act_as_user_id,
            username: session.username,
            display_name: session.username,
            email: session.email,
            role: session.role,
            suspended_at: null,
            created_at: new Date(session.created_at * 1000).toISOString(),
            preferences: {},
        },
        scopes: scopes_from_slugs(scope_slugs),
        org_slugs,
        default_realm_id: session.default_realm_id,
        default_realm_slug: session.default_realm_slug,
        default_realm_qualified: session.default_realm_qualified,
        orgs: parse_orgs_json(session.orgs_json),
        acting_as,
    };
}

export class SessionService {
    private _auth_repo: AuthRepository;
    private _session_store: SessionStore;
    private _config: EnvConfig;

    constructor(
        auth_repo: AuthRepository,
        session_store: SessionStore,
        config: EnvConfig,
    ) {
        this._auth_repo = auth_repo;
        this._session_store = session_store;
        this._config = config;
    }

    async create(
        username: string,
        password: string,
    ): Promise<{ session_id: string; target_token: string; dto: LoginResponseDTO }> {
        const auth = await this._auth_repo.authenticate_user(username, password);
        return this._persist_login_session(auth.user, auth.token, auth.scopes ?? [], {
            org_slugs: auth.org_slugs ?? [],
            default_realm_id: auth.default_realm_id ?? null,
            default_realm_slug: auth.default_realm_slug ?? null,
            default_realm_qualified: auth.default_realm_qualified ?? null,
            enroll_token: auth.enroll_token ?? null,
            orgs: auth.orgs,
        });
    }

    async create_from_signup(
        username: string,
        email: string,
        password: string,
    ): Promise<{ session_id: string; target_token: string; dto: LoginResponseDTO }> {
        const signup = await this._auth_repo.signup(username, email, password);
        let scopes: string[] = [];
        let org_slugs: string[] = [];
        try {
            const identity = await this._auth_repo.resolve_identity(signup.token);
            scopes = identity.scopes;
            org_slugs = identity.org_slugs;
        } catch {
            /* non-fatal */
        }
        return this._persist_login_session(signup.user, signup.token, scopes, {
            org_slugs,
            default_realm_id: signup.default_realm_id ?? null,
            default_realm_slug: signup.default_realm_slug ?? null,
            default_realm_qualified: signup.default_realm_qualified ?? null,
            enroll_token: signup.enroll_token ?? null,
            orgs: signup.orgs,
        });
    }

    async create_from_backend_token(
        backend_token: string,
    ): Promise<{ session_id: string; target_token: string; dto: LoginResponseDTO }> {
        const identity = await this._auth_repo.resolve_identity(backend_token);
        return this._persist_login_session(identity.user, backend_token, identity.scopes, {
            org_slugs: identity.org_slugs,
            default_realm_id: null,
            default_realm_slug: null,
            default_realm_qualified: null,
            enroll_token: null,
        });
    }

    async hydrate_bearer(token: string): Promise<SessionRecord | null> {
        if (token.startsWith('cliq_dt_')) return null;
        try {
            const identity = await this._auth_repo.resolve_identity(token);
            const now = Math.floor(Date.now() / 1000);
            const role = identity.user.role === 'admin' ? 'admin' : 'user';
            return {
                session_id: `bearer:pat:${identity.user.id}`,
                user_id: identity.user.id,
                act_as_user_id: identity.user.id,
                username: identity.user.username,
                email: identity.user.email,
                role,
                actor_role: role,
                actor_username: identity.user.username,
                user_token: token,
                target_token: token,
                scopes_json: JSON.stringify(identity.scopes),
                org_slugs_json: JSON.stringify(identity.org_slugs),
                default_realm_id: null,
                default_realm_slug: null,
                default_realm_qualified: null,
                actor_default_realm_id: null,
                actor_default_realm_slug: null,
                actor_default_realm_qualified: null,
                orgs_json: '[]',
                created_at: now,
                last_active: now,
                expires_at: now + this._config.session_ttl_seconds,
            };
        } catch {
            return null;
        }
    }

    async get(session: SessionRecord): Promise<MeResponseDTO> {
        return me_from_session(session);
    }

    async update(
        session: SessionRecord,
        act_as_user_id: string | null,
    ): Promise<MeResponseDTO> {
        if (act_as_user_id === null) {
            return this._exit_act_as(session);
        }
        return this._enter_act_as(session, act_as_user_id);
    }

    async delete(session: SessionRecord): Promise<void> {
        await this._revoke_pair(session.user_token, session.target_token);
        await this._session_store.destroy(session.session_id);
    }

    private async _enter_act_as(
        session: SessionRecord,
        target_user_id: string,
    ): Promise<MeResponseDTO> {
        if (session.actor_role !== 'admin') {
            throw new ApiError('forbidden', 'Site admin required', 403);
        }
        if (target_user_id === session.user_id) {
            throw new ApiError('invalid_params', 'Cannot act as yourself', 422);
        }

        const issued = await this._auth_repo.issue_session_token(
            target_user_id,
            session.user_token,
        );

        const previous_target = session.target_token;
        if (previous_target && previous_target !== session.user_token) {
            await this._safe_revoke(previous_target);
        }

        const target = await this._auth_repo.get_user_by_id(
            target_user_id,
            session.user_token,
        );
        let scopes: string[] = [];
        try {
            const scopes_res = await this._auth_repo.list_scopes(issued.token);
            scopes = scopes_res.scopes ?? [];
        } catch {
            scopes = [];
        }

        const role: 'user' | 'admin' = target.role === 'admin' ? 'admin' : 'user';
        const org_slugs = (target.orgs ?? []).map((o) => o.slug);
        const default_realm_id = issued.default_realm_id ?? null;
        const default_realm_slug = issued.default_realm_slug ?? null;
        const default_realm_qualified = issued.default_realm_qualified ?? null;
        const orgs = issued.orgs ?? [];

        await this._session_store.update_act_as(session.session_id, {
            act_as_user_id: target_user_id,
            username: target.username,
            email: target.email,
            role,
            target_token: issued.token,
            scopes_json: JSON.stringify(scopes),
            org_slugs_json: JSON.stringify(org_slugs),
            default_realm_id,
            default_realm_slug,
            default_realm_qualified,
            orgs_json: JSON.stringify(orgs),
        });

        return {
            user: {
                id: target.id,
                username: target.username,
                display_name: target.display_name || target.username,
                email: target.email,
                role,
                suspended_at: target.suspended_at,
                created_at: new Date(session.created_at * 1000).toISOString(),
                preferences: {},
            },
            scopes: scopes_from_slugs(scopes),
            org_slugs,
            default_realm_id,
            default_realm_slug,
            default_realm_qualified,
            orgs,
            acting_as: {
                actor_id: session.user_id,
                actor_username: session.actor_username,
            },
        };
    }

    private async _exit_act_as(session: SessionRecord): Promise<MeResponseDTO> {
        if (session.act_as_user_id === session.user_id) {
            return this.get(session);
        }

        if (session.target_token !== session.user_token) {
            await this._safe_revoke(session.target_token);
        }

        let scopes: string[] = [];
        let org_slugs: string[] = [];
        let email = session.email;
        let role: 'user' | 'admin' = session.actor_role;
        try {
            const identity = await this._auth_repo.resolve_identity(session.user_token);
            scopes = identity.scopes;
            org_slugs = identity.org_slugs;
            email = identity.user.email;
            role = identity.user.role === 'admin' ? 'admin' : 'user';
        } catch {
            scopes = parse_scope_slugs(session.scopes_json);
            org_slugs = JSON.parse(session.org_slugs_json) as string[];
        }

        // Restore actor's login-time default realm via actor_default_realm_* columns.
        // orgs_json: no separate actor snapshot — clear to [] (SPA redirects only need default_realm_*).
        await this._session_store.restore_actor(session.session_id, {
            username: session.actor_username,
            email,
            role,
            scopes_json: JSON.stringify(scopes),
            org_slugs_json: JSON.stringify(org_slugs),
            orgs_json: '[]',
        });

        return {
            user: {
                id: session.user_id,
                username: session.actor_username,
                display_name: session.actor_username,
                email,
                role,
                suspended_at: null,
                created_at: new Date(session.created_at * 1000).toISOString(),
                preferences: {},
            },
            scopes: scopes_from_slugs(scopes),
            org_slugs,
            default_realm_id: session.actor_default_realm_id,
            default_realm_slug: session.actor_default_realm_slug,
            default_realm_qualified: session.actor_default_realm_qualified,
            orgs: [],
            acting_as: null,
        };
    }

    private async _persist_login_session(
        user: UserVO,
        token: string,
        scopes: string[],
        extras: {
            org_slugs: string[];
            default_realm_id: string | null;
            default_realm_slug: string | null;
            default_realm_qualified?: string | null;
            enroll_token: string | null;
            orgs?: OrgDefault[];
        },
    ): Promise<{ session_id: string; target_token: string; dto: LoginResponseDTO }> {
        const now = Math.floor(Date.now() / 1000);
        const role: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user';
        const default_realm_id = extras.default_realm_id;
        const default_realm_slug = extras.default_realm_slug;
        const default_realm_qualified = extras.default_realm_qualified ?? null;
        const orgs = extras.orgs ?? [];

        const session_id = await this._session_store.create({
            user_id: user.id,
            act_as_user_id: user.id,
            username: user.username,
            email: user.email,
            role,
            actor_role: role,
            actor_username: user.username,
            user_token: token,
            target_token: token,
            scopes_json: JSON.stringify(scopes),
            org_slugs_json: JSON.stringify(extras.org_slugs),
            // Persist for SPA session/get redirects; actor_* snapshot for exit act-as.
            default_realm_id,
            default_realm_slug,
            default_realm_qualified,
            actor_default_realm_id: default_realm_id,
            actor_default_realm_slug: default_realm_slug,
            actor_default_realm_qualified: default_realm_qualified,
            orgs_json: JSON.stringify(orgs),
            created_at: now,
            last_active: now,
            expires_at: now + this._config.session_ttl_seconds,
        });

        const dto: LoginResponseDTO = {
            user: to_user_dto(user),
            scopes: scopes_from_slugs(scopes),
            org_slugs: extras.org_slugs,
            default_realm_id,
            default_realm_slug,
            default_realm_qualified,
            enroll_token: extras.enroll_token,
            orgs,
        };

        return { session_id, target_token: token, dto };
    }

    private async _revoke_pair(user_token: string, target_token: string): Promise<void> {
        await this._safe_revoke(user_token);
        if (target_token !== user_token) {
            await this._safe_revoke(target_token);
        }
    }

    private async _safe_revoke(token: string): Promise<void> {
        try {
            await this._auth_repo.revoke_session_token(token);
        } catch {
            /* best-effort */
        }
    }
}
