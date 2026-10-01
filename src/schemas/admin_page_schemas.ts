import { z } from 'zod';

/** POST /v1/admin_home/get — no input. */
export const admin_home_get_schema = z.object({}).passthrough();

/** POST /v1/admin_list/get — one admin list with per-filter counts. */
export const admin_list_get_schema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('accounts'),
        filter: z.enum(['all', 'admins', 'suspended']).default('all'),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('daemons'),
        filter: z.enum(['all', 'online', 'stale', 'offline']).default('all'),
        org_id: z.string().uuid().optional(),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('teams'),
        filter: z.enum(['listed', 'unlisted']).default('listed'),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('audit'),
        filter: z.enum(['all']).default('all'),
        since_ms: z.number().int().min(0).optional(),
        action: z.string().trim().max(100).optional(),
        target_type: z.string().trim().max(50).optional(),
        target_id: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('realms'),
        filter: z.enum(['all']).default('all'),
        org_id: z.string().uuid().optional(),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('workspaces'),
        filter: z.enum(['all']).default('all'),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('runs'),
        filter: z.enum(['all', 'running', 'awaiting_input', 'failed', 'completed']).default('all'),
        range: z.enum(['24h', '7d', '30d', 'all']).default('24h'),
        org_id: z.string().uuid().optional(),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('logs'),
        filter: z.enum(['all', 'error', 'warn', 'info', 'debug']).default('all'),
        range: z.enum(['1h', '24h', '7d', 'all']).default('24h'),
        query: z.string().trim().max(200).optional(),
        run_id: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
    }),
    z.object({
        kind: z.literal('scopes'),
        filter: z.enum(['all']).default('all'),
        org_id: z.string().uuid().optional(),
        query: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
    }),
]);

export type AdminListGetInput = z.infer<typeof admin_list_get_schema>;
