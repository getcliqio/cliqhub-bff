/**
 * Users — one Core call per action, mapped to BFF data.
 * Core enforces every rule (site admin, org permission); the BFF route table
 * only answers the cheap 401/403 first. A password set from an emailed link
 * is followed by a sign-in with the new password.
 */

import { ApiError } from '../errors/api_error.js';
import { get_logger } from '../lib/log.js';
import { core_query } from '../lib/core_list.js';
import type { UsersRepository } from '../repositories/users_repository.js';
import type { SessionRecord, SessionStore } from '../repositories/session_store.js';
import type { SessionService, CreatedSession } from './session_service.js';
import { best_effort } from '../lib/best_effort.js';
import type {
    UsersGetInput, UserIdInput, UsersNewInput, UsersUpdateInput, UsersSuspendInput,
    UsersSetRoleInput, UsersResetPasswordInput, UsersForgotPasswordInput, UsersUpdateRoleInput,
    UsersUpdateProfileInput, UsersChangePasswordInput, UsersResetWithTokenInput,
    UsersGetData, UserDetailData, UsersNewData, UsersUpdateData, UsersSuspendData,
    UsersDeleteData, UsersSetRoleData, UsersResetPasswordData, UsersForgotPasswordData, UsersUpdateRoleData,
    UsersUpdateProfileData, UsersChangePasswordData,
} from '../schemas/users_types.js';
import {
    to_users_get_data, to_user_detail_data, to_users_new_data, to_users_update_data,
    to_users_suspend_data, to_users_delete_data, to_users_set_role_data,
    to_users_reset_password_data, to_users_forgot_password_data, to_users_update_role_data,
    to_users_update_profile_data, to_users_change_password_data,
} from '../mappers/users_mapper.js';

const log = get_logger('svc.users');

/** A password set from an emailed link, and the session signed in with it (null when sign-in failed). */
export interface PasswordResetOutcome {
    data: UsersChangePasswordData;
    session: CreatedSession | null;
}

/** User reads, site-admin user actions and self-service profile / password changes. */
export class UsersService {
    /**
     * @param _sessions - Ends a user's BFF sessions after Core revoked their
     *   tokens (suspend, delete, link reset); this removes the rows so they stop showing up.
     * @param _session_service - Signs the person in after a link reset.
     */
    constructor(
        private readonly _repo: UsersRepository,
        private readonly _sessions: Pick<SessionStore, 'destroy_user'>,
        private readonly _session_service: Pick<SessionService, 'create'>,
    ) {}

    /** Ends every BFF session of `user_id` after Core revoked their tokens (logged on failure). */
    private async _end_sessions(user_id: string, reason: 'suspended' | 'deleted' | 'password_reset'): Promise<void> {
        // Best effort: Core has already applied the change and rejects the user's
        // token on every request, so a leftover row cannot act; the admin's
        // action must not report failure because of it.
        await best_effort(log, 'user_sessions_end_failed', this._sessions.destroy_user(user_id), undefined, { user_id, reason });
        log.info('user_sessions_ended', { user_id, reason });
    }

    /**
     * Lists users. The hub-wide list (no `org_id` / `realm_id`) is for site
     * admins only (`include_deleted` adds soft-deleted users); org members
     * list their org, realm members search to invite. Rows carry `status`
     * and `deleted_at`.
     *
     * @throws ApiError 403 when a non-admin asks for the hub-wide list.
     */
    async get(input: UsersGetInput, session: SessionRecord): Promise<UsersGetData> {
        if (!input.org_id && !input.realm_id && session.role !== 'admin') {
            throw ApiError.forbidden('Admin access required');
        }
        // `search` / `query` → Core's `query` (its `search` is deprecated).
        return to_users_get_data(await this._repo.get({
            ...(input.org_id ? { org_id: input.org_id } : {}),
            ...(input.realm_id ? { realm_id: input.realm_id } : {}),
            ...core_query(input.query, input.search),
            ...(input.limit != null ? { limit: input.limit } : {}),
            ...(input.offset != null ? { offset: input.offset } : {}),
            ...(input.include_deleted != null ? { include_deleted: input.include_deleted } : {}),
        }, session.target_token));
    }

    /** One user with org memberships (`users/get_by_id`). */
    async get_by_id(input: UserIdInput, token: string): Promise<UserDetailData> {
        return to_user_detail_data(await this._repo.get_by_id(input, token));
    }

    /**
     * Creates an invited user who gets a set-password email (site admin);
     * `reactivate` restores a soft-deleted user. Core's 409 `conflict` /
     * `deleted` propagate unchanged.
     */
    async new(input: UsersNewInput, token: string): Promise<UsersNewData> {
        const data = to_users_new_data(await this._repo.new(input, token));
        log.info('user_created', { user_id: data.user.id, status: data.user.status, email_sent: data.setup.email_sent, reactivate: input.reactivate === true });
        return data;
    }

