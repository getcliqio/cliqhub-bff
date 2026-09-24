import type { ApiClient } from './api_client.js';
import type { AuditLogResponseVO, AdminUserListResponseVO, AdminUserDetailVO, AdminCreateUserResponseVO, AdminUpdateUserResponseVO, AdminSuspendUserResponseVO, AdminDeleteUserResponseVO, AdminSetUserRoleResponseVO, AdminResetUserPasswordResponseVO, AdminTeamListResponseVO, AdminSetTeamListedResponseVO, AdminScopeListResponseVO, AdminCreateScopeResponseVO, AdminUpdateScopeResponseVO, AdminDeleteScopeResponseVO, AdminOrgListResponseVO, AdminCreateOrgResponseVO, AdminDeleteOrgResponseVO } from '../types/vo.js';

export class AdminRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async audit(
        params: { action?: string; target_type?: string; admin_id?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<AuditLogResponseVO> {
        return this._client.post<AuditLogResponseVO>('/internal/reports/audit', params, token);
    }

    async get_users(
        params: { org_id?: string; search?: string; query?: string; limit?: number; offset?: number; realm_id?: string },
        token: string,
    ): Promise<AdminUserListResponseVO> {
        return this._client.post<AdminUserListResponseVO>('/v1/users/get', params, token);
    }

    async get_user(params: { user_id: string }, token: string): Promise<AdminUserDetailVO> {
        return this._client.post<AdminUserDetailVO>('/v1/users/get_by_id', params, token);
    }

    async new_user(
        params: { username: string; email: string; password: string; display_name?: string; role?: string },
        token: string,
    ): Promise<AdminCreateUserResponseVO> {
        return this._client.post<AdminCreateUserResponseVO>('/internal/users/new', params, token);
    }

    async update_user(
        params: { user_id: string; display_name?: string; email?: string },
        token: string,
    ): Promise<AdminUpdateUserResponseVO> {
        return this._client.post<AdminUpdateUserResponseVO>('/v1/users/update', params, token);
    }

    async suspend_user(
        params: { user_id: string; reason?: string },
        token: string,
    ): Promise<AdminSuspendUserResponseVO> {
        return this._client.post<AdminSuspendUserResponseVO>('/internal/users/suspend', params, token);
    }

    async unsuspend_user(params: { user_id: string }, token: string): Promise<AdminSuspendUserResponseVO> {
        return this._client.post<AdminSuspendUserResponseVO>('/internal/users/unsuspend', params, token);
    }

    async delete_user(params: { user_id: string }, token: string): Promise<AdminDeleteUserResponseVO> {
        return this._client.post<AdminDeleteUserResponseVO>('/internal/users/delete', params, token);
    }

    async set_user_role(params: { user_id: string; role: string }, token: string): Promise<AdminSetUserRoleResponseVO> {
        return this._client.post<AdminSetUserRoleResponseVO>('/internal/users/set_role', params, token);
    }

    async reset_user_password(params: { user_id: string; new_password: string }, token: string): Promise<AdminResetUserPasswordResponseVO> {
        return this._client.post<AdminResetUserPasswordResponseVO>('/internal/users/reset_password', params, token);
    }

    async get_teams(
        params: { search?: string; scope?: string; listed?: boolean; limit?: number; offset?: number },
        token: string,
    ): Promise<AdminTeamListResponseVO> {
        return this._client.post<AdminTeamListResponseVO>('/v1/teams/get', params, token);
    }

    async set_team_listed(
        params: { team_id: string; listed: boolean },
        token: string,
    ): Promise<AdminSetTeamListedResponseVO> {
        return this._client.post<AdminSetTeamListedResponseVO>(
            params.listed ? '/v1/teams/publish' : '/v1/teams/unpublish',
            {
                team_id: params.team_id,
                ...(params.listed ? { visibility: 'public' as const } : {}),
            },
            token,
        );
    }

    async get_scopes(
        params: { mine?: boolean; search?: string; query?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<AdminScopeListResponseVO> {
        return this._client.post<AdminScopeListResponseVO>('/v1/scopes/get', params, token);
    }

    async new_scope(
        params: {
            slug: string;
            display_name?: string;
            owner_username?: string;
            visibility?: string;
            scope_type?: string;
            org_slug?: string;
            org_id?: string;
        },
        token: string,
    ): Promise<AdminCreateScopeResponseVO> {
        return this._client.post<AdminCreateScopeResponseVO>('/v1/scopes/new', params, token);
    }

    async update_scope(
        params: { scope_id: string; visibility?: string; display_name?: string; owner_id?: string },
        token: string,
    ): Promise<AdminUpdateScopeResponseVO> {
        return this._client.post<AdminUpdateScopeResponseVO>('/v1/scopes/update', params, token);
    }

    async delete_scope(
        params: { scope_id: string },
        token: string,
    ): Promise<AdminDeleteScopeResponseVO> {
        return this._client.post<AdminDeleteScopeResponseVO>('/v1/scopes/delete', params, token);
    }

    async add_scope_user(
        params: { scope_id: string; user_id: string },
        token: string,
    ): Promise<{ assigned: boolean }> {
        return this._client.post<{ assigned: boolean }>('/v1/scopes/add_user', params, token);
    }

    async remove_scope_user(
        params: { scope_id: string; user_id: string },
        token: string,
    ): Promise<{ removed: boolean }> {
        return this._client.post<{ removed: boolean }>('/v1/scopes/remove_user', params, token);
    }

    async get_orgs(
        params: { search?: string; query?: string; limit?: number; offset?: number; exclude_personal?: boolean },
        token: string,
    ): Promise<AdminOrgListResponseVO> {
        return this._client.post<AdminOrgListResponseVO>('/v1/orgs/get', params, token);
    }

    async new_org(
        params: { slug: string; display_name?: string; admin_username: string; admin_email?: string; admin_password?: string; admin_display_name?: string },
        token: string,
    ): Promise<AdminCreateOrgResponseVO> {
        return this._client.post<AdminCreateOrgResponseVO>('/internal/orgs/new', params, token);
    }

    async delete_org(
        params: { org_id: string },
        token: string,
    ): Promise<AdminDeleteOrgResponseVO> {
        return this._client.post<AdminDeleteOrgResponseVO>('/internal/orgs/delete', params, token);
    }
}
