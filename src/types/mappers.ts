/**
 * Mappers: convert backend VOs -> frontend DTOs.
 * Even for 1:1 mappings, explicit mappers ensure the contract
 * boundary is always visible and maintainable.
 */

import type { UserVO, ScopeVO, MeResponseVO, TokenVO, TeamListItemVO, TeamDetailVO, TeamVersionVO, TeamListResponseVO, TeamSearchResponseVO, TeamDownloadResponseVO, PublishResultVO, DeleteTeamResultVO, RenameTeamResultVO, ToggleListedResultVO, MyTeamsListResponseVO, MyTeamsAllResponseVO, ScopeGroupVO, LatestVersionResponseVO, BatchLatestResponseVO, DraftListItemVO, DraftDetailVO, DraftListResponseVO, DraftSaveResponseVO, DraftDeleteResponseVO, BuilderGenerateResponseVO, BuilderGenerateStatusVO, BuilderImproveRoleResponseVO, BuilderValidateResponseVO, BuilderChatResponseVO, OrgListItemVO, OrgListResponseVO, OrgMemberVO, OrgScopeVO, OrgDetailVO, OrgUpdateResponseVO, OrgLeaveResponseVO, OrgAddMemberResponseVO, OrgRemoveMemberResponseVO, OrgRoleVO, OrgRolesListResponseVO, OrgRoleResponseVO, OrgDeleteRoleResponseVO, UsersUpdateRoleResponseVO, OrgCreateScopeResponseVO, OrgDeleteScopeResponseVO, OrgAssignScopeMemberResponseVO, OrgUnassignScopeMemberResponseVO, UpdateProfileResponseVO, ChangePasswordResponseVO, AuditLogEntryVO, AuditLogResponseVO, AdminUserListResponseVO, AdminUserDetailVO, AdminCreateUserResponseVO, AdminUpdateUserResponseVO, AdminSuspendUserResponseVO, AdminDeleteUserResponseVO, AdminSetUserRoleResponseVO, AdminResetUserPasswordResponseVO, AdminTeamListResponseVO, AdminSetTeamListedResponseVO, AdminScopeListResponseVO, AdminCreateScopeResponseVO, AdminUpdateScopeResponseVO, AdminDeleteScopeResponseVO, AdminOrgListResponseVO, AdminCreateOrgResponseVO, AdminDeleteOrgResponseVO } from './vo.js';
import type { UserDTO, ScopeDTO, MeResponseDTO, TokenDTO, TeamListItemDTO, TeamDetailDTO, TeamVersionDTO, TeamListResponseDTO, TeamSearchResponseDTO, TeamDownloadResponseDTO, PublishResultDTO, DeleteTeamResultDTO, RenameTeamResultDTO, ToggleListedResultDTO, MyTeamsListResponseDTO, MyTeamsAllResponseDTO, ScopeGroupDTO, LatestVersionResponseDTO, BatchLatestResponseDTO, DraftListItemDTO, DraftDetailDTO, DraftListResponseDTO, DraftSaveResponseDTO, DraftDeleteResponseDTO, BuilderGenerateResponseDTO, BuilderGenerateStatusDTO, BuilderImproveRoleResponseDTO, BuilderValidateResponseDTO, BuilderChatResponseDTO, OrgListItemDTO, OrgListResponseDTO, OrgMemberDTO, OrgScopeDTO, OrgDetailDTO, OrgUpdateResponseDTO, OrgLeaveResponseDTO, OrgAddMemberResponseDTO, OrgRemoveMemberResponseDTO, OrgRoleDTO, OrgRolesListResponseDTO, OrgRoleResponseDTO, OrgDeleteRoleResponseDTO, UsersUpdateRoleResponseDTO, OrgCreateScopeResponseDTO, OrgDeleteScopeResponseDTO, OrgAssignScopeMemberResponseDTO, OrgUnassignScopeMemberResponseDTO, UpdateProfileResponseDTO, ChangePasswordResponseDTO, AuditLogEntryDTO, AuditLogResponseDTO, AdminUserListResponseDTO, AdminUserDetailDTO, AdminCreateUserResponseDTO, AdminUpdateUserResponseDTO, AdminSuspendUserResponseDTO, AdminDeleteUserResponseDTO, AdminSetUserRoleResponseDTO, AdminResetUserPasswordResponseDTO, AdminTeamListResponseDTO, AdminSetTeamListedResponseDTO, AdminScopeListResponseDTO, AdminCreateScopeResponseDTO, AdminUpdateScopeResponseDTO, AdminDeleteScopeResponseDTO, AdminOrgListResponseDTO, AdminCreateOrgResponseDTO, AdminDeleteOrgResponseDTO } from './dto.js';

