/**
 * Orgs — Core calls. Reads use `/v1/orgs/*`; member / role writes and the
 * site-admin create / delete use `/internal/orgs/*`. Returns Core's `data` (VO).
 */

import type { CoreClient } from './core_client.js';
import type {
    OrgsGetVO, OrgsGetAllVO, OrgsNewVO, OrgsDeleteVO, OrgDetailVO, OrgsUpdateVO, OrgsLeaveVO,
    OrgsRemoveMemberVO, OrgsListRolesVO, OrgsRoleVO, OrgsDeleteRoleVO,
    OrgsNewScopeVO, OrgsUpdateScopeVO, OrgsDeleteScopeVO, OrgsAssignScopeMemberVO,
    OrgsUnassignScopeMemberVO, OrgsGetScopesVO,
} from '../types/core/orgs.js';
import type {
    OrgsGetInput, OrgsNewInput, OrgIdInput, OrgsUpdateInput,
    OrgsRemoveMemberInput, OrgRoleIdInput, OrgsCreateRoleInput, OrgsUpdateRoleInput,
    OrgsNewScopeInput, OrgsUpdateScopeInput, OrgScopeIdInput, OrgScopeMemberInput,
} from '../schemas/orgs_types.js';
import type { SortDir } from '../lib/core_list.js';

/** `orgs/get` body for the site-admin list, in Core's field names (OrgsGetInput). */
export interface OrgsGetAllFilter {
    query?: string;
    limit?: number;
    offset?: number;
    exclude_personal?: boolean;
    status?: string;
    include_deleted?: boolean;
    sort_by?: string;
    sort_dir?: SortDir;
}

/** `orgs/get_scopes` body, in Core's field names (OrgsGetScopesInput). */
export interface OrgsGetScopesFilter {
    user_id?: string;
    org_id?: string;
    query?: string;
    limit?: number;
    offset?: number;
}

/** Core org, member, role and publishing-scope calls. */
export class OrgsRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/orgs/get` — caller's orgs. */
    async get(input: OrgsGetInput, token: string): Promise<OrgsGetVO> {
        return this._client.post<OrgsGetVO>('/v1/orgs/get', input, token);
    }

    /** `POST /v1/orgs/get` as a site admin — every org, paged. */
    async get_all(filter: OrgsGetAllFilter, token: string): Promise<OrgsGetAllVO> {
        return this._client.post<OrgsGetAllVO>('/v1/orgs/get', filter, token);
    }

    /** `POST /internal/orgs/new` */
    async new(input: OrgsNewInput, token: string): Promise<OrgsNewVO> {
        return this._client.post<OrgsNewVO>('/internal/orgs/new', input, token);
    }

    /** `POST /internal/orgs/delete` */
    async delete(input: OrgIdInput, token: string): Promise<OrgsDeleteVO> {
        return this._client.post<OrgsDeleteVO>('/internal/orgs/delete', input, token);
    }

    /** `POST /v1/orgs/get_by_id` */
    async get_by_id(input: OrgIdInput, token: string): Promise<OrgDetailVO> {
        return this._client.post<OrgDetailVO>('/v1/orgs/get_by_id', input, token);
    }

    /** `POST /internal/orgs/update` */
    async update(input: OrgsUpdateInput, token: string): Promise<OrgsUpdateVO> {
        return this._client.post<OrgsUpdateVO>('/internal/orgs/update', input, token);
    }

    /** `POST /internal/orgs/leave` */
    async leave(input: OrgIdInput, token: string): Promise<OrgsLeaveVO> {
        return this._client.post<OrgsLeaveVO>('/internal/orgs/leave', input, token);
    }

    /** `POST /internal/orgs/remove_member` */
    async remove_member(input: OrgsRemoveMemberInput, token: string): Promise<OrgsRemoveMemberVO> {
        return this._client.post<OrgsRemoveMemberVO>('/internal/orgs/remove_member', input, token);
    }

    /** `POST /v1/orgs/list_roles` */
    async list_roles(input: OrgIdInput, token: string): Promise<OrgsListRolesVO> {
        return this._client.post<OrgsListRolesVO>('/v1/orgs/list_roles', input, token);
    }

    /** `POST /internal/orgs/get_role` */
    async get_role(input: OrgRoleIdInput, token: string): Promise<OrgsRoleVO> {
        return this._client.post<OrgsRoleVO>('/internal/orgs/get_role', input, token);
    }

    /** `POST /internal/orgs/create_role` */
    async create_role(input: OrgsCreateRoleInput, token: string): Promise<OrgsRoleVO> {
        return this._client.post<OrgsRoleVO>('/internal/orgs/create_role', input, token);
    }

    /** `POST /internal/orgs/update_role` */
    async update_role(input: OrgsUpdateRoleInput, token: string): Promise<OrgsRoleVO> {
        return this._client.post<OrgsRoleVO>('/internal/orgs/update_role', input, token);
    }

    /** `POST /internal/orgs/delete_role` */
    async delete_role(input: OrgRoleIdInput, token: string): Promise<OrgsDeleteRoleVO> {
        return this._client.post<OrgsDeleteRoleVO>('/internal/orgs/delete_role', input, token);
    }

    /** `POST /v1/orgs/new_scope` */
    async new_scope(input: OrgsNewScopeInput, token: string): Promise<OrgsNewScopeVO> {
        return this._client.post<OrgsNewScopeVO>('/v1/orgs/new_scope', input, token);
    }

    /** `POST /v1/orgs/update_scope` */
    async update_scope(input: OrgsUpdateScopeInput, token: string): Promise<OrgsUpdateScopeVO> {
        return this._client.post<OrgsUpdateScopeVO>('/v1/orgs/update_scope', input, token);
    }

    /** `POST /v1/orgs/delete_scope` */
    async delete_scope(input: OrgScopeIdInput, token: string): Promise<OrgsDeleteScopeVO> {
        return this._client.post<OrgsDeleteScopeVO>('/v1/orgs/delete_scope', input, token);
    }

    /** `POST /v1/orgs/assign_scope_member` */
    async assign_scope_member(input: OrgScopeMemberInput, token: string): Promise<OrgsAssignScopeMemberVO> {
        return this._client.post<OrgsAssignScopeMemberVO>('/v1/orgs/assign_scope_member', input, token);
    }

    /** `POST /v1/orgs/unassign_scope_member` */
    async unassign_scope_member(input: OrgScopeMemberInput, token: string): Promise<OrgsUnassignScopeMemberVO> {
        return this._client.post<OrgsUnassignScopeMemberVO>('/v1/orgs/unassign_scope_member', input, token);
    }

    /** `POST /v1/orgs/get_scopes` */
    async get_scopes(filter: OrgsGetScopesFilter, token: string): Promise<OrgsGetScopesVO> {
        return this._client.post<OrgsGetScopesVO>('/v1/orgs/get_scopes', filter, token);
    }
}
