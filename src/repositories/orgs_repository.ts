import type { ApiClient } from './api_client.js';
import type {
    OrgListResponseVO,
    OrgDetailVO,
    OrgUpdateResponseVO,
    OrgLeaveResponseVO,
    OrgAddMemberResponseVO,
    OrgRemoveMemberResponseVO,
    OrgRolesListResponseVO,
    OrgRoleResponseVO,
    OrgDeleteRoleResponseVO,
    UsersUpdateRoleResponseVO,
    OrgCreateScopeResponseVO,
    OrgDeleteScopeResponseVO,
    OrgAssignScopeMemberResponseVO,
    OrgUnassignScopeMemberResponseVO,
} from '../types/vo.js';

/** Reads (get/get_by_id/list_roles) use Core `/v1/orgs/*`; writes stay `/internal/orgs/*`. */
export class OrgsRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async get(token: string, params: { mine?: boolean } = {}): Promise<OrgListResponseVO> {
        return this._client.post<OrgListResponseVO>(
            '/v1/orgs/get', params, token,
        );
    }

    async get_by_id(params: { org_id: string }, token: string): Promise<OrgDetailVO> {
        return this._client.post<OrgDetailVO>(
            '/v1/orgs/get_by_id', params, token,
        );
    }

    async update(
        params: { org_id: string; display_name: string },
        token: string,
    ): Promise<OrgUpdateResponseVO> {
        return this._client.post<OrgUpdateResponseVO>(
            '/internal/orgs/update', params, token,
        );
    }

    async leave(params: { org_id: string }, token: string): Promise<OrgLeaveResponseVO> {
        return this._client.post<OrgLeaveResponseVO>(
            '/internal/orgs/leave', params, token,
        );
    }

    async add_member(
        params: { org_id: string; username?: string; email?: string; user_id?: string },
        token: string,
    ): Promise<OrgAddMemberResponseVO> {
        return this._client.post<OrgAddMemberResponseVO>(
            '/internal/orgs/add_member', params, token,
        );
    }

    async remove_member(
        params: { org_id: string; user_id: string },
        token: string,
    ): Promise<OrgRemoveMemberResponseVO> {
        return this._client.post<OrgRemoveMemberResponseVO>(
            '/internal/orgs/remove_member', params, token,
        );
    }

    async list_roles(
        params: { org_id: string },
        token: string,
    ): Promise<OrgRolesListResponseVO> {
        return this._client.post<OrgRolesListResponseVO>(
            '/v1/orgs/list_roles', params, token,
        );
    }

    async get_role(
        params: { org_id: string; role_id: string },
        token: string,
    ): Promise<OrgRoleResponseVO> {
        return this._client.post<OrgRoleResponseVO>(
            '/internal/orgs/get_role', params, token,
        );
    }

    async create_role(
        params: { org_id: string; slug: string; name: string; permissions: string[] },
        token: string,
    ): Promise<OrgRoleResponseVO> {
        return this._client.post<OrgRoleResponseVO>(
            '/internal/orgs/create_role', params, token,
        );
    }

    async update_role(
        params: { org_id: string; role_id: string; name?: string; permissions?: string[] },
        token: string,
    ): Promise<OrgRoleResponseVO> {
        return this._client.post<OrgRoleResponseVO>(
            '/internal/orgs/update_role', params, token,
        );
    }

    async delete_role(
        params: { org_id: string; role_id: string },
        token: string,
    ): Promise<OrgDeleteRoleResponseVO> {
        return this._client.post<OrgDeleteRoleResponseVO>(
            '/internal/orgs/delete_role', params, token,
        );
    }

    async update_user_role(
        params: { user_id: string; org_id: string; role_id: string },
        token: string,
    ): Promise<UsersUpdateRoleResponseVO> {
        return this._client.post<UsersUpdateRoleResponseVO>(
            '/internal/users/update_role', params, token,
        );
    }

    async new_scope(
        params: { org_id: string; slug: string; display_name?: string; visibility?: 'public' | 'private' },
        token: string,
    ): Promise<OrgCreateScopeResponseVO> {
        return this._client.post<OrgCreateScopeResponseVO>(
            '/v1/scopes/new',
            {
                slug: params.slug,
                display_name: params.display_name,
                visibility: params.visibility,
                scope_type: 'org',
                org_id: params.org_id,
            },
            token,
        );
    }

    async delete_scope(
        params: { org_id: string; scope_id: string },
        token: string,
    ): Promise<OrgDeleteScopeResponseVO> {
        return this._client.post<OrgDeleteScopeResponseVO>(
            '/v1/scopes/delete',
            { scope_id: params.scope_id },
            token,
        );
    }

    async assign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgAssignScopeMemberResponseVO> {
        return this._client.post<OrgAssignScopeMemberResponseVO>(
            '/v1/scopes/add_user',
            { scope_id: params.scope_id, user_id: params.user_id },
            token,
        );
    }

    async unassign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgUnassignScopeMemberResponseVO> {
        return this._client.post<OrgUnassignScopeMemberResponseVO>(
            '/v1/scopes/remove_user',
            { scope_id: params.scope_id, user_id: params.user_id },
            token,
        );
    }
}
