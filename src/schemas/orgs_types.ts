/**
 * Orgs — request schemas (Zod, SoT for inbound bodies) and response data types.
 *
 * Naming (same as Core): PascalCase Zod value + type with the same name;
 * responses are `*Data`. Every input field has `.describe(…)`.
 *
 * Routes (controllers/orgs_controller.ts):
 *   POST /v1/orgs/get                    — caller's orgs; site admins without `mine`: every org
 *   POST /v1/orgs/new                    — create an org for an owner, who gets an invite (site admin)
 *   POST /v1/orgs/delete                 — soft-delete an org (site admin)
 *   POST /v1/orgs/get_by_id              — org detail: status, owner, members, scopes, roles
 *   POST /v1/orgs/update                 — rename
 *   POST /v1/orgs/leave                  — caller leaves the org
 *   POST /v1/orgs/remove_member          — remove a member
 *   POST /v1/orgs/list_roles             — org roles
 *   POST /v1/orgs/get_role               — one role
 *   POST /v1/orgs/create_role            — new custom role
 *   POST /v1/orgs/update_role            — rename / re-permission a role
 *   POST /v1/orgs/delete_role            — delete a custom role
 *   POST /v1/orgs/new_scope              — new publishing scope
 *   POST /v1/orgs/update_scope           — rename / change visibility
 *   POST /v1/orgs/delete_scope           — delete a scope
 *   POST /v1/orgs/assign_scope_member    — give a member a scope
 *   POST /v1/orgs/unassign_scope_member  — take it away
 *   POST /v1/orgs/get_scopes             — scopes a user can publish to
 */

import { z } from 'zod';
import type { PagedData } from '../types/api_response.js';
import type { UserStatus } from './users_types.js';
import { sort_fields } from './list_sort.js';

// ─── Shared field fragments ─────────────────────────────────────────────────

const OrgIdField = z.string().uuid().describe('Org UUID');
const UserIdField = z.string().uuid().describe('User UUID');
const RoleIdField = z.string().uuid().describe('Org role UUID');
const ScopeIdField = z.string().uuid().describe('Scope UUID');

const LimitField = z.number().int().min(1).max(100).optional()
    .describe('Page size (max 100)');
const OffsetField = z.number().int().min(0).optional()
    .describe('Zero-based page offset');

const SlugPattern = /^[a-z][a-z0-9-]*$/;
const SlugMessage = 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens';

const VisibilityField = z.enum(['public', 'private']).optional()
    .describe('Who can see teams published to the scope');

const OrgStatusField = z.enum(['active', 'waiting_for_owner', 'deleted']);

const SearchField = z.string().optional()
    .describe('Match on slug or display name (sent to Core as `query`)');
const QueryField = z.string().optional()
    .describe('Core\'s name for `search`; either may be sent');

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/orgs/get — orgs the caller belongs to. */
export const OrgsGetInput = z.object({
    mine: z.boolean().optional()
        .describe('Only orgs the caller belongs to (site admins otherwise get every org)'),
});
export type OrgsGetInput = z.infer<typeof OrgsGetInput>;

/** POST /v1/orgs/get as a site admin without `mine` — every org on the hub. */
export const OrgsGetAllInput = z.object({
    search: SearchField,
    query: QueryField,
    limit: LimitField,
    offset: OffsetField,
    exclude_personal: z.boolean().optional()
        .describe('Leave out personal (single-user) orgs'),
    status: OrgStatusField.optional()
        .describe('Only orgs in this state'),
    include_deleted: z.boolean().optional()
        .describe('Also list soft-deleted orgs'),
    ...sort_fields(['slug', 'display_name', 'member_count', 'scope_count', 'created_at']),
});
export type OrgsGetAllInput = z.infer<typeof OrgsGetAllInput>;

/** `owner` of POST /v1/orgs/new: an existing user, or an email that gets an invited account. */
const OrgOwnerInput = z.union([
    z.object({
        user_id: UserIdField,
    }).strict(),
    z.object({
        email: z.string().email('Invalid email')
            .describe('Email of the owner (an invited account is created when there is none)'),
        display_name: z.string().min(1).optional()
            .describe('Display name for the invited account'),
    }).strict(),
]).describe('The org owner: `{ user_id }` or `{ email, display_name? }`');

/** POST /v1/orgs/new — the org, its owner (invited to accept) and an optional reactivation. */
export const OrgsNewInput = z.object({
    slug: z.string().min(1, 'slug is required').regex(SlugPattern, SlugMessage)
        .describe('Org slug: lowercase letters, digits, hyphens; starts with a letter'),
    display_name: z.string().optional()
        .describe('Display name (defaults to slug)'),
    owner: OrgOwnerInput,
    reactivate: z.boolean().optional()
        .describe('Restore the soft-deleted org that holds this slug'),
});
export type OrgsNewInput = z.infer<typeof OrgsNewInput>;

