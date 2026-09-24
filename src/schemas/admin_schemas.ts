import { z } from 'zod';

export const admin_audit_schema = z.object({
    action: z.string().optional(),
    target_type: z.string().optional(),
    admin_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
});

export type AdminAuditInput = z.infer<typeof admin_audit_schema>;

export const admin_get_users_schema = z.object({
    /** When set, list members of that account (org). Org members may call this; global list is site-admin only. */
    org_id: z.string().uuid().optional(),
    /**
     * When set, search Hub users for realm invite (excludes current members).
     * Replaces /v1/realms/search_users.
     */
    realm_id: z.string().min(1).optional(),
    search: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
});

export const admin_get_user_schema = z.object({
    user_id: z.string().uuid(),
});

export const admin_new_user_schema = z.object({
    username: z.string().min(1, 'username is required').regex(/^[a-z][a-z0-9-]*$/, 'Username must start with a letter and contain only lowercase letters, numbers, and hyphens'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    display_name: z.string().optional(),
    role: z.enum(['user', 'admin']).optional(),
});

export const admin_update_user_schema = z.object({
    user_id: z.string().uuid(),
    display_name: z.string().min(1, 'Display name cannot be empty').optional(),
    email: z.string().email('Invalid email').optional(),
});

export const admin_suspend_user_schema = z.object({
    user_id: z.string().uuid(),
    reason: z.string().optional(),
});

export const admin_unsuspend_user_schema = z.object({
    user_id: z.string().uuid(),
});

export const admin_delete_user_schema = z.object({
    user_id: z.string().uuid(),
});

export const admin_set_user_role_schema = z.object({
    user_id: z.string().uuid(),
    role: z.enum(['user', 'admin'], { required_error: 'role is required' }),
});

export const admin_reset_user_password_schema = z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const admin_get_teams_schema = z.object({
    search: z.string().optional(),
    /** Alias for CLI/catalog clients that send `query` (mapped to search). */
    query: z.string().optional(),
    scope: z.string().optional(),
    listed: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
}).transform((body) => ({
    search: body.search ?? body.query,
    scope: body.scope,
    listed: body.listed,
    limit: body.limit,
    offset: body.offset,
}));

export const admin_set_team_listed_schema = z.object({
    team_id: z.string().uuid(),
    listed: z.boolean(),
});

export const admin_get_scopes_schema = z.object({
    mine: z.boolean().optional(),
    search: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
});

export const admin_new_scope_schema = z.object({
    slug: z.string().min(1, 'slug is required').regex(/^[a-z][a-z0-9-]*$/, 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens'),
    display_name: z.string().optional(),
    owner_username: z.string().min(1).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    scope_type: z.enum(['user', 'org']).optional(),
    org_slug: z.string().optional(),
    org_id: z.string().uuid().optional(),
});

export const admin_update_scope_schema = z.object({
    scope_id: z.string().uuid(),
    visibility: z.enum(['public', 'private']).optional(),
    display_name: z.string().min(1).optional(),
    owner_id: z.string().uuid().optional(),
});

export const admin_delete_scope_schema = z.object({
    scope_id: z.string().uuid(),
});

export const admin_scopes_user_schema = z.object({
    scope_id: z.string().uuid(),
    user_id: z.string().uuid(),
});

export const admin_get_orgs_schema = z.object({
    search: z.string().optional(),
    query: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    exclude_personal: z.boolean().optional(),
});

export const admin_new_org_schema = z.object({
    slug: z.string().min(1, 'slug is required').regex(/^[a-z][a-z0-9-]*$/, 'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens'),
    display_name: z.string().optional(),
    admin_username: z.string().min(1, 'admin_username is required'),
    admin_email: z.string().email('Invalid email').optional(),
    admin_password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    admin_display_name: z.string().optional(),
});

export const admin_delete_org_schema = z.object({
    org_id: z.string().uuid(),
});
