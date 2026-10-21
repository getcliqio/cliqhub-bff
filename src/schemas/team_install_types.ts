/**
 * `POST /v1/realms/add_team` with `realm_ids` — install one published team into several realms
 * (pre-flight every realm, then one Core install per realm). Without `realm_ids` the body goes to
 * Core unchanged (`{ realm_id, scope, slug }`).
 */
import { z } from 'zod';

export const TeamInstallInput = z.object({
    scope: z.string().trim().min(1).describe('Team scope (published teams only)'),
    slug: z.string().trim().min(1).describe('Team name'),
    realm_ids: z.array(z.string().trim().min(1)).min(1).max(50).describe('Realms to install into; all are checked before any install'),
    version: z.string().trim().min(1).optional().describe('The version the realms run (default: the latest published)'),
}).strict();
export type TeamInstallInput = z.infer<typeof TeamInstallInput>;
