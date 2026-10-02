/**
 * Session — session row / Core identity → BFF session data.
 * The session row stores scope slugs only, so scopes are rebuilt as minimal `ScopeData`.
 */

import type { SessionRecord } from '../repositories/session_store.js';
import type { ScopeData } from '../schemas/orgs_types.js';
import type {
    SessionData, LoginData, CliLoginData, OrgDefaultData,
} from '../schemas/session_types.js';
import { error_fields } from '../lib/best_effort.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('map.session');

/** Scope slugs → session scopes (ids are not kept in the session). */
export function scopes_from_slugs(slugs: string[]): ScopeData[] {
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

/** Scope slugs stored on the session row (strings, or `{ slug }` from older rows). */
export function parse_scope_slugs(scopes_json: string): string[] {
    const raw = JSON.parse(scopes_json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((s) => (typeof s === 'string' ? s : (s as { slug?: string }).slug ?? ''))
        .filter(Boolean);
}

/** Org slugs stored on the session row; [] when the column is not a string array. */
export function parse_org_slugs(org_slugs_json: string | null | undefined): string[] {
    try {
        const raw = JSON.parse(org_slugs_json ?? '[]') as unknown;
        return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
    } catch {
        // A malformed row must not lock the user out; the next sign-in rewrites it.
        return [];
    }
}

/** Orgs with default realms stored on the session row. */
export function parse_orgs_json(orgs_json: string | null | undefined): OrgDefaultData[] {
    if (!orgs_json) return [];
    try {
        const raw = JSON.parse(orgs_json) as unknown;
        if (!Array.isArray(raw)) return [];
        return raw.filter(
            (o): o is OrgDefaultData =>
                !!o && typeof o === 'object'
                && typeof (o as OrgDefaultData).id === 'string'
                && typeof (o as OrgDefaultData).slug === 'string',
        );
    } catch (err) {
        // A corrupt column must not break session reads: the SPA just shows no org defaults.
        log.warn('session_orgs_json_invalid', error_fields(err));
        return [];
    }
}

/** `session/get` — the acted-as user straight from the session row. */
export function to_session_data(session: SessionRecord): SessionData {
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
        scopes: scopes_from_slugs(parse_scope_slugs(session.scopes_json)),
        org_slugs: parse_org_slugs(session.org_slugs_json),
        default_realm_id: session.default_realm_id,
        default_realm_slug: session.default_realm_slug,
        default_realm_qualified: session.default_realm_qualified,
        orgs: parse_orgs_json(session.orgs_json),
        acting_as: session.act_as_user_id !== session.user_id
            ? { actor_id: session.user_id, actor_username: session.actor_username }
            : null,
    };
}

/** Sign-in answer for a CLI client: scope slugs plus the bearer token. */
export function to_cli_login_data(login: LoginData, token: string): CliLoginData {
    return { ...login, scopes: login.scopes.map((s) => s.slug), token };
}
