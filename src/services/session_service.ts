/**
 * Sessions — dual-token model.
 *
 * Every session stores BOTH:
 *   user_token     — session PAT of user_id (set at sign-in; never replaced on act-as)
 *   target_token   — session PAT of act_as_user_id (ALWAYS the bearer sent to Core)
 *
 * Sign-in:  mint once → user_token = target_token; user_id = act_as_user_id
 * Act-as:   Core issue_session_token → change ONLY target_token + act_as_user_id
 *           (revoke the previous target if ≠ user_token). user_token is immutable.
 * Stop:     revoke target if ≠ user_token; target_token = user_token; act_as_user_id = user_id
 * Sign-out: revoke both if distinct; destroy the session
 *
 * default_realm_* is stored on the session row so session/get can drive SPA
 * redirects (/daemons|/runs → /o/{org}/realms/{slug}/...) without re-hitting Core.
 */

import type { IdentityRepository } from '../repositories/identity_repository.js';
import type { SessionStore, SessionRecord } from '../repositories/session_store.js';
import type { EnvConfig } from '../config/env.js';
import type { UserVO } from '../types/core/users.js';
import type { OrgDefaultVO } from '../types/core/identity.js';
import type {
    SessionCreateInput, SessionUpdateInput, SessionData, LoginData, SessionDeleteData,
} from '../schemas/session_types.js';
import type { AuthSignupInput } from '../schemas/auth_types.js';
import { to_user_data } from '../mappers/users_mapper.js';
import { to_session_data, scopes_from_slugs, parse_scope_slugs, parse_org_slugs } from '../mappers/session_mapper.js';
import { ApiError } from '../errors/api_error.js';
import { get_logger } from '../lib/log.js';
import { best_effort, error_fields } from '../lib/best_effort.js';

const log = get_logger('svc.session');

/** How a session was created — logged with `session_created`. */
type SessionOrigin = 'password' | 'signup' | 'backend_token';

/** A session just created: its id (the cookie), the bearer for Core, and the sign-in data. */
export interface CreatedSession {
    session_id: string;
    target_token: string;
    login: LoginData;
}

/**
 * Creates, reads, switches (act-as) and ends BFF sessions. Never logs a token
 * or the session id (the cookie value).
 */
export class SessionService {
    constructor(
        private readonly _identity_repo: IdentityRepository,
        private readonly _session_store: SessionStore,
        private readonly _config: EnvConfig,
    ) {}

    /** Password sign-in → new session. Core's auth errors (401 etc.) propagate. */
    async create(input: SessionCreateInput): Promise<CreatedSession> {
        const auth = await this._identity_repo.authenticate_user(input.username.trim().toLowerCase(), input.password);
        return this._persist_login_session('password', auth.user, auth.token, auth.scopes ?? [], {
            org_slugs: auth.org_slugs ?? [],
            default_realm_id: auth.default_realm_id ?? null,
            default_realm_slug: auth.default_realm_slug ?? null,
            default_realm_qualified: auth.default_realm_qualified ?? null,
            enroll_token: auth.enroll_token ?? null,
            orgs: auth.orgs,
        });
    }

    /** New account → signed-in session. */
    async create_from_signup(input: AuthSignupInput): Promise<CreatedSession> {
        const signup = await this._identity_repo.signup(
            input.username.trim().toLowerCase(),
            input.email.trim().toLowerCase(),
            input.password,
        );
        // The account exists already; a failed identity read only leaves scopes /
        // org slugs empty until the next sign-in.
        const identity = await best_effort(
            log, 'signup_identity_failed',
            this._identity_repo.resolve_identity(signup.token), null,
            { user_id: signup.user.id },
        );
        const scopes = identity?.scopes ?? [];
        const org_slugs = identity?.org_slugs ?? [];
        return this._persist_login_session('signup', signup.user, signup.token, scopes, {
            org_slugs,
            default_realm_id: signup.default_realm_id ?? null,
            default_realm_slug: signup.default_realm_slug ?? null,
            default_realm_qualified: signup.default_realm_qualified ?? null,
            enroll_token: signup.enroll_token ?? null,
            orgs: signup.orgs,
        });
    }

    /** A session for a PAT Core just issued (e.g. accepting an invite as a new user). */
    async create_from_backend_token(backend_token: string): Promise<CreatedSession> {
        const identity = await this._identity_repo.resolve_identity(backend_token);
        return this._persist_login_session('backend_token', identity.user, backend_token, identity.scopes, {
            org_slugs: identity.org_slugs,
            default_realm_id: null,
            default_realm_slug: null,
            default_realm_qualified: null,
            enroll_token: null,
        });
    }

    /**
     * A request-scoped session for an `Authorization: Bearer` user PAT, or null
     * (daemon tokens `cliq_dt_…` and invalid tokens). Nothing is stored.
     */
    async hydrate_bearer(token: string): Promise<SessionRecord | null> {
        if (token.startsWith('cliq_dt_')) return null;
        try {
            const identity = await this._identity_repo.resolve_identity(token);
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
        } catch (err) {
            // Null means "not signed in" (the route answers 401). A bad or expired
            // PAT is routine, so debug; anything else (Core down) is a warn.
            const status = (err as { status?: unknown }).status;
            if (status === 401 || status === 403) {
                log.debug('bearer_hydrate_rejected', error_fields(err));
            } else {
                log.warn('bearer_hydrate_failed', error_fields(err));
            }
            return null;
        }
    }

