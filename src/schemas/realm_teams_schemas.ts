import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);

/**
 * POST /v1/realm_teams/get — teams in a realm with daemon coverage, the
 * counts behind the coverage chips and each team's latest published version.
 * BFF-only composition over existing routes:
 *   /v1/realms/get_by_id → /v1/teams/get { realm_id } (page + one per chip count) +
 *   /v1/teams/get_versions { latest_only } for published teams on the page.
 */
export const realm_teams_get_schema = z.object({
    org_slug: slug,
    slug,
    q: z.string().trim().min(1).max(200).optional(),
    coverage: z.enum(['full', 'partial', 'none']).optional().describe('Installed on every / some / no online daemon.'),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
}).strict();

export type RealmTeamsGetInput = z.infer<typeof realm_teams_get_schema>;
