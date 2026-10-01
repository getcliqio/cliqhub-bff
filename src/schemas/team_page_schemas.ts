import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);
const uuid = z.string().uuid();

/**
 * POST /v1/team_list/get — Build › Teams. The caller's teams (optionally one
 * org's scope), status counts, each team's phase shape and the realms it is
 * installed in. BFF-only composition over existing Core routes:
 *   /v1/teams/get { mine } → /v1/teams/get_phases per team on the page →
 *   /v1/realms/get → /v1/teams/get { realm_id } per realm (capped).
 */
export const team_list_get_schema = z.object({
    org_id: uuid.optional().describe('View scope: only this org’s realms for “installed in”.'),
    scope: slug.optional().describe('View scope: only teams owned by this scope (the org’s slug).'),
    status: z.enum(['all', 'published', 'draft']).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
}).strict();
export type TeamListGetInput = z.infer<typeof team_list_get_schema>;

/**
 * POST /v1/team_page/get — one team, one tab. Always returns the header
 * (team, versions, permissions, tab counts) plus the data for `view`.
 * BFF-only composition over existing Core routes (teams/get_by_id,
 * teams/get_phases, runs/get { team_id }, runs/get_by_id, runs/get_status,
 * realms/get, teams/get { realm_id }).
 */
export const team_page_get_schema = z.object({
    scope: slug,
    name: slug,
    view: z.enum(['overview', 'workflow', 'files', 'runs', 'installs', 'versions', 'settings']).default('overview'),
    version: z.string().trim().min(1).max(64).optional().describe('Show this published version; latest when omitted.'),
    org_id: uuid.optional().describe('View scope for runs / installs.'),
    // workflow
    run_id: z.string().trim().min(1).max(128).optional().describe('Overlay this run’s phase status; "latest" = newest run of the team.'),
    // versions
    compare_from: z.string().trim().min(1).max(64).optional(),
    compare_to: z.string().trim().min(1).max(64).optional(),
    // runs
    state: z.enum(['running', 'awaiting_input', 'failed']).optional(),
    realm_id: z.string().trim().min(1).max(128).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
}).strict();
export type TeamPageGetInput = z.infer<typeof team_page_get_schema>;
