import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);

/**
 * POST /v1/realm_runs/get — one page of a realm's runs plus the counts for
 * the state filters. BFF-only composition over existing Core routes:
 *   /v1/realms/get_by_id { slug, org_slug } → /v1/runs/get (page) +
 *   /v1/runs/get { limit: 1 } per count (all, running, awaiting_input, failed 7d).
 */
export const realm_runs_get_schema = z.object({
    org_slug: slug,
    slug,
    state: z.enum(['running', 'awaiting_input', 'failed', 'completed', 'cancelled']).optional()
        .describe('failed includes crashed.'),
    q: z.string().trim().min(1).max(200).optional().describe('Run name, id, ticket or team.'),
    since_ms: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
}).strict();

export type RealmRunsGetInput = z.infer<typeof realm_runs_get_schema>;
