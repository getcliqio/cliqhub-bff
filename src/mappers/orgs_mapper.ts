/** Orgs — Core VO → BFF data. */

import type {
    ScopeVO, OrgListItemVO, OrgsGetVO, OrgAdminListItemVO, OrgsGetAllVO, OrgsNewVO, OrgsDeleteVO, OrgMemberVO,
    OrgRoleVO, OrgScopeVO, OrgDetailVO, OrgsUpdateVO, OrgsLeaveVO,
    OrgsRemoveMemberVO, OrgsListRolesVO, OrgsRoleVO, OrgsDeleteRoleVO, OrgsNewScopeVO,
    OrgsUpdateScopeVO, OrgsDeleteScopeVO, OrgsAssignScopeMemberVO, OrgsUnassignScopeMemberVO,
    OrgsGetScopesVO,
} from '../types/core/orgs.js';
import type {
    ScopeData, OrgListItemData, OrgsGetData, OrgAdminListItemData, OrgsGetAllData, OrgsNewData, OrgsDeleteData,
    OrgMemberData, OrgRoleData, OrgScopeData, OrgDetailData, OrgsUpdateData, OrgsLeaveData,
    OrgsRemoveMemberData, OrgsListRolesData, OrgsRoleData, OrgsDeleteRoleData,
    OrgsNewScopeData, OrgsUpdateScopeData, OrgsDeleteScopeData, OrgsAssignScopeMemberData,
    OrgsUnassignScopeMemberData, OrgsGetScopesData,
} from '../schemas/orgs_types.js';

/** Session scope (drops `created_at`). */
export function to_scope_data(scope: ScopeVO): ScopeData {
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

/** One org of the caller's list, with their role and counts. */
export function to_org_list_item_data(vo: OrgListItemVO): OrgListItemData {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        role: vo.role,
        member_count: vo.member_count,
        scope_count: vo.scope_count,
        status: vo.status,
        owner: vo.owner ? { username: vo.owner.username, status: vo.owner.status } : null,
        deleted_at: vo.deleted_at ?? null,
    };
}

/** `orgs/get` → the caller's orgs. */
export function to_orgs_get_data(vo: OrgsGetVO): OrgsGetData {
    return { orgs: vo.orgs.map(to_org_list_item_data) };
}

/** One org of the site-admin list with its state and owner. */
export function to_org_admin_list_item_data(vo: OrgAdminListItemVO): OrgAdminListItemData {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        member_count: vo.member_count,
        scope_count: vo.scope_count,
        created_at: vo.created_at,
        status: vo.status,
        owner: vo.owner ? { username: vo.owner.username, status: vo.owner.status } : null,
        deleted_at: vo.deleted_at ?? null,
    };
}

/** Site-admin `orgs/get` → every org plus the sort keys Core applies today. */
export function to_orgs_get_all_data(vo: OrgsGetAllVO, sortable: string[]): OrgsGetAllData {
    return {
        orgs: vo.orgs.map(to_org_admin_list_item_data),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
        sortable,
    };
}

/** `orgs/new` → the org with its owner and the owner invite (`invite_url` only when no email went out). */
export function to_orgs_new_data(vo: OrgsNewVO): OrgsNewData {
    const { org, owner_invite: inv } = vo;
    return {
        org: {
            id: org.id,
            slug: org.slug,
            display_name: org.display_name,
            status: org.status,
            owner: { user_id: org.owner.user_id, email: org.owner.email, status: org.owner.status },
            created_at: org.created_at,
            reactivated: org.reactivated,
        },
        owner_invite: {
            invite_id: inv.invite_id,
            role: inv.role,
            status: inv.status,
            expires_at: inv.expires_at,
            email_sent: inv.email_sent,
            invite_url: inv.invite_url ?? null,
        },
    };
}

/** `orgs/delete` → the org id and when it was soft-deleted. */
export function to_orgs_delete_data(vo: OrgsDeleteVO): OrgsDeleteData {
    return { id: vo.id, deleted_at: vo.deleted_at };
}

/** Org member with org role and membership state. */
export function to_org_member_data(vo: OrgMemberVO): OrgMemberData {
    return {
        user_id: vo.user_id,
        username: vo.username,
        display_name: vo.display_name,
        email: vo.email ?? null,
        role: vo.role,
        role_id: vo.role_id,
        status: vo.status,
        invited_at: vo.invited_at,
        joined_at: vo.joined_at,
        deleted_at: vo.deleted_at,
    };
}

