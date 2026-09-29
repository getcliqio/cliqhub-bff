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

export interface GetScopesResponseVO {
    items: Array<{
        id: string;
        slug: string;
        display_name: string | null;
        visibility: 'public' | 'private';
        scope_type: 'user' | 'org';
        owner_id: string;
        org_id: string | null;
        member_count?: number;
        team_count?: number;
        created_at: string;
    }>;
    total: number;
    offset: number;
    limit: number;
}

export interface UpdateScopeResponseVO {
    updated: boolean;
}

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
            '/v1/orgs/new_scope',
            { org_id: params.org_id, slug: params.slug, display_name: params.display_name, visibility: params.visibility },
            token,
        );
    }

    async update_scope(
        params: { org_id: string; scope_id: string; display_name?: string; visibility?: 'public' | 'private' },
        token: string,
    ): Promise<UpdateScopeResponseVO> {
        return this._client.post<UpdateScopeResponseVO>(
            '/v1/orgs/update_scope',
            params,
            token,
        );
    }

    async delete_scope(
        params: { org_id: string; scope_id: string },
        token: string,
    ): Promise<OrgDeleteScopeResponseVO> {
        return this._client.post<OrgDeleteScopeResponseVO>(
            '/v1/orgs/delete_scope',
            params,
            token,
        );
    }

    async assign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgAssignScopeMemberResponseVO> {
        return this._client.post<OrgAssignScopeMemberResponseVO>(
            '/v1/orgs/assign_scope_member',
            params,
            token,
        );
    }

    async unassign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgUnassignScopeMemberResponseVO> {
        return this._client.post<OrgUnassignScopeMemberResponseVO>(
            '/v1/orgs/unassign_scope_member',
            params,
            token,
        );
    }

    async get_scopes(
        params: { user_id: string; org_id?: string; search?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<GetScopesResponseVO> {
        return this._client.post<GetScopesResponseVO>(
            '/v1/orgs/get_scopes',
            params,
            token,
        );
    }
}
