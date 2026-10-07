/**
 * Orgs — response shapes as Core sends them (`/v1/orgs/*`, `/internal/orgs/*`).
 * Only repositories return these; services map them to `schemas/orgs_types.ts` data.
 */

import type { UserStatusVO } from './users.js';

/** A publishing scope (`@slug`), user- or org-owned. */
export interface ScopeVO {
    id: string;
    slug: string;
    display_name: string;
    owner_id: string;
    org_id: string | null;
    visibility: 'public' | 'private';
    scope_type: 'user' | 'org';
    created_at: string;
}

/** One org of the caller's list, with their role, its state and its owner. */
export interface OrgListItemVO {
    id: string;
    slug: string;
    display_name: string;
    role: string;
    /** The caller's effective permissions in this org; owners hold all (Core API 6+, `orgs/get` with `mine`). */
    permissions?: string[];
    member_count: number;
    scope_count: number;
    status: OrgStatusVO;
    /** `username` is null while the owner (invited by email) has not accepted. */
    owner: { username: string | null; status: UserStatusVO } | null;
    deleted_at: string | null;
}

/** `orgs/get`. */
export interface OrgsGetVO {
    orgs: OrgListItemVO[];
}

/** Org lifecycle state (`orgs.status`; `deleted` when `deleted_at` is set). */
export type OrgStatusVO = 'active' | 'waiting_for_owner' | 'deleted';

/** One org in the site-admin list. */
export interface OrgAdminListItemVO {
    id: string;
    slug: string;
    display_name: string;
    member_count: number;
    scope_count: number;
    created_at: string;
    status: OrgStatusVO;
    /** `username` is null while the owner (invited by email) has not accepted. */
    owner: { username: string | null; status: UserStatusVO } | null;
    deleted_at: string | null;
}

/** Site-admin `orgs/get` (without `mine`). */
export interface OrgsGetAllVO {
    orgs: OrgAdminListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

/** `orgs/new` — the org (new or reactivated) and the owner invite it sent. */
export interface OrgsNewVO {
    org: {
        id: string;
        slug: string;
        display_name: string;
        status: OrgStatusVO;
        owner: { user_id: string; email: string; status: UserStatusVO };
        created_at: string;
        reactivated: boolean;
    };
    owner_invite: {
        invite_id: string;
        role: 'owner';
        status: 'pending';
        expires_at: string;
        email_sent: boolean;
        invite_url: string | null;
    };
}

/** `orgs/delete` (soft delete). */
export interface OrgsDeleteVO {
    id: string;
    deleted_at: string;
}

/** An org member with their org role and membership state; `username` is null for someone invited by email who has not accepted. */
export interface OrgMemberVO {
    user_id: string;
    username: string | null;
    display_name: string;
    /** Sent only to member managers (org owners/admins) and site admins. */
    email?: string | null;
    role: string;
    /** The member's org role (permissions are checked against it); null when none is assigned. */
    role_id: string | null;
    status: 'active' | 'pending' | 'deleted';
    invited_at: string | null;
    joined_at: string | null;
    deleted_at: string | null;
}

/** An org role with its permissions. */
export interface OrgRoleVO {
    id: string;
    org_id: string;
    slug: string;
    name: string;
    permissions: string[];
    is_system: boolean;
    is_default: boolean;
    member_count: number;
    created_at?: string;
}

/** A publishing scope of an org, with counts. */
export interface OrgScopeVO {
    id: string;
    slug: string;
    display_name: string;
    visibility: string;
    member_count: number;
    team_count: number;
}

/**
 * `orgs/get_by_id` — org with status, owner, members, scopes, roles and the
 * permission catalog. Plain members get active members only, without emails.
 */
export interface OrgDetailVO {
    id: string;
    slug: string;
    display_name: string;
    created_at: string;
    status: OrgStatusVO;
    /** `username` is null while the owner (invited by email) has not accepted. */
    owner: { user_id: string; username: string | null; status: UserStatusVO } | null;
    deleted_at: string | null;
    /** The pending, unexpired owner invite while the org waits for its owner; null otherwise. */
    pending_owner_invite: { invite_id: string; email: string; expires_at: string } | null;
    my_role: string;
    members: OrgMemberVO[];
    scopes: OrgScopeVO[];
    roles: OrgRoleVO[];
    available_permissions: string[];
    owner_only_permissions: string[];
}

/** `orgs/update`. */
export interface OrgsUpdateVO {
    updated: boolean;
}

/** `orgs/leave`. */
export interface OrgsLeaveVO {
    left: boolean;
}

/** `orgs/remove_member`. */
export interface OrgsRemoveMemberVO {
    removed: boolean;
}

/** `orgs/list_roles`. */
export interface OrgsListRolesVO {
    roles: OrgRoleVO[];
}

/** `orgs/get_role` / `create_role` / `update_role`. */
export interface OrgsRoleVO {
    role: OrgRoleVO;
}

/** `orgs/delete_role`. */
export interface OrgsDeleteRoleVO {
    deleted: boolean;
}

/** `orgs/new_scope`. */
export interface OrgsNewScopeVO {
    id: string;
    slug: string;
}

/** `orgs/update_scope`. */
export interface OrgsUpdateScopeVO {
    updated: boolean;
}

/** `orgs/delete_scope`. */
export interface OrgsDeleteScopeVO {
    deleted: boolean;
}

/** `orgs/assign_scope_member`. */
export interface OrgsAssignScopeMemberVO {
    assigned: boolean;
}

/** `orgs/unassign_scope_member`. */
export interface OrgsUnassignScopeMemberVO {
    removed: boolean;
}

/** One scope row of `orgs/get_scopes`. */
export interface ScopeListItemVO {
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
}

/** `orgs/get_scopes` — one page of scopes. */
export interface OrgsGetScopesVO {
    items: ScopeListItemVO[];
    total: number;
    offset: number;
    limit: number;
}