export function to_user_dto(user: UserVO): UserDTO {
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

export function to_scope_dto(scope: ScopeVO): ScopeDTO {
    return {
        id: scope.id,
        slug: scope.slug,
        display_name: scope.display_name,
        owner_id: scope.owner_id,
        org_id: scope.org_id,
        visibility: scope.visibility,
        scope_type: scope.scope_type,
    };
}

export function to_me_response_dto(data: MeResponseVO): MeResponseDTO {
    return {
        user: to_user_dto(data.user),
        scopes: data.scopes.map(to_scope_dto),
        org_slugs: data.org_slugs ?? [],
        default_realm_id: data.default_realm_id ?? null,
        default_realm_slug: data.default_realm_slug ?? null,
        default_realm_qualified: data.default_realm_qualified ?? null,
        acting_as: data.impersonation
            ? { actor_id: data.impersonation.actor_id, actor_username: data.impersonation.actor_username }
            : data.impersonation ?? null,
        orgs: data.orgs,
    };
}

export function to_token_dto(token: TokenVO): TokenDTO {
    return {
        id: token.id,
        name: token.name,
        permissions: token.permissions ?? {},
        created_at: token.created_at,
        last_used_at: token.last_used_at,
    };
}

export function to_team_list_item_dto(vo: TeamListItemVO): TeamListItemDTO {
    return {
        name: vo.name,
        scope: vo.scope,
        description: vo.description,
        author: vo.author,
        latest_version: vo.latest_version,
        install_count: vo.install_count,
        tags: vo.tags,
    };
}

export function to_team_version_dto(vo: TeamVersionVO): TeamVersionDTO {
    return {
        version: vo.version,
        changelog: vo.changelog,
        published_at: vo.published_at,
    };
}

export function to_team_detail_dto(vo: TeamDetailVO): TeamDetailDTO {
    return {
        ...to_team_list_item_dto(vo),
        license: vo.license,
        visibility: vo.visibility,
        created_at: vo.created_at,
        updated_at: vo.updated_at,
        versions: vo.versions.map(to_team_version_dto),
        roles: vo.roles,
        workflow: vo.workflow,
        agents: vo.agents,
        readme: vo.readme,
        cliq_version: vo.cliq_version,
        tools: vo.tools,
        inputs: vo.inputs,
        use_when: vo.use_when,
        not_for: vo.not_for,
        raw_manifest: vo.raw_manifest ?? null,
    };
}

export function to_team_list_response_dto(vo: TeamListResponseVO): TeamListResponseDTO {
    return {
        teams: vo.teams.map(to_team_list_item_dto),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
    };
}

export function to_team_search_response_dto(vo: TeamSearchResponseVO): TeamSearchResponseDTO {
    return {
        teams: vo.teams.map(to_team_list_item_dto),
        total: vo.total,
    };
}

export function to_team_download_response_dto(vo: TeamDownloadResponseVO): TeamDownloadResponseDTO {
    return {
        filename: vo.filename,
        data_base64: vo.data_base64,
    };
}

export function to_publish_result_dto(vo: PublishResultVO): PublishResultDTO {
    return {
        name: vo.name,
        scope: vo.scope,
        version: vo.version,
        status: vo.status,
        listed: vo.listed,
    };
}

export function to_delete_team_result_dto(vo: DeleteTeamResultVO): DeleteTeamResultDTO {
    return { deleted: vo.deleted };
}

export function to_rename_team_result_dto(vo: RenameTeamResultVO): RenameTeamResultDTO {
    return { name: vo.name, scope: vo.scope };
}

export function to_toggle_listed_result_dto(vo: ToggleListedResultVO): ToggleListedResultDTO {
    return { listed: vo.listed };
}

export function to_my_teams_list_response_dto(vo: MyTeamsListResponseVO): MyTeamsListResponseDTO {
    return { teams: vo.teams.map(to_team_list_item_dto) };
}

export function to_scope_group_dto(vo: ScopeGroupVO): ScopeGroupDTO {
    return {
        slug: vo.slug,
        display_name: vo.display_name,
        scope_type: vo.scope_type,
        visibility: vo.visibility,
        teams: vo.teams.map(to_team_list_item_dto),
    };
}

export function to_my_teams_all_response_dto(vo: MyTeamsAllResponseVO): MyTeamsAllResponseDTO {
    return { scopes: vo.scopes.map(to_scope_group_dto) };
}

export function to_latest_version_response_dto(vo: LatestVersionResponseVO): LatestVersionResponseDTO {
    return { name: vo.name, scope: vo.scope, version: vo.version };
}

export function to_batch_latest_response_dto(vo: BatchLatestResponseVO): BatchLatestResponseDTO {
    return {
        teams: vo.teams.map((t) => ({ name: t.name, scope: t.scope, latest: t.latest })),
    };
}

export function to_draft_list_item_dto(vo: DraftListItemVO): DraftListItemDTO {
    return { id: vo.id, title: vo.title, updated_at: vo.updated_at };
}

export function to_draft_detail_dto(vo: DraftDetailVO): DraftDetailDTO {
    return {
        id: vo.id,
        title: vo.title,
        team_json: vo.team_json,
        created_at: vo.created_at,
        updated_at: vo.updated_at,
    };
}

export function to_draft_list_response_dto(vo: DraftListResponseVO): DraftListResponseDTO {
    return { drafts: vo.drafts.map(to_draft_list_item_dto) };
}

export function to_draft_save_response_dto(vo: DraftSaveResponseVO): DraftSaveResponseDTO {
    return { id: vo.id };
}

export function to_draft_delete_response_dto(vo: DraftDeleteResponseVO): DraftDeleteResponseDTO {
    return { deleted: vo.deleted };
}

export function to_builder_generate_response_dto(vo: BuilderGenerateResponseVO): BuilderGenerateResponseDTO {
    return { job_id: vo.job_id, status: vo.status, stage: vo.stage };
}

export function to_builder_generate_status_dto(vo: BuilderGenerateStatusVO): BuilderGenerateStatusDTO {
    return {
        job_id: vo.job_id,
        status: vo.status,
        stage: vo.stage,
        ...(vo.team ? { team: vo.team } : {}),
        ...(vo.validation ? { validation: vo.validation } : {}),
        ...(vo.error ? { error: vo.error } : {}),
    };
}

export function to_builder_improve_role_response_dto(vo: BuilderImproveRoleResponseVO): BuilderImproveRoleResponseDTO {
    return {
        name: vo.name,
        original_content: vo.original_content,
        improved_content: vo.improved_content,
        changes_summary: vo.changes_summary,
    };
}

export function to_builder_validate_response_dto(vo: BuilderValidateResponseVO): BuilderValidateResponseDTO {
    return { valid: vo.valid, errors: vo.errors, warnings: vo.warnings };
}

export function to_builder_chat_response_dto(vo: BuilderChatResponseVO): BuilderChatResponseDTO {
    return { reply: vo.reply, actions: vo.actions };
}

export function to_org_list_item_dto(vo: OrgListItemVO): OrgListItemDTO {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        role: vo.role,
        member_count: vo.member_count,
        scope_count: vo.scope_count,
    };
}