/** POST /v1/orgs/get_by_id, /leave, /list_roles, /delete — one org by id. */
export const OrgIdInput = z.object({
    org_id: OrgIdField,
});
export type OrgIdInput = z.infer<typeof OrgIdInput>;

/** POST /v1/orgs/update */
export const OrgsUpdateInput = z.object({
    org_id: OrgIdField,
    display_name: z.string().min(1, 'display_name is required')
        .describe('New display name'),
});
export type OrgsUpdateInput = z.infer<typeof OrgsUpdateInput>;

/** POST /v1/orgs/remove_member */
export const OrgsRemoveMemberInput = z.object({
    org_id: OrgIdField,
    user_id: UserIdField,
});
export type OrgsRemoveMemberInput = z.infer<typeof OrgsRemoveMemberInput>;

/** POST /v1/orgs/get_role, /delete_role — one role by id. */
export const OrgRoleIdInput = z.object({
    org_id: OrgIdField,
    role_id: RoleIdField,
});
export type OrgRoleIdInput = z.infer<typeof OrgRoleIdInput>;

/** POST /v1/orgs/create_role */
export const OrgsCreateRoleInput = z.object({
    org_id: OrgIdField,
    slug: z.string().min(1).max(49)
        .describe('Role slug, unique in the org'),
    name: z.string().min(1).max(100)
        .describe('Role display name'),
    permissions: z.array(z.string())
        .describe('Permission keys (see permissions/list)'),
});
export type OrgsCreateRoleInput = z.infer<typeof OrgsCreateRoleInput>;

/** POST /v1/orgs/update_role — at least one of name / permissions. */
export const OrgsUpdateRoleInput = z.object({
    org_id: OrgIdField,
    role_id: RoleIdField,
    name: z.string().min(1).max(100).optional()
        .describe('New display name'),
    permissions: z.array(z.string()).optional()
        .describe('Replacement permission keys'),
}).refine(
    (d) => d.name !== undefined || d.permissions !== undefined,
    { message: 'At least one of name or permissions is required' },
);
export type OrgsUpdateRoleInput = z.infer<typeof OrgsUpdateRoleInput>;

/** POST /v1/orgs/new_scope */
export const OrgsNewScopeInput = z.object({
    org_id: OrgIdField,
    slug: z.string().min(1, 'slug is required').regex(SlugPattern, SlugMessage)
        .describe('Scope slug: lowercase letters, digits, hyphens; starts with a letter'),
    display_name: z.string().optional()
        .describe('Display name (defaults to slug)'),
    visibility: VisibilityField,
});
export type OrgsNewScopeInput = z.infer<typeof OrgsNewScopeInput>;

/** POST /v1/orgs/update_scope */
export const OrgsUpdateScopeInput = z.object({
    org_id: OrgIdField,
    scope_id: ScopeIdField,
    display_name: z.string().optional()
        .describe('New display name'),
    visibility: VisibilityField,
});
export type OrgsUpdateScopeInput = z.infer<typeof OrgsUpdateScopeInput>;

/** POST /v1/orgs/delete_scope */
export const OrgScopeIdInput = z.object({
    org_id: OrgIdField,
    scope_id: ScopeIdField,
});
export type OrgScopeIdInput = z.infer<typeof OrgScopeIdInput>;

/** POST /v1/orgs/assign_scope_member, /unassign_scope_member */
export const OrgScopeMemberInput = z.object({
    org_id: OrgIdField,
    scope_id: ScopeIdField,
    user_id: UserIdField,
});
export type OrgScopeMemberInput = z.infer<typeof OrgScopeMemberInput>;

/** POST /v1/orgs/get_scopes — scopes a user can publish to. */
export const OrgsGetScopesInput = z.object({
    user_id: UserIdField,
    org_id: z.string().uuid().optional()
        .describe('Only scopes in this org'),
    search: SearchField,
    query: QueryField,
    limit: LimitField,
    offset: OffsetField,
});
export type OrgsGetScopesInput = z.infer<typeof OrgsGetScopesInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** A publishing scope the signed-in user can use (session payload). */
export interface ScopeData {
    id: string;
    slug: string;
    display_name: string;
    owner_id: string;
    org_id: string | null;
    visibility: 'public' | 'private';
    scope_type: 'user' | 'org';
}

/** One org the caller belongs to. */
export interface OrgListItemData {
    id: string;
    slug: string;
    display_name: string;
    /** Caller's role slug in the org. */
    role: string;
    member_count: number;
    scope_count: number;
    status: OrgStatus;
    /** The owner; null when the org has none. `username` is null until an owner invited by email accepts. */
    owner: { username: string | null; status: UserStatus } | null;
    deleted_at: string | null;
}

/** `orgs/get` (member view) */
export interface OrgsGetData {
    orgs: OrgListItemData[];
}

/** Lifecycle state of an org. */
export type OrgStatus = 'active' | 'waiting_for_owner' | 'deleted';

