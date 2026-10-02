/**
 * Admin mode (site admins) — request schemas (Zod, SoT for inbound bodies) and response data types.
 *
 * Naming: PascalCase Zod value + type with the same name; responses are `*Data`.
 * Every input field has `.describe(…)`.
 *
 * Routes (controllers/admin_home_controller.ts, controllers/admin_list_controller.ts):
 *   POST /v1/admin_home/get — hub counts, attention items, recent audit
 *   POST /v1/admin_list/get — one admin list (by `kind`) with per-filter chip counts
 *
 * BFF composition over Core: users/get, orgs/get, teams/get, daemons/get,
 * realms/get, runs/get, runs/get_logs, workspaces/get, orgs/get_scopes,
 * /internal/reports/audit.
 */

import { z } from 'zod';
import type { UserStatus } from './users_types.js';
import type { CoreCompatData } from './health_types.js';
import { sort_fields } from './list_sort.js';

// ─── Shared field fragments ─────────────────────────────────────────────────

const QueryField = z.string().trim().max(200).optional()
    .describe('Free-text match');
const OrgIdField = z.string().uuid().optional()
    .describe('Only this org (org picker)');
const limit_field = (dflt: number, max = 100) => z.number().int().min(1).max(max).default(dflt)
    .describe(`Page size (default ${dflt}, max ${max})`);
const OffsetField = z.number().int().min(0).default(0)
    .describe('Zero-based page offset');

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/admin_home/get — no input (extra fields are ignored). */
export const AdminHomeGetInput = z.object({}).passthrough()
    .describe('No fields');
export type AdminHomeGetInput = z.infer<typeof AdminHomeGetInput>;

/** POST /v1/admin_list/get — one admin list (discriminated by `kind`) with per-filter counts. */
export const AdminListGetInput = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('accounts').describe('Hub user accounts'),
        filter: z.enum(['all', 'admins', 'suspended']).default('all')
            .describe('Account chip'),
        include_deleted: z.boolean().optional()
            .describe('Also list soft-deleted accounts (sent to Core users/get as include_deleted)'),
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['username', 'role', 'created_at', 'suspended_at']),
    }),
    z.object({
        kind: z.literal('daemons').describe('Daemons across the hub'),
        filter: z.enum(['all', 'online', 'stale', 'offline']).default('all')
            .describe('Daemon status chip'),
        org_id: OrgIdField,
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['name', 'status', 'last_heartbeat']),
    }),
    z.object({
        kind: z.literal('teams').describe('Team inventory (marketplace listing)'),
        filter: z.enum(['listed', 'unlisted']).default('listed')
            .describe('Listed in the marketplace or not'),
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['name', 'install_count', 'created_at', 'updated_at']),
    }),
    z.object({
        kind: z.literal('audit').describe('Admin audit log'),
        filter: z.enum(['all']).default('all')
            .describe('Only "all"'),
        since_ms: z.number().int().min(0).optional()
            .describe('Only entries at or after this time (unix ms; Core API 3)'),
        action: z.string().trim().max(100).optional()
            .describe('Only this audit action (e.g. user.suspend)'),
        target_type: z.string().trim().max(50).optional()
            .describe('Only this target type (e.g. user)'),
        target_id: z.string().trim().max(200).optional()
            .describe('Only this target id (Core API 3)'),
        admin_id: z.string().uuid().optional()
            .describe('Only actions by this admin'),
        limit: limit_field(50),
        offset: OffsetField,
        ...sort_fields(['created_at', 'action']),
    }),
    z.object({
        kind: z.literal('realms').describe('Realms across the hub'),
        filter: z.enum(['all']).default('all')
            .describe('Only "all"'),
        org_id: OrgIdField,
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['slug', 'name', 'created_at', 'updated_at', 'created_by']),
    }),
    z.object({
        kind: z.literal('workspaces').describe('Workspaces across the hub'),
        filter: z.enum(['all']).default('all')
            .describe('Only "all"'),
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['name', 'created_at']),
    }),
    z.object({
        kind: z.literal('runs').describe('Runs across the hub'),
        filter: z.enum(['all', 'running', 'awaiting_input', 'failed', 'completed']).default('all')
            .describe('Run state chip (failed includes crashed)'),
        range: z.enum(['24h', '7d', '30d', 'all']).default('24h')
            .describe('Started within this window'),
        org_id: OrgIdField,
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['run_name', 'state', 'team', 'started_at', 'last_updated_at']),
    }),
    z.object({
        kind: z.literal('logs').describe('Run log lines across the hub'),
        filter: z.enum(['all', 'error', 'warn', 'info', 'debug']).default('all')
            .describe('Log level chip'),
        range: z.enum(['1h', '24h', '7d', 'all']).default('24h')
            .describe('Logged within this window'),
        query: QueryField,
        run_id: z.string().trim().max(200).optional()
            .describe('Only this run\'s lines'),
        org_id: OrgIdField,
        realm_id: z.string().trim().max(200).optional()
            .describe('Only lines from this realm'),
        team: z.string().trim().max(200).optional()
            .describe('Only lines from runs of this team'),
        daemon_id: z.string().trim().max(200).optional()
            .describe('Only lines from this daemon'),
        limit: limit_field(100, 200),
        offset: OffsetField,
    }),
    z.object({
        kind: z.literal('scopes').describe('Scopes (publishers)'),
        filter: z.enum(['all']).default('all')
            .describe('Only "all"'),
        org_id: OrgIdField,
        query: QueryField,
        limit: limit_field(25),
        offset: OffsetField,
        ...sort_fields(['slug', 'visibility', 'team_count', 'created_at']),
    }),
]);
export type AdminListGetInput = z.infer<typeof AdminListGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** Realm link target for runs / logs rows. */
export interface AdminRealmRef { id: string; slug: string; org_slug: string | null }

