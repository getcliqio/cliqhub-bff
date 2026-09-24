import { z } from 'zod';

export const orgs_get_schema = z.object({
    mine: z.boolean().optional(),
});

export const orgs_get_by_id_schema = z.object({
    org_id: z.string().uuid(),
});

export const orgs_update_schema = z.object({
    org_id: z.string().uuid(),
    display_name: z.string().min(1, 'display_name is required'),
});

export const orgs_leave_schema = z.object({
    org_id: z.string().uuid(),
});

export const orgs_add_member_schema = z.object({
    org_id: z.string().uuid(),
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    user_id: z.string().uuid().optional(),
}).refine(
    (v) => Boolean(v.username || v.email || v.user_id != null),
    { message: 'username, email, or user_id is required' },
);







export const orgs_remove_member_schema = z.object({
    org_id: z.string().uuid(),
    user_id: z.string().uuid(),
});

export const orgs_list_roles_schema = z.object({
    org_id: z.string().uuid(),
});

export const orgs_get_role_schema = z.object({
    org_id: z.string().uuid(),
    role_id: z.string().uuid(),
});

export const orgs_create_role_schema = z.object({
    org_id: z.string().uuid(),
    slug: z.string().min(1).max(49),
    name: z.string().min(1).max(100),
    permissions: z.array(z.string()),
});

export const orgs_update_role_schema = z.object({
    org_id: z.string().uuid(),
    role_id: z.string().uuid(),
    name: z.string().min(1).max(100).optional(),
    permissions: z.array(z.string()).optional(),
}).refine(
    (d) => d.name !== undefined || d.permissions !== undefined,
    { message: 'At least one of name or permissions is required' },
);

export const orgs_delete_role_schema = z.object({
    org_id: z.string().uuid(),
    role_id: z.string().uuid(),
});

export const users_update_role_schema = z.object({
    user_id: z.string().uuid(),
    org_id: z.string().uuid(),
    role_id: z.string().uuid(),
});

export type OrgsGetInput = z.infer<typeof orgs_get_schema>;
export type OrgsUpdateInput = z.infer<typeof orgs_update_schema>;
export type OrgsLeaveInput = z.infer<typeof orgs_leave_schema>;
export const orgs_new_scope_schema = z.object({
    org_id: z.string().uuid(),
    slug: z.string().min(1, 'slug is required').regex(/^[a-z][a-z0-9-]*$/, 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens'),
    display_name: z.string().optional(),
    visibility: z.enum(['public', 'private']).optional(),
});

export const orgs_delete_scope_schema = z.object({
    org_id: z.string().uuid(),
    scope_id: z.string().uuid(),
});

export const orgs_assign_scope_member_schema = z.object({
    org_id: z.string().uuid(),
    scope_id: z.string().uuid(),
    user_id: z.string().uuid(),
});

export const orgs_unassign_scope_member_schema = z.object({
    org_id: z.string().uuid(),
    scope_id: z.string().uuid(),
    user_id: z.string().uuid(),
});

export type OrgsAddMemberInput = z.infer<typeof orgs_add_member_schema>;
export type OrgsRemoveMemberInput = z.infer<typeof orgs_remove_member_schema>;
export type OrgsNewScopeInput = z.infer<typeof orgs_new_scope_schema>;
export type OrgsDeleteScopeInput = z.infer<typeof orgs_delete_scope_schema>;
export type OrgsAssignScopeMemberInput = z.infer<typeof orgs_assign_scope_member_schema>;
export type OrgsUnassignScopeMemberInput = z.infer<typeof orgs_unassign_scope_member_schema>;
export type UsersUpdateRoleInput = z.infer<typeof users_update_role_schema>;
