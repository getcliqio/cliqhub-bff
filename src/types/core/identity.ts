/**
 * Sign-in identity — response shapes of the Core calls behind sessions
 * (`/internal/auth/*`, `/v1/auth/validate_token`, user + scope lookups).
 */

import type { UserVO } from './users.js';

/** An org of the user with its default realm (null when the org has none). */
export interface OrgDefaultVO {
    id: string;
    slug: string;
    name: string;
    default_realm_slug: string | null;
}

/** Defaults returned with a fresh session token. */
interface DefaultRealmVO {
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    enroll_token?: string | null;
    orgs?: OrgDefaultVO[];
}

/** `POST /internal/auth/authenticate_user` */
export interface AuthenticateUserVO extends DefaultRealmVO {
    user: UserVO;
    token: string;
    scopes: string[];
    org_slugs: string[];
}

/** `POST /internal/auth/signup` */
export interface SignupVO extends DefaultRealmVO {
    token: string;
    user: UserVO;
}

/** `POST /internal/auth/issue_session_token` (act-as) */
export interface IssueSessionTokenVO extends DefaultRealmVO {
    user_id: string;
    token: string;
}

/** `POST /v1/auth/validate_token` */
export interface ValidateTokenVO {
    valid: boolean;
    user_id?: string;
}

/** `POST /v1/users/get_by_id` as read for a session. */
export interface IdentityUserVO {
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
}

/** `POST /v1/orgs/get_scopes` as read for a session (slugs only). */
export interface IdentityScopesVO {
    items: Array<{ slug: string }>;
}

/** A PAT resolved to its user (validate_token + user + scopes). Built by the identity repository. */
export interface ResolvedIdentityVO {
    user: UserVO;
    scopes: string[];
    org_slugs: string[];
}
