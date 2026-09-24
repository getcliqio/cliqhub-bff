import { z } from 'zod';

export const login_schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export const signup_schema = z.object({
    username: z.string().min(1, 'Username is required').max(40),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const access_level_schema = z.enum(['read', 'write', 'admin']);
const access_levels_schema = z.array(access_level_schema).min(1);

const grant_access_schema = z.object({
    users: access_levels_schema.optional(),
    orgs: access_levels_schema.optional(),
    scopes: access_levels_schema.optional(),
    teams: access_levels_schema.optional(),
    drafts: access_levels_schema.optional(),
    tokens: access_levels_schema.optional(),
    realms: access_levels_schema.optional(),
    daemons: access_levels_schema.optional(),
    runs: access_levels_schema.optional(),
    dispatch: access_levels_schema.optional(),
    workspaces: access_levels_schema.optional(),
    agents: access_levels_schema.optional(),
    settings: access_levels_schema.optional(),
    notifications: access_levels_schema.optional(),
    builder: access_levels_schema.optional(),
    hug: access_levels_schema.optional(),
    reports: access_levels_schema.optional(),
});

const token_permissions_schema = z.object({
    domains: z.object({
        orgs: z.union([z.literal('*'), z.array(z.union([z.number().int(), z.literal('*')]))]).optional(),
        scopes: z.union([z.literal('*'), z.array(z.union([z.string(), z.literal('*')]))]).optional(),
        realms: z.union([z.literal('*'), z.array(z.union([z.string(), z.literal('*')]))]).optional(),
    }).optional(),
    access: grant_access_schema.optional(),
}).optional();

const token_type_schema = z.enum(['user', 'realm', 'a2a', 'daemon_wire']);

export const new_token_schema = z.object({
    type: token_type_schema.optional().default('user'),
    name: z.string().max(100).optional(),
    realm_ids: z.array(z.string().min(1)).min(1).optional(),
    /** Required when type=a2a or daemon_wire. */
    realm_id: z.string().min(1).optional(),
    aud: z.string().optional(),
    run_id: z.string().optional(),
    action: z.enum(['execute', 'cancel', 'access']).optional(),
    permissions: token_permissions_schema,
}).superRefine((val, ctx) => {
    if (val.type !== 'a2a' && val.type !== 'daemon_wire') return;
    if (val.realm_id) return;
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `realm_id is required when type is ${val.type}`,
        path: ['realm_id'],
    });
});

export const revoke_token_schema = z.object({
    type: z.enum(['user', 'realm']).optional().default('user'),
    token_id: z.union([
        z.number().int().positive('Token ID must be a positive integer'),
        z.string().min(1),
    ]),
    realm_id: z.string().min(1).optional(),
});

export const rotate_token_schema = z.object({
    type: z.enum(['user', 'realm', 'a2a']).optional().default('user'),
    token_id: z.union([
        z.number().int().positive('Token ID must be a positive integer'),
        z.string().min(1),
    ]).optional(),
    realm_id: z.string().min(1).optional(),
}).superRefine((val, ctx) => {
    if (val.type === 'a2a') {
        if (val.realm_id) return;
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'realm_id is required when type is a2a',
            path: ['realm_id'],
        });
        return;
    }
    if (val.token_id) return;
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'token_id is required when type is not a2a',
        path: ['token_id'],
    });
});

export const list_tokens_schema = z.object({
    type: z.enum(['user', 'realm']).optional(),
    realm_id: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
});

export const impersonate_schema = z.object({
    user_id: z.string().uuid(),
});

export type LoginInput = z.infer<typeof login_schema>;
export type SignupInput = z.infer<typeof signup_schema>;
export type NewTokenInput = z.infer<typeof new_token_schema>;
export type RevokeTokenInput = z.infer<typeof revoke_token_schema>;
export type ImpersonateInput = z.infer<typeof impersonate_schema>;
