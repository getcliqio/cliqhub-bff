import { z } from 'zod';

/**
 * POST /v1/overview/get — cross-org start view for the signed-in user.
 *
 * BFF-only composition over existing Core routes:
 *   /v1/orgs/get { mine } → per org /internal/dashboard/summary + /internal/dashboard/realms.
 */
export const overview_get_schema = z.object({
    org_ids: z.array(z.string().uuid()).min(1).max(50).optional()
        .describe('Restrict the overview to these orgs (must be orgs the caller belongs to). Omit for all.'),
    inbox_seen_ms: z.number().int().nonnegative().optional()
        .describe('When the user last opened the inbox (unix ms); drives the bell count.'),
}).strict();

export type OverviewGetInput = z.infer<typeof overview_get_schema>;
