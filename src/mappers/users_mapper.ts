/**
 * Users — Core VO → BFF data. Explicit even when 1:1, so the contract
 * boundary stays visible (and Core-only fields like suspension notes stay out).
 */

import type {
    UserVO, UsersGetVO, UserDetailVO, UsersNewVO, UsersUpdateVO, UsersSuspendVO,
    UsersDeleteVO, UsersSetRoleVO, UsersResetPasswordVO, UsersForgotPasswordVO, UsersUpdateRoleVO,
    UsersUpdateProfileVO, UsersChangePasswordVO,
} from '../types/core/users.js';
import type {
    UserData, UsersGetData, UserDetailData, UsersNewData, UsersUpdateData, UsersSuspendData,
    UsersDeleteData, UsersSetRoleData, UsersResetPasswordData, UsersForgotPasswordData, UsersUpdateRoleData,
    UsersUpdateProfileData, UsersChangePasswordData,
} from '../schemas/users_types.js';
import type { PasswordResetOutcome } from '../services/users_service.js';
import { to_cli_login_data } from './session_mapper.js';

/** Core user → session user (drops `suspended_reason`). */
export function to_user_data(user: UserVO): UserData {
    return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        suspended_at: user.suspended_at,
        created_at: user.created_at,
        preferences: user.preferences ?? {},
    };
}

/** `users/get` → one page of users. */
export function to_users_get_data(vo: UsersGetVO): UsersGetData {
    return {
        users: vo.users.map((u) => ({ ...u })),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
    };
}

/** `users/get_by_id` → user with their orgs. */
export function to_user_detail_data(vo: UserDetailVO): UserDetailData {
    return { ...vo, orgs: vo.orgs.map((o) => ({ ...o })) };
}

/** `users/new` → the invited user and their set-password link (`setup_url` only when no email went out). */
export function to_users_new_data(vo: UsersNewVO): UsersNewData {
    return {
        user: { id: vo.user.id, username: vo.user.username, email: vo.user.email, status: vo.user.status },
        setup: { expires_at: vo.setup.expires_at, email_sent: vo.setup.email_sent, setup_url: vo.setup.setup_url ?? null },
    };
}

/** `users/update` → `{ updated }`. */
export function to_users_update_data(vo: UsersUpdateVO): UsersUpdateData {
    return { updated: vo.updated };
}

/** `users/suspend` / `unsuspend` → `{ suspended }`. */
export function to_users_suspend_data(vo: UsersSuspendVO): UsersSuspendData {
    return { suspended: vo.suspended };
}

/** `users/delete` → `{ deleted }`. */
export function to_users_delete_data(vo: UsersDeleteVO): UsersDeleteData {
    return { deleted: vo.deleted };
}

/** `users/set_role` → the new site role. */
export function to_users_set_role_data(vo: UsersSetRoleVO): UsersSetRoleData {
    return { role: vo.role };
}

/** Site-admin `users/reset_password` → the reset link sent (`reset_url` only when no email went out). */
export function to_users_reset_password_data(vo: UsersResetPasswordVO): UsersResetPasswordData {
    return { reset_id: vo.reset_id, expires_at: vo.expires_at, email_sent: vo.email_sent, reset_url: vo.reset_url ?? null };
}

/** Public `users/reset_password` → `{ requested: true }`, the same for every email. */
export function to_users_forgot_password_data(vo: UsersForgotPasswordVO): UsersForgotPasswordData {
    return { requested: vo.requested };
}

/** `users/update_role` → the member's new org role. */
export function to_users_update_role_data(vo: UsersUpdateRoleVO): UsersUpdateRoleData {
    return {
        user_id: vo.user_id,
        org_id: vo.org_id,
        role_id: vo.role_id,
        role_slug: vo.role_slug,
        role: vo.role,
    };
}

/** Profile update → the user without suspension fields. */
export function to_users_update_profile_data(vo: UsersUpdateProfileVO): UsersUpdateProfileData {
    const { suspended_at: _s, suspended_reason: _r, ...user } = vo.user;
    return { user };
}

/** `users/change_password` → the user and how many other sessions Core signed out. */
export function to_users_change_password_data(vo: UsersChangePasswordVO): UsersChangePasswordData {
    return {
        user: { id: vo.user.id, username: vo.user.username, status: vo.user.status },
        sessions_revoked: vo.sessions_revoked,
    };
}

/** A link reset → the change result plus the new session's sign-in data when sign-in followed (CLI: with the bearer token). */
export function to_password_reset_data(outcome: PasswordResetOutcome, as_cli: boolean): UsersChangePasswordData {
    const { data, session } = outcome;
    if (!session) return { ...data };
    return { ...data, session: as_cli ? to_cli_login_data(session.login, session.target_token) : session.login };
}