export function to_org_list_response_dto(vo: OrgListResponseVO): OrgListResponseDTO {
    return { orgs: vo.orgs.map(to_org_list_item_dto) };
}

export function to_org_member_dto(vo: OrgMemberVO): OrgMemberDTO {
    return {
        user_id: vo.user_id,
        username: vo.username,
        display_name: vo.display_name,
        email: vo.email,
        role: vo.role,
        role_id: vo.role_id ?? null,
    };
}

export function to_org_role_dto(vo: OrgRoleVO): OrgRoleDTO {
    return {
        id: vo.id,
        org_id: vo.org_id,
        slug: vo.slug,
        name: vo.name,
        permissions: vo.permissions ?? [],
        is_system: vo.is_system,
        is_default: vo.is_default,
        member_count: vo.member_count,
        created_at: vo.created_at,
    };
}

export function to_org_scope_dto(vo: OrgScopeVO): OrgScopeDTO {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        visibility: vo.visibility,
        member_count: vo.member_count,
        team_count: vo.team_count,
    };
}

export function to_org_detail_dto(vo: OrgDetailVO): OrgDetailDTO {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        created_at: vo.created_at,
        my_role: vo.my_role,
        members: vo.members.map(to_org_member_dto),
        scopes: vo.scopes.map(to_org_scope_dto),
        roles: vo.roles?.map(to_org_role_dto),
        available_permissions: vo.available_permissions,
        owner_only_permissions: vo.owner_only_permissions,
    };
}

