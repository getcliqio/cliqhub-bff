import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);

/**
 * POST /v1/realm_daemons/get — a realm's daemons with status counts, what
 * each is running, and how many of the realm's teams it has ready.
 * BFF-only composition over existing Core routes:
 *   /v1/realms/get_by_id → /v1/daemons/get { realm_id } + /v1/runs/get { running } +
 *   /v1/teams/get { realm_id } (coverage: installed daemon ids per team).
 */
export const realm_daemons_get_schema = z.object({
    org_slug: slug,
    slug,
    status: z.enum(['online', 'stale', 'offline']).optional(),
    q: z.string().trim().min(1).max(200).optional().describe('Name, hostname or id.'),
}).strict();

export type RealmDaemonsGetInput = z.infer<typeof realm_daemons_get_schema>;