/** One org in the site-admin list. */
export interface OrgAdminListItemData {
    id: string;
    slug: string;
    display_name: string;
    member_count: number;
    scope_count: number;
    created_at: string;
    status: OrgStatus;
    /** The owner; null when the org has none. `username` is null until an owner invited by email accepts. */
    owner: { username: string | null; status: UserStatus } | null;
    deleted_at: string | null;
}

/** `orgs/get` (site-admin view) */
export interface OrgsGetAllData {
    orgs: OrgAdminListItemData[];
    total: number;
    limit: number;
    offset: number;
    /** `sort_by` keys Core applies today (lib/core_list.ts); the SPA shows sort headers only for these. */
    sortable: string[];
}

/** The org `orgs/new` created or reactivated. */
export interface OrgsNewOrgData {
    id: string;
    slug: string;
    display_name: string;
    status: OrgStatus;
    owner: { user_id: string; email: string; status: UserStatus };
    created_at: string;
    /** A soft-deleted org was restored (same id). */
    reactivated: boolean;
}

/** The owner invite `orgs/new` sent. */
export interface OrgsNewOwnerInviteData {
    invite_id: string;
    role: 'owner';
    status: 'pending';
    expires_at: string;
    email_sent: boolean;
    /** The accept link, only when the email could not be sent. */
    invite_url: string | null;
}

/** `orgs/new` */
export interface OrgsNewData {
    org: OrgsNewOrgData;
    owner_invite: OrgsNewOwnerInviteData;
}

/** `orgs/delete` — the org stays (soft delete) and its slug stays taken. */
export interface OrgsDeleteData {
    id: string;
    deleted_at: string;
}

/** Membership state: invited and not yet accepted, active, or a former member. */
export type OrgMemberStatus = 'active' | 'pending' | 'deleted';

/** An org member with their org role and membership state. */
export interface OrgMemberData {
    user_id: string;
    /** Null for someone invited by email who has not accepted yet. */
    username: string | null;
    display_name: string;
    /** Null unless the caller manages members (org owner/admin) or is a site admin. */
    email: string | null;
    /** Role slug. */
    role: string;
    role_id: string | null;
    status: OrgMemberStatus;
    invited_at: string | null;
    joined_at: string | null;
    deleted_at: string | null;
}

/** An org role with its permissions. */
export interface OrgRoleData {
    id: string;
    org_id: string;
    slug: string;
    name: string;
    permissions: string[];
    /** Built-in role (owner / admin / member); cannot be deleted. */
    is_system: boolean;
    /** Given to new members. */
    is_default: boolean;
    member_count: number;
    created_at?: string;
}

/** A publishing scope of an org, with counts. */
export interface OrgScopeData {
    id: string;
    slug: string;
    display_name: string;
    visibility: string;
    member_count: number;
    team_count: number;
}

/** `orgs/get_by_id` */
export interface OrgDetailData {
    id: string;
    slug: string;
    display_name: string;
    created_at: string;
    status: OrgStatus;
    /** The owner; null when the org has none. `username` is null until an owner invited by email accepts. */
    owner: { user_id: string; username: string | null; status: UserStatus } | null;
    deleted_at: string | null;
    /** The open owner invite while the org waits for its owner (the Waiting-for-owner banner); null otherwise. */
    pending_owner_invite: { invite_id: string; email: string; expires_at: string } | null;
    /** Caller's role slug. */
    my_role: string;
    members: OrgMemberData[];
    scopes: OrgScopeData[];
    roles: OrgRoleData[];
    /** Permissions a custom role can hold. */
    available_permissions: string[];
    /** Permissions only the owner role has (never assignable): `org.delete`, `org.transfer`, `rules.manage`. */
    owner_only_permissions: string[];
}

/** `orgs/update` */
export interface OrgsUpdateData {
    updated: boolean;
}

/** `orgs/leave` */
export interface OrgsLeaveData {
    left: boolean;
}

/** `orgs/remove_member` */
export interface OrgsRemoveMemberData {
    removed: boolean;
}

/** `orgs/list_roles` */
export interface OrgsListRolesData {
    roles: OrgRoleData[];
}

/** `orgs/get_role`, `orgs/create_role`, `orgs/update_role` */
export interface OrgsRoleData {
    role: OrgRoleData;
}

/** `orgs/delete_role` */
export interface OrgsDeleteRoleData {
    deleted: boolean;
}

/** `orgs/new_scope` */
export interface OrgsNewScopeData {
    id: string;
    slug: string;
}

/** `orgs/update_scope` */
export interface OrgsUpdateScopeData {
    updated: boolean;
}

/** `orgs/delete_scope` */
export interface OrgsDeleteScopeData {
    deleted: boolean;
}

/** `orgs/assign_scope_member` */
export interface OrgsAssignScopeMemberData {
    assigned: boolean;
}

/** `orgs/unassign_scope_member` */
export interface OrgsUnassignScopeMemberData {
    removed: boolean;
}

/** One row of `orgs/get_scopes`. */
export interface ScopeListItemData {
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

/** `orgs/get_scopes` */
export type OrgsGetScopesData = PagedData<ScopeListItemData>;
