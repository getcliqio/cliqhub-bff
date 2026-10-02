/**
 * Users — request schemas (Zod, SoT for inbound bodies) and response data types.
 *
 * Naming (same as Core): PascalCase Zod value + type with the same name
 * (`UsersGetInput` schema → `type UsersGetInput`); responses are `*Data`.
 * Every input field has `.describe(…)`.
 *
 * Routes (controllers/users_controller.ts):
 *   POST /v1/users/get              — list users (global: site admin; org_id / realm_id: members)
 *   POST /v1/users/get_by_id        — one user's detail
 *   POST /v1/users/new              — create an invited user who gets a set-password email (site admin)
 *   POST /v1/users/update           — update a user's name / email
 *   POST /v1/users/suspend          — suspend a user (site admin)
 *   POST /v1/users/unsuspend        — lift a suspension (site admin)
 *   POST /v1/users/delete           — soft-delete a user (site admin)
 *   POST /v1/users/set_role         — set the site role (site admin)
 *   POST /v1/users/reset_password   — send a reset email: `{ user_id }` (site admin) or `{ email }` (public)
 *   POST /v1/users/update_role      — set a member's org role
 *   POST /v1/users/update_profile   — caller's own profile
 *   POST /v1/users/change_password  — `{ current_password, … }` (signed in) or `{ reset_token, … }` (public)
 */

import { z } from 'zod';
import type { LoginData, CliLoginData } from './session_types.js';

// ─── Shared field fragments ─────────────────────────────────────────────────

const UserIdField = z.string().uuid().describe('User UUID');

const LimitField = z.number().int().min(1).max(100).optional()
    .describe('Page size (max 100)');

const OffsetField = z.number().int().min(0).optional()
    .describe('Zero-based page offset');

const SiteRoleField = z.enum(['user', 'admin'], { required_error: 'role is required' })
    .describe('Site role');

const UsernamePattern = /^[a-z][a-z0-9-]*$/;

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/users/get — without org_id / realm_id this is the hub-wide list (site admin). */
export const UsersGetInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('List members of this org (org members may call)'),
    realm_id: z.string().min(1).optional()
        .describe('Search hub users to invite to this realm (excludes current members)'),
    search: z.string().optional()
        .describe('Match on username or email (sent to Core as `query`)'),
    query: z.string().optional()
        .describe('Core\'s name for `search`; either may be sent'),
    limit: LimitField,
    offset: OffsetField,
    include_deleted: z.boolean().optional()
        .describe('Hub-wide list (site admin): also list soft-deleted users'),
});
export type UsersGetInput = z.infer<typeof UsersGetInput>;

/** POST /v1/users/get_by_id, /unsuspend, /delete — one user by id. */
export const UserIdInput = z.object({
    user_id: UserIdField,
});
export type UserIdInput = z.infer<typeof UserIdInput>;

/** POST /v1/users/new — no password: the user sets it from the emailed link. */
export const UsersNewInput = z.object({
    username: z.string().min(1, 'username is required')
        .regex(UsernamePattern, 'Username must start with a letter and contain only lowercase letters, numbers, and hyphens')
        .describe('Login name: lowercase letters, digits, hyphens; starts with a letter'),
    email: z.string().email('Invalid email')
        .describe('Email address'),
    display_name: z.string().optional()
        .describe('Display name (defaults to username)'),
    role: z.enum(['user', 'admin']).optional()
        .describe('Site role (default user)'),
    reactivate: z.boolean().optional()
        .describe('Restore the soft-deleted user that holds this username or email'),
});
export type UsersNewInput = z.infer<typeof UsersNewInput>;

/** POST /v1/users/update */
export const UsersUpdateInput = z.object({
    user_id: UserIdField,
    display_name: z.string().min(1, 'Display name cannot be empty').optional()
        .describe('New display name'),
    email: z.string().email('Invalid email').optional()
        .describe('New email address'),
});
export type UsersUpdateInput = z.infer<typeof UsersUpdateInput>;

/** POST /v1/users/suspend */
export const UsersSuspendInput = z.object({
    user_id: UserIdField,
    reason: z.string().optional()
        .describe('Why the user is suspended (shown to admins)'),
});
export type UsersSuspendInput = z.infer<typeof UsersSuspendInput>;

/** POST /v1/users/set_role */
export const UsersSetRoleInput = z.object({
    user_id: UserIdField,
    role: SiteRoleField,
});
export type UsersSetRoleInput = z.infer<typeof UsersSetRoleInput>;

/** POST /v1/users/reset_password as a site admin — email the user a reset link. */
export const UsersResetPasswordInput = z.object({
    user_id: UserIdField,
}).strict();
export type UsersResetPasswordInput = z.infer<typeof UsersResetPasswordInput>;

/** POST /v1/users/reset_password signed out ("Forgot password") — selects the public rule (routes/route_auth.ts). */
export const UsersForgotPasswordInput = z.object({
    email: z.string().email('Invalid email')
        .describe('Email of the account to reset'),
}).strict();
export type UsersForgotPasswordInput = z.infer<typeof UsersForgotPasswordInput>;

