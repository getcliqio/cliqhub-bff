import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type {
    OrgListResponseDTO,
    OrgDetailDTO,
    OrgUpdateResponseDTO,
    OrgLeaveResponseDTO,
    OrgAddMemberResponseDTO,
    OrgRemoveMemberResponseDTO,
    OrgRolesListResponseDTO,
    OrgRoleResponseDTO,
    OrgDeleteRoleResponseDTO,
    UsersUpdateRoleResponseDTO,
    OrgCreateScopeResponseDTO,
    OrgDeleteScopeResponseDTO,
    OrgAssignScopeMemberResponseDTO,
    OrgUnassignScopeMemberResponseDTO,
} from '../types/dto.js';
import {
    to_org_list_response_dto,
    to_org_detail_dto,
    to_org_update_response_dto,
    to_org_leave_response_dto,
    to_org_add_member_response_dto,
    to_org_remove_member_response_dto,
    to_org_roles_list_response_dto,
    to_org_role_response_dto,
    to_org_delete_role_response_dto,
    to_users_update_role_response_dto,
    to_org_create_scope_response_dto,
    to_org_delete_scope_response_dto,
    to_org_assign_scope_member_response_dto,
    to_org_unassign_scope_member_response_dto,
} from '../types/mappers.js';

export class OrgsService {
    private _repo: OrgsRepository;

    constructor(repo: OrgsRepository) {
        this._repo = repo;
    }

    async get(token: string, params: { mine?: boolean } = {}): Promise<OrgListResponseDTO> {
        const vo = await this._repo.get(token, params);
        return to_org_list_response_dto(vo);
    }

    async get_by_id(params: { org_id: string }, token: string): Promise<OrgDetailDTO> {
        const vo = await this._repo.get_by_id(params, token);
        return to_org_detail_dto(vo);
    }

    async update(
        params: { org_id: string; display_name: string },
        token: string,
    ): Promise<OrgUpdateResponseDTO> {
        const vo = await this._repo.update(params, token);
        return to_org_update_response_dto(vo);
    }

    async leave(params: { org_id: string }, token: string): Promise<OrgLeaveResponseDTO> {
        const vo = await this._repo.leave(params, token);
        return to_org_leave_response_dto(vo);
    }

    async add_member(
        params: { org_id: string; username?: string; email?: string; user_id?: string },
        token: string,
    ): Promise<OrgAddMemberResponseDTO> {
        const vo = await this._repo.add_member(params, token);
        return to_org_add_member_response_dto(vo);
    }


    async remove_member(
        params: { org_id: string; user_id: string },
        token: string,
    ): Promise<OrgRemoveMemberResponseDTO> {
        const vo = await this._repo.remove_member(params, token);
        return to_org_remove_member_response_dto(vo);
    }

    async list_roles(
        params: { org_id: string },
        token: string,
    ): Promise<OrgRolesListResponseDTO> {
        const vo = await this._repo.list_roles(params, token);
        return to_org_roles_list_response_dto(vo);
    }

    async get_role(
        params: { org_id: string; role_id: string },
        token: string,
    ): Promise<OrgRoleResponseDTO> {
        const vo = await this._repo.get_role(params, token);
        return to_org_role_response_dto(vo);
    }

    async create_role(
        params: { org_id: string; slug: string; name: string; permissions: string[] },
        token: string,
    ): Promise<OrgRoleResponseDTO> {
        const vo = await this._repo.create_role(params, token);
        return to_org_role_response_dto(vo);
    }

    async update_role(
        params: { org_id: string; role_id: string; name?: string; permissions?: string[] },
        token: string,
    ): Promise<OrgRoleResponseDTO> {
        const vo = await this._repo.update_role(params, token);
        return to_org_role_response_dto(vo);
    }

    async delete_role(
        params: { org_id: string; role_id: string },
        token: string,
    ): Promise<OrgDeleteRoleResponseDTO> {
        const vo = await this._repo.delete_role(params, token);
        return to_org_delete_role_response_dto(vo);
    }

    async update_user_role(
        params: { user_id: string; org_id: string; role_id: string },
        token: string,
    ): Promise<UsersUpdateRoleResponseDTO> {
        const vo = await this._repo.update_user_role(params, token);
        return to_users_update_role_response_dto(vo);
    }

    async new_scope(
        params: { org_id: string; slug: string; display_name?: string; visibility?: 'public' | 'private' },
        token: string,
    ): Promise<OrgCreateScopeResponseDTO> {
        const vo = await this._repo.new_scope(params, token);
        return to_org_create_scope_response_dto(vo);
    }

    async delete_scope(
        params: { org_id: string; scope_id: string },
        token: string,
    ): Promise<OrgDeleteScopeResponseDTO> {
        const vo = await this._repo.delete_scope(params, token);
        return to_org_delete_scope_response_dto(vo);
    }

    async assign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgAssignScopeMemberResponseDTO> {
        const vo = await this._repo.assign_scope_member(params, token);
        return to_org_assign_scope_member_response_dto(vo);
    }

    async unassign_scope_member(
        params: { org_id: string; scope_id: string; user_id: string },
        token: string,
    ): Promise<OrgUnassignScopeMemberResponseDTO> {
        const vo = await this._repo.unassign_scope_member(params, token);
        return to_org_unassign_scope_member_response_dto(vo);
    }
}