export function to_org_update_response_dto(vo: OrgUpdateResponseVO): OrgUpdateResponseDTO {
    return { updated: vo.updated };
}

export function to_org_leave_response_dto(vo: OrgLeaveResponseVO): OrgLeaveResponseDTO {
    return { left: vo.left };
}

export function to_org_add_member_response_dto(vo: OrgAddMemberResponseVO): OrgAddMemberResponseDTO {
    return { user_id: vo.user_id, username: vo.username, role: vo.role };
}

export function to_org_remove_member_response_dto(vo: OrgRemoveMemberResponseVO): OrgRemoveMemberResponseDTO {
    return { removed: vo.removed };
}

export function to_users_update_role_response_dto(vo: UsersUpdateRoleResponseVO): UsersUpdateRoleResponseDTO {
    return {
        user_id: vo.user_id,
        org_id: vo.org_id,
        role_id: vo.role_id,
        role_slug: vo.role_slug,
        role: vo.role,
    };
}

export function to_org_roles_list_response_dto(vo: OrgRolesListResponseVO): OrgRolesListResponseDTO {
    return { roles: (vo.roles ?? []).map(to_org_role_dto) };
}

export function to_org_role_response_dto(vo: OrgRoleResponseVO): OrgRoleResponseDTO {
    return { role: to_org_role_dto(vo.role) };
}

export function to_org_delete_role_response_dto(vo: OrgDeleteRoleResponseVO): OrgDeleteRoleResponseDTO {
    return { deleted: vo.deleted };
}

export function to_org_create_scope_response_dto(vo: OrgCreateScopeResponseVO): OrgCreateScopeResponseDTO {
    return { id: vo.id, slug: vo.slug };
}

export function to_org_delete_scope_response_dto(vo: OrgDeleteScopeResponseVO): OrgDeleteScopeResponseDTO {
    return { deleted: vo.deleted };
}

export function to_org_assign_scope_member_response_dto(vo: OrgAssignScopeMemberResponseVO): OrgAssignScopeMemberResponseDTO {
    return { assigned: vo.assigned };
}

