/**
 * Session — request schemas (Zod) and response data types.
 *
 * The BFF holds the browser session (cookie) and a CLI bearer session; both
 * carry two Core PATs: `user_token` (who signed in) and `target_token` (who
 * they act as — every Core call uses it). See services/session_service.ts.
 *
 * Routes (controllers/session_controller.ts):
 *   POST /v1/session/create  — sign in → session cookie (CLI: also the token)
 *   POST /v1/session/get     — who is signed in / acted as
 *   POST /v1/session/update  — site admins: act as another user, or stop
 *   POST /v1/session/delete  — sign out
 */

import { z } from 'zod';
import type { UserData } from './users_types.js';
import type { ScopeData } from './orgs_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/session/create */
export const SessionCreateInput = z.object({
    username: z.string().min(1, 'Username is required')
        .describe('Username (case-insensitive)'),
    password: z.string().min(1, 'Password is required')
        .describe('Password'),
});
export type SessionCreateInput = z.infer<typeof SessionCreateInput>;

/** POST /v1/session/update */
export const SessionUpdateInput = z.object({
    act_as_user_id: z.string().uuid().nullable()
        .describe('User to act as (site admins only); null to stop acting as someone'),
});
export type SessionUpdateInput = z.infer<typeof SessionUpdateInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** An org of the user with its default realm (CLI default resolution; null when the org has none). */
export interface OrgDefaultData {
    id: string;
    slug: string;
    name: string;
    default_realm_slug: string | null;
}

/** Set while a site admin acts as another user. */
export interface ActingAsData {
    actor_id: string;
    actor_username: string;
}

/** Defaults the SPA redirects to after sign-in. */
interface DefaultRealmFields {
    default_realm_id: string | null;
    default_realm_slug: string | null;
    /** `org.realm`, e.g. `elan.default`. */
    default_realm_qualified: string | null;
}

/** `session/get`, `session/update` — the (acted-as) user. */
export interface SessionData extends DefaultRealmFields {
    user: UserData;
    scopes: ScopeData[];
    org_slugs: string[];
    acting_as: ActingAsData | null;
    orgs: OrgDefaultData[];
}

/** `session/create`, `auth/signup`, `invitations/accept` (new user) — browser clients. */
export interface LoginData extends DefaultRealmFields {
    user: UserData;
    scopes: ScopeData[];
    org_slugs: string[];
    /** One-time daemon enroll token (first personal realm only). */
    enroll_token: string | null;
    orgs: OrgDefaultData[];
}

/** The same for CLI clients (`X-Client: cli`): scope slugs and the bearer token. */
export interface CliLoginData extends Omit<LoginData, 'scopes'> {
    scopes: string[];
    token: string;
}

/** `session/delete` */
export interface SessionDeleteData {
    deleted: boolean;
}