/** Org role with its permissions (empty when Core sent none). */
export function to_org_role_data(vo: OrgRoleVO): OrgRoleData {
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

/** Publishing scope of an org with member / team counts. */
export function to_org_scope_data(vo: OrgScopeVO): OrgScopeData {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        visibility: vo.visibility,
        member_count: vo.member_count,
        team_count: vo.team_count,
    };
}

/** `orgs/get_by_id` → org with status, owner, pending owner invite, members, scopes, roles and the permission catalog. */
export function to_org_detail_data(vo: OrgDetailVO): OrgDetailData {
    return {
        id: vo.id,
        slug: vo.slug,
        display_name: vo.display_name,
        created_at: vo.created_at,
        status: vo.status,
        owner: vo.owner ? { user_id: vo.owner.user_id, username: vo.owner.username, status: vo.owner.status } : null,
        deleted_at: vo.deleted_at ?? null,
        pending_owner_invite: vo.pending_owner_invite
            ? { invite_id: vo.pending_owner_invite.invite_id, email: vo.pending_owner_invite.email, expires_at: vo.pending_owner_invite.expires_at }
            : null,
        my_role: vo.my_role,
        members: vo.members.map(to_org_member_data),
        scopes: vo.scopes.map(to_org_scope_data),
        roles: vo.roles.map(to_org_role_data),
        available_permissions: vo.available_permissions,
        owner_only_permissions: vo.owner_only_permissions,
    };
}

/** `orgs/update` → `{ updated }`. */
export function to_orgs_update_data(vo: OrgsUpdateVO): OrgsUpdateData {
    return { updated: vo.updated };
}

/** `orgs/leave` → `{ left }`. */
export function to_orgs_leave_data(vo: OrgsLeaveVO): OrgsLeaveData {
    return { left: vo.left };
}

/** `orgs/remove_member` → `{ removed }`. */
export function to_orgs_remove_member_data(vo: OrgsRemoveMemberVO): OrgsRemoveMemberData {
    return { removed: vo.removed };
}

/** `orgs/list_roles` → the org's roles. */
export function to_orgs_list_roles_data(vo: OrgsListRolesVO): OrgsListRolesData {
    return { roles: (vo.roles ?? []).map(to_org_role_data) };
}

/** `orgs/get_role` / create / update → the role. */
export function to_orgs_role_data(vo: OrgsRoleVO): OrgsRoleData {
    return { role: to_org_role_data(vo.role) };
}

/** `orgs/delete_role` → `{ deleted }`. */
export function to_orgs_delete_role_data(vo: OrgsDeleteRoleVO): OrgsDeleteRoleData {
    return { deleted: vo.deleted };
}

/** `orgs/new_scope` → the new scope's id and slug. */
export function to_orgs_new_scope_data(vo: OrgsNewScopeVO): OrgsNewScopeData {
    return { id: vo.id, slug: vo.slug };
}

/** `orgs/update_scope` → `{ updated }`. */
export function to_orgs_update_scope_data(vo: OrgsUpdateScopeVO): OrgsUpdateScopeData {
    return { updated: vo.updated };
}

/** `orgs/delete_scope` → `{ deleted }`. */
export function to_orgs_delete_scope_data(vo: OrgsDeleteScopeVO): OrgsDeleteScopeData {
    return { deleted: vo.deleted };
}

/** `orgs/assign_scope_member` → `{ assigned }`. */
export function to_orgs_assign_scope_member_data(vo: OrgsAssignScopeMemberVO): OrgsAssignScopeMemberData {
    return { assigned: vo.assigned };
}

/** `orgs/unassign_scope_member` → `{ removed }`. */
export function to_orgs_unassign_scope_member_data(vo: OrgsUnassignScopeMemberVO): OrgsUnassignScopeMemberData {
    return { removed: vo.removed };
}

/** `orgs/get_scopes` → one page of scopes. */
export function to_orgs_get_scopes_data(vo: OrgsGetScopesVO): OrgsGetScopesData {
    return { items: vo.items.map((s) => ({ ...s })), total: vo.total, offset: vo.offset, limit: vo.limit };
}