/** POST /v1/users/update_role — a member's role inside one org. */
export const UsersUpdateRoleInput = z.object({
    user_id: UserIdField,
    org_id: z.string().uuid().describe('Org UUID'),
    role_id: z.string().uuid().describe('Org role UUID'),
});
export type UsersUpdateRoleInput = z.infer<typeof UsersUpdateRoleInput>;

/** POST /v1/users/update_profile — at least one field. */
export const UsersUpdateProfileInput = z.object({
    display_name: z.string().min(1, 'Display name cannot be empty')
        .max(100, 'Display name must be 100 characters or less').optional()
        .describe('New display name (max 100)'),
    email: z.string().email('Invalid email format').optional()
        .describe('New email address'),
    preferences: z.record(z.unknown()).optional()
        .describe('UI preferences (merged by Core)'),
}).refine(
    (data) => data.display_name !== undefined || data.email !== undefined || data.preferences !== undefined,
    { message: 'At least one field (display_name, email, or preferences) is required' },
);
export type UsersUpdateProfileInput = z.infer<typeof UsersUpdateProfileInput>;

const NewPasswordField = z.string().min(8, 'New password must be at least 8 characters')
    .describe('New password (min 8 characters)');

/** POST /v1/users/change_password signed in — the caller's own password. */
export const UsersChangePasswordInput = z.object({
    current_password: z.string().min(1, 'Current password is required')
        .describe('Current password'),
    new_password: NewPasswordField,
}).strict();
export type UsersChangePasswordInput = z.infer<typeof UsersChangePasswordInput>;

/** POST /v1/users/change_password from an emailed set-password / reset link — selects the public rule (routes/route_auth.ts). */
export const UsersResetWithTokenInput = z.object({
    reset_token: z.string().min(1, 'reset_token is required')
        .describe('The secret from the set-password or reset link'),
    new_password: NewPasswordField,
}).strict();
export type UsersResetWithTokenInput = z.infer<typeof UsersResetWithTokenInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** Lifecycle state of a user account. */
export type UserStatus = 'invited' | 'active' | 'suspended' | 'deleted';

/** The signed-in user as the SPA / CLI sees it (session, signup, profile). */
export interface UserData {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: 'user' | 'admin';
    /** ISO time; null when active. */
    suspended_at: string | null;
    created_at: string;
    preferences: Record<string, unknown>;
}

/**
 * One row of `users/get`. Org member lists add `org_role`; the realm invite
 * search carries only id, username, display name and email.
 */
export interface UserListItemData {
    id: string;
    /** Null for someone invited by email who has not accepted yet. */
    username: string | null;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    created_at: string;
    status: UserStatus;
    deleted_at: string | null;
    /** The member's org role (lists with `org_id`). */
    org_role?: string;
}

/** `users/get` */
export interface UsersGetData {
    users: UserListItemData[];
    total: number;
    limit: number;
    offset: number;
}

/** `users/get_by_id` — the user, their state and what they own. */
export interface UserDetailData {
    id: string;
    /** Null for someone invited by email who has not accepted yet. */
    username: string | null;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    suspended_reason: string;
    created_at: string;
    status: UserStatus;
    deleted_at: string | null;
    scope_count: number;
    team_count: number;
    token_count: number;
    draft_count: number;
    /** Live orgs the user is an active member of. */
    orgs: { id: string; slug: string; display_name: string; role: string }[];
}

/** `users/new` — the invited user and their set-password link. */
export interface UsersNewData {
    user: { id: string; username: string; email: string; status: UserStatus };
    setup: {
        expires_at: string;
        email_sent: boolean;
        /** The set-password link, only when the email could not be sent. */
        setup_url: string | null;
    };
}

/** `users/update` */
export interface UsersUpdateData {
    updated: boolean;
}

/** `users/suspend`, `users/unsuspend` — the state after the call. */
export interface UsersSuspendData {
    suspended: boolean;
}

/** `users/delete` (soft delete) */
export interface UsersDeleteData {
    deleted: boolean;
}

/** `users/set_role` */
export interface UsersSetRoleData {
    role: string;
}

/** `users/reset_password` as a site admin — the reset link that was sent. */
export interface UsersResetPasswordData {
    reset_id: string;
    expires_at: string;
    email_sent: boolean;
    /** The reset link, only when the email could not be sent. */
    reset_url: string | null;
}

/** `users/reset_password` signed out — the same answer whether or not the email has an account. */
export interface UsersForgotPasswordData {
    requested: true;
}

/** `users/update_role` */
export interface UsersUpdateRoleData {
    user_id: string;
    org_id: string;
    role_id: string;
    role_slug: string;
    role: string;
}

/** `users/update_profile` — suspension fields are never sent back. */
export interface UsersUpdateProfileData {
    user: {
        id: number;
        username: string;
        display_name: string;
        email: string;
        role: string;
        created_at: string;
    };
}

/** `users/change_password` (both bodies) */
export interface UsersChangePasswordData {
    user: { id: string; username: string; status: UserStatus };
    /** Other sessions Core signed out. */
    sessions_revoked: number;
    /** After a link reset: the new session's sign-in data (CLI: with the bearer token); absent when sign-in did not follow. */
    session?: LoginData | CliLoginData;
}