export function to_org_unassign_scope_member_response_dto(vo: OrgUnassignScopeMemberResponseVO): OrgUnassignScopeMemberResponseDTO {
    return { removed: vo.removed };
}

export function to_update_profile_response_dto(vo: UpdateProfileResponseVO): UpdateProfileResponseDTO {
    const { suspended_at, suspended_reason, ...safe_user } = vo.user;
    return { user: safe_user };
}

export function to_change_password_response_dto(vo: ChangePasswordResponseVO): ChangePasswordResponseDTO {
    return { message: vo.message };
}

export function to_audit_log_entry_dto(vo: AuditLogEntryVO): AuditLogEntryDTO {
    return { ...vo };
}

export function to_audit_log_response_dto(vo: AuditLogResponseVO): AuditLogResponseDTO {
    return {
        entries: vo.entries.map(to_audit_log_entry_dto),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
    };
}

export function to_admin_user_list_response_dto(vo: AdminUserListResponseVO): AdminUserListResponseDTO {
    return {
        users: vo.users.map((u) => ({ ...u })),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
    };
}

export function to_admin_user_detail_dto(vo: AdminUserDetailVO): AdminUserDetailDTO {
    return { ...vo, orgs: vo.orgs.map((o) => ({ ...o })) };
}

export function to_admin_create_user_response_dto(vo: AdminCreateUserResponseVO): AdminCreateUserResponseDTO {
    return { id: vo.id, username: vo.username };
}

export function to_admin_update_user_response_dto(vo: AdminUpdateUserResponseVO): AdminUpdateUserResponseDTO {
    return { updated: vo.updated };
}

export function to_admin_suspend_user_response_dto(vo: AdminSuspendUserResponseVO): AdminSuspendUserResponseDTO {
    return { suspended: vo.suspended };
}

export function to_admin_delete_user_response_dto(vo: AdminDeleteUserResponseVO): AdminDeleteUserResponseDTO {
    return { deleted: vo.deleted };
}

export function to_admin_set_user_role_response_dto(vo: AdminSetUserRoleResponseVO): AdminSetUserRoleResponseDTO {
    return { role: vo.role };
}

export function to_admin_reset_user_password_response_dto(vo: AdminResetUserPasswordResponseVO): AdminResetUserPasswordResponseDTO {
    return { reset: vo.reset };
}

export function to_admin_team_list_response_dto(vo: AdminTeamListResponseVO): AdminTeamListResponseDTO {
    return { ...vo, teams: vo.teams.map((t) => ({ ...t })) };
}

export function to_admin_set_team_listed_response_dto(vo: AdminSetTeamListedResponseVO): AdminSetTeamListedResponseDTO {
    return { ...vo };
}

export function to_admin_scope_list_response_dto(vo: AdminScopeListResponseVO): AdminScopeListResponseDTO {
    return { ...vo, scopes: vo.scopes.map((s) => ({ ...s })) };
}

export function to_admin_create_scope_response_dto(vo: AdminCreateScopeResponseVO): AdminCreateScopeResponseDTO {
    return { ...vo };
}

export function to_admin_update_scope_response_dto(vo: AdminUpdateScopeResponseVO): AdminUpdateScopeResponseDTO {
    return { ...vo };
}

export function to_admin_delete_scope_response_dto(vo: AdminDeleteScopeResponseVO): AdminDeleteScopeResponseDTO {
    return { ...vo };
}

export function to_admin_org_list_response_dto(vo: AdminOrgListResponseVO): AdminOrgListResponseDTO {
    return { ...vo, orgs: vo.orgs.map((o) => ({ ...o })) };
}

export function to_admin_create_org_response_dto(vo: AdminCreateOrgResponseVO): AdminCreateOrgResponseDTO {
    return { ...vo };
}

export function to_admin_delete_org_response_dto(vo: AdminDeleteOrgResponseVO): AdminDeleteOrgResponseDTO {
    return { ...vo };
}
