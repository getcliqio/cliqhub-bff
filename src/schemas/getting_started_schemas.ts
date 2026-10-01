import { z } from 'zod';

/**
 * POST /v1/getting_started/get — onboarding progress for the signed-in user.
 *
 * BFF-only composition over existing routes:
 *   /v1/orgs/get { mine } → per org /internal/dashboard/realms + /v1/runs/get { org_id, limit: 1 }
 *   → /v1/teams/get { realm_id, limit: 1 } for realms until one has a team.
 */
export const getting_started_get_schema = z.object({}).strict();
