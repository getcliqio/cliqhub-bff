/**
 * Realm › Teams — a realm's teams with daemon coverage, the coverage-chip
 * counts and each team's latest published version (request schema + response data).
 *
 * Routes (controllers/realm_teams_controller.ts):
 *   POST /v1/realm_teams/get
 *
 * BFF composition over Core: `/v1/realms/get_by_id` → `/v1/teams/get { realm_id }` (page + one per
 * chip count) + `/v1/teams/get_versions { latest_only }` for published teams on the page.
 */

import { z } from 'zod';
import type { ControlRealmData } from './realm_inbox_types.js';
import { RealmRefFields } from './realm_ref.js';
import { sort_fields } from './list_sort.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_teams/get */
export const RealmTeamsGetInput = z.object({
    ...RealmRefFields,
    q: z.string().trim().min(1).max(200).optional()
        .describe('Match on team name'),
    coverage: z.enum(['full', 'partial', 'none']).optional()
        .describe('Installed on every / some / no online daemon'),
    limit: z.number().int().min(1).max(100).optional()
        .describe('Page size (max 100)'),
    offset: z.number().int().min(0).optional()
        .describe('Zero-based page offset'),
    ...sort_fields(['team', 'origin', 'coverage'], 'default team asc'),
}).strict();
export type RealmTeamsGetInput = z.infer<typeof RealmTeamsGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One team row: version / update hint and daemon coverage. */
export interface RealmTeamRowData {
    scope: string | null;
    slug: string;
    label: string;
    version: string | null;
    latest_version: string | null;
    update_available: boolean;
    origin: 'published' | 'local';
    /** On the realm's team list (vs only found on a daemon). */
    in_team_list: boolean;
    /** Online realm daemons with this team installed / online daemons. */
    installed_count: number;
    online_daemon_count: number;
    last_run_at: number | null;
    missing_agents: string[];
}

/** `realm_teams/get` — one page of teams plus coverage-chip counts. */
export interface RealmTeamsData {
    realm: ControlRealmData;
    items: RealmTeamRowData[];
    total: number;
    offset: number;
    limit: number;
    counts: { all: number | null; full: number | null; partial: number | null; none: number | null };
    partial: boolean;
    /** `sort_by` keys Core applies (lib/core_list.ts). */
    sortable: string[];
}
