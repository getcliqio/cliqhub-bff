/**
 * `POST /v1/realms/add_team` with `realm_ids` — install one published team into several realms
 * (pre-flight every realm, then one Core install per realm). Without `realm_ids` the body goes to
 * Core unchanged (`{ realm_id, team_id, version_id? }`). Teams and versions are named by id (PLAN-team-bundle S4.1).
 */
import { z } from 'zod';

export const TeamInstallInput = z.object({
    team_id: z.string().uuid().describe('Catalog team id (published teams only)'),
    realm_ids: z.array(z.string().trim().min(1)).min(1).max(50).describe('Realms to install into; all are checked before any install'),
    version_id: z.string().uuid().optional().describe('The version the realms run (default: the latest published)'),
}).strict();
export type TeamInstallInput = z.infer<typeof TeamInstallInput>;
