/**
 * Users — response shapes as Core sends them (`data` of `/v1/users/*`, `/internal/users/*`).
 * Only repositories return these; services map them to `schemas/users_types.ts` data.
 */

/** User account state (`users.status`; `deleted` when `deleted_at` is set). */
export type UserStatusVO = 'invited' | 'active' | 'suspended' | 'deleted';

/** A full user (includes Core-only `suspended_reason`). */
export interface UserVO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: 'user' | 'admin';
    suspended_at: string | null;
    suspended_reason: string;
    created_at: string;
    preferences: Record<string, unknown>;
}

/**
 * One row of `users/get`. `username` is null for someone invited by email who
 * has not accepted. Org member lists add `org_role`; the realm invite search
 * sends only id, username, display name and email.
 */
export interface UserListItemVO {
    id: string;
    username: string | null;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    created_at: string;
    status: UserStatusVO;
    deleted_at: string | null;
    org_role?: string;
}

/** `users/get` — one page of users. */
export interface UsersGetVO {
    users: UserListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

/** `users/get_by_id` — user with their state, live orgs and scope / team / token counts. */
export interface UserDetailVO {
    id: string;
    username: string | null;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    suspended_reason: string;
    created_at: string;
    status: UserStatusVO;
    deleted_at: string | null;
    scope_count: number;
    team_count: number;
    token_count: number;
    draft_count: number;
    orgs: { id: string; slug: string; display_name: string; role: string }[];
}

/** `users/new` — the invited user and the set-password link sent to them. */
export interface UsersNewVO {
    user: { id: string; username: string; email: string; status: UserStatusVO };
    setup: { expires_at: string; email_sent: boolean; setup_url: string | null };
}

/** `users/update`. */
export interface UsersUpdateVO {
    updated: boolean;
}

/** `users/suspend` / `unsuspend`. */
export interface UsersSuspendVO {
    suspended: boolean;
}

/** `users/delete`. */
export interface UsersDeleteVO {
    deleted: boolean;
}

/** `users/set_role`. */
export interface UsersSetRoleVO {
    role: string;
}

/** `users/reset_password` with `{ user_id }` (site admin). */
export interface UsersResetPasswordVO {
    reset_id: string;
    expires_at: string;
    email_sent: boolean;
    reset_url: string | null;
}

/** `users/reset_password` with `{ email }` (public). */
export interface UsersForgotPasswordVO {
    requested: true;
}

/** `users/update_role` — the member's new org role. */
export interface UsersUpdateRoleVO {
    user_id: string;
    org_id: string;
    role_id: string;
    role_slug: string;
    role: string;
}

/** `users/update_profile` — the updated user. */
export interface UsersUpdateProfileVO {
    user: {
        id: number;
        username: string;
        display_name: string;
        email: string;
        role: string;
        suspended_at: string | null;
        suspended_reason: string;
        created_at: string;
    };
}

/** `users/change_password` (signed in or with a reset token). */
export interface UsersChangePasswordVO {
    user: { id: string; username: string; status: UserStatusVO };
    sessions_revoked: number;
}