    /** Changes another user's name / email (site admin). */
    async update(input: UsersUpdateInput, token: string): Promise<UsersUpdateData> {
        const data = to_users_update_data(await this._repo.update(input, token));
        log.info('user_updated', { user_id: input.user_id });
        return data;
    }

    /** Suspends a user (site admin); `reason` is shown to admins. Ends their BFF sessions. */
    async suspend(input: UsersSuspendInput, token: string): Promise<UsersSuspendData> {
        const data = to_users_suspend_data(await this._repo.suspend(input, token));
        log.info('user_suspended', { user_id: input.user_id });
        await this._end_sessions(input.user_id, 'suspended');
        return data;
    }

    /** Lifts a suspension. */
    async unsuspend(input: UserIdInput, token: string): Promise<UsersSuspendData> {
        const data = to_users_suspend_data(await this._repo.unsuspend(input, token));
        log.info('user_unsuspended', { user_id: input.user_id });
        return data;
    }

    /**
     * Soft-deletes a user (site admin) and ends their BFF sessions. Core keeps
     * the row (the username and email stay taken) or refuses with 409, e.g.
     * `owns_orgs` with the orgs in `details`, which propagates unchanged.
     */
    async delete(input: UserIdInput, token: string): Promise<UsersDeleteData> {
        const data = to_users_delete_data(await this._repo.delete(input, token));
        log.info('user_deleted', { user_id: input.user_id });
        await this._end_sessions(input.user_id, 'deleted');
        return data;
    }

    /** Sets the hub-wide role (`user` / `admin`). */
    async set_role(input: UsersSetRoleInput, token: string): Promise<UsersSetRoleData> {
        const data = to_users_set_role_data(await this._repo.set_role(input, token));
        log.info('user_role_set', { user_id: input.user_id, role: input.role });
        return data;
    }

    /**
     * Emails a user a password reset link (site admin); asking again resends
     * the same link. Core's 409 `deleted` / `not_active` propagate unchanged.
     */
    async reset_password(input: UsersResetPasswordInput, token: string): Promise<UsersResetPasswordData> {
        const data = to_users_reset_password_data(await this._repo.reset_password(input, token));
        log.info('user_password_reset_sent', { user_id: input.user_id, reset_id: data.reset_id, email_sent: data.email_sent });
        return data;
    }

    /**
     * "Forgot password" while signed out: Core emails a reset link when the
     * email has an account and always answers `{ requested: true }`; only its
     * 429 `rate_limited` (per email) propagates. The per-address limit is the
     * controller's.
     */
    async forgot_password(input: UsersForgotPasswordInput): Promise<UsersForgotPasswordData> {
        const data = to_users_forgot_password_data(await this._repo.forgot_password(input));
        // No email or user id here: the log must not reveal which addresses have accounts.
        log.info('password_reset_requested');
        return data;
    }

    /** Changes a member's role inside one org. */
    async update_role(input: UsersUpdateRoleInput, token: string): Promise<UsersUpdateRoleData> {
        const data = to_users_update_role_data(await this._repo.update_role(input, token));
        log.info('user_org_role_updated', { user_id: input.user_id, org_id: input.org_id, role_id: input.role_id });
        return data;
    }

    /** The caller's own display name / email / preferences. */
    async update_profile(input: UsersUpdateProfileInput, token: string): Promise<UsersUpdateProfileData> {
        const data = to_users_update_profile_data(await this._repo.update_profile(input, token));
        log.info('profile_updated', { user_id: data.user.id });
        return data;
    }

    /** The caller's own password; Core checks `current_password` and signs out their other sessions. */
    async change_password(input: UsersChangePasswordInput, token: string): Promise<UsersChangePasswordData> {
        const data = to_users_change_password_data(await this._repo.change_password(input, token));
        log.info('password_changed', { user_id: data.user.id, sessions_revoked: data.sessions_revoked });
        return data;
    }

    /**
     * Sets a password from an emailed set-password / reset link, then signs
     * the person in with it. Core has revoked every session of the user, so
     * their BFF sessions end first. Core's 410 `expired`, 409 `not_pending`
     * and 404 `not_found` propagate unchanged.
     */
    async reset_with_token(input: UsersResetWithTokenInput): Promise<PasswordResetOutcome> {
        const data = to_users_change_password_data(await this._repo.reset_with_token(input));
        log.info('password_set_from_link', { user_id: data.user.id, sessions_revoked: data.sessions_revoked });
        await this._end_sessions(data.user.id, 'password_reset');
        // The password is already set and the link used up: a failed sign-in
        // must not turn that into an error, so the person signs in by hand instead.
        const session = await best_effort(
            log, 'password_reset_sign_in_failed',
            this._session_service.create({ username: data.user.username, password: input.new_password }), null,
            { user_id: data.user.id },
        );
        return { data, session };
    }
}