    /**
     * The (acted-as) user of a session. Profile fields (display name, email,
     * preferences) are read live from Core so edits show without a new sign-in;
     * when Core is unreachable the session row's snapshot is returned.
     */
    async get(session: SessionRecord): Promise<SessionData> {
        const data = to_session_data(session);
        const live = await best_effort(log, 'session_profile_read_failed',
            this._identity_repo.get_user_by_id(session.act_as_user_id, session.target_token, true), null);
        if (!live) return data;
        return {
            ...data,
            user: {
                ...data.user,
                display_name: live.display_name || live.username || data.user.display_name,
                email: live.email ?? data.user.email,
                preferences: live.preferences ?? data.user.preferences,
            },
        };
    }

    /**
     * Starts (`act_as_user_id`) or stops (`null`) acting as another user.
     *
     * @throws ApiError 403 when the actor is not a site admin; 400 when acting as oneself.
     */
    async update(session: SessionRecord, input: SessionUpdateInput): Promise<SessionData> {
        if (input.act_as_user_id === null) {
            return this._exit_act_as(session);
        }
        return this._enter_act_as(session, input.act_as_user_id);
    }

    /** Revokes the session's PATs and destroys it (nothing to do without a session). */
    async delete(session: SessionRecord | undefined): Promise<SessionDeleteData> {
        if (session) {
            await this._revoke_pair(session.user_token, session.target_token);
            await this._session_store.destroy(session.session_id);
            log.info('session_ended', { user_id: session.user_id });
        }
        return { deleted: true };
    }

    /** Swaps the bearer to a fresh PAT for `target_user_id`; `user_token` is kept. */
    private async _enter_act_as(
        session: SessionRecord,
        target_user_id: string,
    ): Promise<SessionData> {
        if (session.actor_role !== 'admin') {
            throw ApiError.forbidden('Site admin required');
        }
        if (target_user_id === session.user_id) {
            throw ApiError.invalid_params('Cannot act as yourself');
        }

        const issued = await this._identity_repo.issue_session_token(
            target_user_id,
            session.user_token,
        );

        const previous_target = session.target_token;
        if (previous_target && previous_target !== session.user_token) {
            await this._safe_revoke(previous_target);
        }

        const target = await this._identity_repo.get_user_by_id(
            target_user_id,
            session.user_token,
        );
        const scopes = await best_effort(
            log, 'act_as_scopes_failed',
            this._identity_repo.list_scope_slugs(target_user_id, issued.token), [] as string[],
            { actor_id: session.user_id, target_user_id },
        );

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
        log.info('act_as_started', { actor_id: session.user_id, target_user_id });

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

    /** Back to the actor: revokes the act-as PAT and restores the actor's identity. */
    private async _exit_act_as(session: SessionRecord): Promise<SessionData> {
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
            const identity = await this._identity_repo.resolve_identity(session.user_token);
            scopes = identity.scopes;
            org_slugs = identity.org_slugs;
            email = identity.user.email;
            role = identity.user.role === 'admin' ? 'admin' : 'user';
        } catch (err) {
            // Fall back to what the session row holds so the admin can always get
            // back to their own identity, even when Core can't be asked.
            log.debug('exit_act_as_identity_fallback', { actor_id: session.user_id, ...error_fields(err) });
            scopes = parse_scope_slugs(session.scopes_json);
            org_slugs = parse_org_slugs(session.org_slugs_json);
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
        log.info('act_as_stopped', { actor_id: session.user_id, target_user_id: session.act_as_user_id });

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

    /** Stores a fresh session (actor = target) and builds the sign-in reply. */
    private async _persist_login_session(
        how: SessionOrigin,
        user: UserVO,
        token: string,
        scopes: string[],
        extras: {
            org_slugs: string[];
            default_realm_id: string | null;
            default_realm_slug: string | null;
            default_realm_qualified?: string | null;
            enroll_token: string | null;
            orgs?: OrgDefaultVO[];
        },
    ): Promise<CreatedSession> {
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

        log.info('session_created', { user_id: user.id, how });

        const login: LoginData = {
            user: to_user_data(user),
            scopes: scopes_from_slugs(scopes),
            org_slugs: extras.org_slugs,
            default_realm_id,
            default_realm_slug,
            default_realm_qualified,
            enroll_token: extras.enroll_token,
            orgs,
        };

        return { session_id, target_token: token, login };
    }

    /** Revokes the user PAT and, when different, the act-as PAT. */
    private async _revoke_pair(user_token: string, target_token: string): Promise<void> {
        await this._safe_revoke(user_token);
        if (target_token !== user_token) {
            await this._safe_revoke(target_token);
        }
    }

    /**
     * Revokes a PAT; a failure is logged (never the token) and ignored so
     * sign-out / act-as still complete.
     */
    private async _safe_revoke(token: string): Promise<void> {
        await best_effort(log, 'session_token_revoke_failed', this._identity_repo.revoke_session_token(token), undefined);
    }
}