/** `accounts` row; `username` is null for someone invited by email who has not accepted. */
export interface AdminAccountRowData {
    id: string; username: string | null; display_name: string; email: string;
    role: 'user' | 'admin'; status: UserStatus; suspended_at: string | null; deleted_at: string | null; created_at: string | null;
}
/** `daemons` row with the realms it serves. */
export interface AdminDaemonRowData {
    id: string; name: string | null; hostname: string | null; status: string;
    last_heartbeat: number | null; capacity: number | null;
    realms: Array<{ id: string; slug: string; org_slug: string | null; name: string }>;
}
/** `teams` row (marketplace inventory). */
export interface AdminTeamRowData {
    id: string; name: string; scope: string | null; description: string | null;
    visibility: string; listed: boolean; install_count: number;
    /** Number of versions; null when Core doesn't send it (TeamData has none). */
    version_count: number | null;
    author_username: string | null; updated_at: string | null;
    /** Listed in the Marketplace but nothing installable. */
    listed_without_version: boolean;
}
/** `audit` row (also the admin home's recent audit). */
export interface AdminAuditRowData {
    id: string; admin_id: string; admin_username: string | null; action: string;
    target_type: string; target_id: string; details: Record<string, unknown>; created_at: string;
}
/** `realms` row. */
export interface AdminRealmRowData {
    id: string; slug: string; name: string; org_slug: string | null;
    created_by_username: string | null; created_at: number | null;
}
/** `workspaces` row with its daemon and latest run. */
export interface AdminWorkspaceRowData {
    id: string; name: string | null; path: string; daemon_id: string | null; daemon_name: string | null;
    teams: string[]; active_runs: number; latest_run: { run_id: string; state: string; started_at: number | null } | null;
    updated_at: number | null;
}
/** `runs` row with a realm link. */
export interface AdminRunRowData {
    run_id: string; run_name: string | null; state: string; team_label: string | null;
    daemon_id: string | null; workspace_name: string | null; started_at: number | null; last_updated_at: number | null;
    realm: AdminRealmRef | null;
}
/** `logs` row with a realm link. */
export interface AdminLogRowData {
    id: string; run_id: string; run_name: string | null; created_at: number; level: string; message: string;
    daemon_name: string | null; team: string | null; realm: AdminRealmRef | null;
}
/** `scopes` row. */
export interface AdminScopeRowData {
    id: string; slug: string; display_name: string; org_id: string | null; org_slug: string | null;
    owner_username: string | null; visibility: string; scope_type: string; team_count: number; created_at: string | null;
}
/** Any admin list row (the `kind` of the list says which). */
export type AdminListRowData = AdminAccountRowData | AdminDaemonRowData | AdminTeamRowData | AdminAuditRowData
    | AdminRealmRowData | AdminWorkspaceRowData | AdminRunRowData | AdminLogRowData | AdminScopeRowData;

/** Org picker option. */
export interface AdminOrgOptionData { id: string; slug: string; display_name: string }

/** `admin_list/get` */
export interface AdminListData {
    kind: AdminListGetInput['kind'];
    filter: string;
    items: AdminListRowData[];
    total: number;
    limit: number;
    offset: number;
    /** Count per filter chip; null when Core can't answer it (older Core). */
    counts: Record<string, number | null>;
    /** False when Core only returns what the admin is a member of. */
    hub_wide: boolean;
    /** Daemons on an older Core: pick an org first. */
    needs_org: boolean;
    /** Filters this Core can't apply yet (dropped rather than silently ignored). */
    unsupported: string[];
    /** Daemons / realms / runs / scopes (hub-wide): orgs for the org picker. */
    org_options?: AdminOrgOptionData[];
    /** `sort_by` keys Core applies to this list today (lib/core_list.ts); the SPA shows sort headers only for these. */
    sortable: string[];
    /** Logs and audit: counts per value of each filter (org, realm, team, run, daemon / action, target type, admin). */
    facets?: Record<string, AdminFacetData[]>;
}

/** One value of a filter with how many rows have it. */
export interface AdminFacetData {
    value: string;
    label: string;
    count: number;
}

/** One "needs attention" card on the admin home. */
export interface AdminAttentionData {
    id: string;
    severity: 'error' | 'warn' | 'info';
    title: string;
    detail: string;
    href: string;
    action: string;
}

/** `admin_home/get` */
export interface AdminHomeData {
    core: CoreCompatData | null;
    hub_wide: boolean;
    counts: {
        accounts: number | null;
        suspended: number | null;
        admins: number | null;
        orgs: number | null;
        realms: number | null;
        daemons: { online: number; total: number; offline: number } | null;
        runs_24h: { total: number; failed: number } | null;
    };
    attention: AdminAttentionData[];
    recent_audit: AdminAuditRowData[];
    /** Some Core calls failed; numbers shown are what came back. */
    partial: boolean;
}
