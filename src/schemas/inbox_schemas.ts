import { z } from 'zod';

/**
 * POST /v1/inbox/get — the caller's in-app notifications across orgs.
 * BFF-only composition: /v1/orgs/get { mine } → per org /v1/notifications/get.
 */
export const inbox_get_schema = z.object({
    org_id: z.string().uuid().optional().describe('Limit to one org (must be a member).'),
    realm_id: z.string().trim().min(1).max(200).optional().describe('Limit to one realm (intersected with membership by Core).'),
    types: z.array(z.string().trim().min(1).max(120)).max(50).optional().describe('Exact event types.'),
    q: z.string().trim().min(1).max(200).optional().describe('Search title, message, event, team, run id.'),
    since_ms: z.number().int().nonnegative().optional(),
    until_ms: z.number().int().nonnegative().optional().describe('Cursor: pass next_until_ms from the previous page.'),
    limit: z.number().int().min(1).max(100).optional(),
}).strict();

export type InboxGetInput = z.infer<typeof inbox_get_schema>;
