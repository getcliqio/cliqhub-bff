/**
 * Tokens — request schemas (Zod) and response data types for personal,
 * realm, A2A and daemon-wire tokens. Bodies are forwarded to Core as-is.
 *
 * Routes (controllers/tokens_controller.ts):
 *   POST /v1/auth/generate_token  — mint a token
 *   POST /v1/auth/get_tokens      — list tokens
 *   POST /v1/auth/revoke_token    — revoke one
 *   POST /v1/auth/rotate_token    — rotate one (A2A: the realm's bearer)
 */

import { z } from 'zod';

// ─── Shared field fragments ─────────────────────────────────────────────────

const AccessLevels = z.array(z.enum(['read', 'write', 'admin'])).min(1);

const GrantAccess = z.object({
    users: AccessLevels.optional(),
    orgs: AccessLevels.optional(),
    scopes: AccessLevels.optional(),
    teams: AccessLevels.optional(),
    drafts: AccessLevels.optional(),
    tokens: AccessLevels.optional(),
    realms: AccessLevels.optional(),
    daemons: AccessLevels.optional(),
    runs: AccessLevels.optional(),
    dispatch: AccessLevels.optional(),
    workspaces: AccessLevels.optional(),
    agents: AccessLevels.optional(),
    settings: AccessLevels.optional(),
    notifications: AccessLevels.optional(),
    builder: AccessLevels.optional(),
    hug: AccessLevels.optional(),
    reports: AccessLevels.optional(),
}).describe('Access levels per domain');

const TokenPermissions = z.object({
    domains: z.object({
        orgs: z.union([z.literal('*'), z.array(z.union([z.number().int(), z.literal('*')]))]).optional(),
        scopes: z.union([z.literal('*'), z.array(z.union([z.string(), z.literal('*')]))]).optional(),
        realms: z.union([z.literal('*'), z.array(z.union([z.string(), z.literal('*')]))]).optional(),
    }).optional().describe('Which orgs / scopes / realms the token reaches ("*" = all)'),
    access: GrantAccess.optional(),
}).optional().describe('Narrowing of the token (defaults to the owner\'s access)');

const TokenIdField = z.union([
    z.number().int().positive('Token ID must be a positive integer'),
    z.string().min(1),
]).describe('Token id');

const RealmIdField = z.string().min(1).optional()
    .describe('Realm id (realm, a2a and daemon_wire tokens)');

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/auth/generate_token — a2a and daemon_wire need `realm_id`. */
export const TokensGenerateInput = z.object({
    type: z.enum(['user', 'realm', 'a2a', 'daemon_wire']).optional().default('user')
        .describe('Kind of token (default user)'),
    name: z.string().max(100).optional()
        .describe('Label shown in token lists'),
    realm_ids: z.array(z.string().min(1)).min(1).optional()
        .describe('Realms a user token is limited to'),
    realm_id: RealmIdField,
    aud: z.string().optional()
        .describe('daemon_wire: audience (daemon id)'),
    run_id: z.string().optional()
        .describe('daemon_wire: run the token is for'),
    action: z.enum(['execute', 'cancel', 'access']).optional()
        .describe('daemon_wire: allowed action'),
    permissions: TokenPermissions,
}).superRefine((val, ctx) => {
    if ((val.type === 'a2a' || val.type === 'daemon_wire') && !val.realm_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `realm_id is required when type is ${val.type}`, path: ['realm_id'] });
    }
});
export type TokensGenerateInput = z.infer<typeof TokensGenerateInput>;

/** POST /v1/auth/get_tokens */
export const TokensGetInput = z.object({
    type: z.enum(['user', 'realm']).optional().default('user')
        .describe('Personal tokens or a realm\'s tokens (default user)'),
    realm_id: RealmIdField,
    query: z.string().trim().min(1).max(200).optional()
        .describe('Match on token name (Core\'s `query`)'),
    limit: z.number().int().min(1).max(100).optional()
        .describe('Page size (max 100)'),
    offset: z.number().int().min(0).optional()
        .describe('Zero-based page offset'),
});
export type TokensGetInput = z.infer<typeof TokensGetInput>;

/** POST /v1/auth/revoke_token */
export const TokensRevokeInput = z.object({
    type: z.enum(['user', 'realm']).optional().default('user')
        .describe('Kind of token (default user)'),
    token_id: TokenIdField,
    realm_id: RealmIdField,
});
export type TokensRevokeInput = z.infer<typeof TokensRevokeInput>;

/** POST /v1/auth/rotate_token — a2a rotates the realm bearer (needs realm_id), others need token_id. */
export const TokensRotateInput = z.object({
    type: z.enum(['user', 'realm', 'a2a']).optional().default('user')
        .describe('Kind of token (default user)'),
    token_id: TokenIdField.optional(),
    realm_id: RealmIdField,
}).superRefine((val, ctx) => {
    if (val.type === 'a2a' && !val.realm_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'realm_id is required when type is a2a', path: ['realm_id'] });
    }
    if (val.type !== 'a2a' && !val.token_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'token_id is required when type is not a2a', path: ['token_id'] });
    }
});
export type TokensRotateInput = z.infer<typeof TokensRotateInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** A token's grant: domain allow-lists (`'*'` = all) and access levels per domain. */
export interface TokenPermissionsData {
    domains?: {
        orgs?: Array<string | '*'> | '*';
        scopes?: Array<string | '*'> | '*';
        realms?: Array<string | '*'> | '*';
    };
    access?: Partial<Record<string, Array<'read' | 'write' | 'admin'>>>;
}

/** One row of `get_tokens` (the secret is never listed). */
export interface TokenData {
    id: number;
    name: string;
    permissions: TokenPermissionsData;
    created_at: string;
    last_used_at: string | null;
}

/** `generate_token` — the secret, shown once. Fields by `type`. */
export interface TokensGenerateData {
    token: string;
    name: string;
    /** user / realm */
    id?: number;
    realm_ids: string[];
    /** a2a: the bearer (same as token) */
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
    /** daemon_wire: seconds until it expires */
    expires_in?: number;
}

/** `get_tokens` */
export interface TokensGetData {
    tokens: TokenData[];
    total: number;
}

/** `revoke_token` */
export interface TokensRevokeData {
    revoked: boolean;
}

/** `rotate_token` — the new secret, shown once. */
export interface TokensRotateData {
    token: string;
    /** a2a only */
    type?: 'a2a';
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
}
