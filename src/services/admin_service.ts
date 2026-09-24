import type { AdminRepository } from '../repositories/admin_repository.js';
import type { AuditLogResponseDTO, AdminUserListResponseDTO, AdminUserDetailDTO, AdminCreateUserResponseDTO, AdminUpdateUserResponseDTO, AdminSuspendUserResponseDTO, AdminDeleteUserResponseDTO, AdminSetUserRoleResponseDTO, AdminResetUserPasswordResponseDTO, AdminTeamListResponseDTO, AdminSetTeamListedResponseDTO, AdminScopeListResponseDTO, AdminCreateScopeResponseDTO, AdminUpdateScopeResponseDTO, AdminDeleteScopeResponseDTO, AdminOrgListResponseDTO, AdminCreateOrgResponseDTO, AdminDeleteOrgResponseDTO } from '../types/dto.js';
import { to_audit_log_response_dto, to_admin_user_list_response_dto, to_admin_user_detail_dto, to_admin_create_user_response_dto, to_admin_update_user_response_dto, to_admin_suspend_user_response_dto, to_admin_delete_user_response_dto, to_admin_set_user_role_response_dto, to_admin_reset_user_password_response_dto, to_admin_team_list_response_dto, to_admin_set_team_listed_response_dto, to_admin_scope_list_response_dto, to_admin_create_scope_response_dto, to_admin_update_scope_response_dto, to_admin_delete_scope_response_dto, to_admin_org_list_response_dto, to_admin_create_org_response_dto, to_admin_delete_org_response_dto } from '../types/mappers.js';

export class AdminService {
    private _repo: AdminRepository;

    constructor(repo: AdminRepository) {
        this._repo = repo;
    }

    async audit(
        params: { action?: string; target_type?: string; admin_id?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<AuditLogResponseDTO> {
        const vo = await this._repo.audit(params, token);
        return to_audit_log_response_dto(vo);
    }

    async get_users(
        params: { org_id?: string; search?: string; query?: string; limit?: number; offset?: number; realm_id?: string },
        token: string,
    ): Promise<AdminUserListResponseDTO> {
        const vo = await this._repo.get_users(params, token);
        return to_admin_user_list_response_dto(vo);
    }

    async get_user(params: { user_id: string }, token: string): Promise<AdminUserDetailDTO> {
        const vo = await this._repo.get_user(params, token);
        return to_admin_user_detail_dto(vo);
    }

    async new_user(
        params: { username: string; email: string; password: string; display_name?: string; role?: string },
        token: string,
    ): Promise<AdminCreateUserResponseDTO> {
        const vo = await this._repo.new_user(params, token);
        return to_admin_create_user_response_dto(vo);
    }

    async update_user(
        params: { user_id: string; display_name?: string; email?: string },
        token: string,
    ): Promise<AdminUpdateUserResponseDTO> {
        const vo = await this._repo.update_user(params, token);
        return to_admin_update_user_response_dto(vo);
    }

    async suspend_user(
        params: { user_id: string; reason?: string },
        token: string,
    ): Promise<AdminSuspendUserResponseDTO> {
        const vo = await this._repo.suspend_user(params, token);
        return to_admin_suspend_user_response_dto(vo);
    }

    async unsuspend_user(params: { user_id: string }, token: string): Promise<AdminSuspendUserResponseDTO> {
        const vo = await this._repo.unsuspend_user(params, token);
        return to_admin_suspend_user_response_dto(vo);
    }

    async delete_user(params: { user_id: string }, token: string): Promise<AdminDeleteUserResponseDTO> {
        const vo = await this._repo.delete_user(params, token);
        return to_admin_delete_user_response_dto(vo);
    }

    async set_user_role(params: { user_id: string; role: string }, token: string): Promise<AdminSetUserRoleResponseDTO> {
        const vo = await this._repo.set_user_role(params, token);
        return to_admin_set_user_role_response_dto(vo);
    }

    async reset_user_password(params: { user_id: string; new_password: string }, token: string): Promise<AdminResetUserPasswordResponseDTO> {
        const vo = await this._repo.reset_user_password(params, token);
        return to_admin_reset_user_password_response_dto(vo);
    }

    async get_teams(
        params: { search?: string; scope?: string; listed?: boolean; limit?: number; offset?: number },
        token: string,
    ): Promise<AdminTeamListResponseDTO> {
        const vo = await this._repo.get_teams(params, token);
        return to_admin_team_list_response_dto(vo);
    }

    async set_team_listed(
        params: { team_id: string; listed: boolean },
        token: string,
    ): Promise<AdminSetTeamListedResponseDTO> {
        const vo = await this._repo.set_team_listed(params, token);
        return to_admin_set_team_listed_response_dto(vo);
    }

    async get_scopes(
        params: { mine?: boolean; search?: string; query?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<AdminScopeListResponseDTO> {
        const vo = await this._repo.get_scopes(params, token);
        return to_admin_scope_list_response_dto(vo);
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
    ): Promise<AdminCreateScopeResponseDTO> {
        const vo = await this._repo.new_scope(params, token);
        return to_admin_create_scope_response_dto(vo);
    }

    async update_scope(
        params: { scope_id: string; visibility?: string; display_name?: string; owner_id?: string },
        token: string,
    ): Promise<AdminUpdateScopeResponseDTO> {
        const vo = await this._repo.update_scope(params, token);
        return to_admin_update_scope_response_dto(vo);
    }

    async delete_scope(
        params: { scope_id: string },
        token: string,
    ): Promise<AdminDeleteScopeResponseDTO> {
        const vo = await this._repo.delete_scope(params, token);
        return to_admin_delete_scope_response_dto(vo);
    }

    async add_scope_user(
        params: { scope_id: string; user_id: string },
        token: string,
    ): Promise<{ assigned: boolean }> {
        return this._repo.add_scope_user(params, token);
    }

    async remove_scope_user(
        params: { scope_id: string; user_id: string },
        token: string,
    ): Promise<{ removed: boolean }> {
        return this._repo.remove_scope_user(params, token);
    }

    async get_orgs(
        params: { search?: string; query?: string; limit?: number; offset?: number; exclude_personal?: boolean },
        token: string,
    ): Promise<AdminOrgListResponseDTO> {
        const vo = await this._repo.get_orgs(params, token);
        return to_admin_org_list_response_dto(vo);
    }

    async new_org(
        params: { slug: string; display_name?: string; admin_username: string; admin_email?: string; admin_password?: string; admin_display_name?: string },
        token: string,
    ): Promise<AdminCreateOrgResponseDTO> {
        const vo = await this._repo.new_org(params, token);
        return to_admin_create_org_response_dto(vo);
    }

    async delete_org(
        params: { org_id: string },
        token: string,
    ): Promise<AdminDeleteOrgResponseDTO> {
        const vo = await this._repo.delete_org(params, token);
        return to_admin_delete_org_response_dto(vo);
    }
}
