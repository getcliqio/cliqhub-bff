/**
 * Teams — request schemas (Zod, SoT for inbound bodies) and response data types.
 *
 * Inputs mirror Core's `schemas/team_types.ts` (the BFF validates the same
 * body before forwarding). Naming: PascalCase Zod value + type with the same
 * name; responses are `*Data`. Every input field has `.describe(…)`.
 *
 * Routes (controllers/teams_controller.ts):
 *   POST /v1/teams/get           — catalog search; realm coverage (realm_id); daemon inventory (daemon_id)
 *   POST /v1/teams/get_by_id     — one team with its versions, roles, workflow
 *   POST /v1/teams/get_versions  — version history (or the latest only)
 *   POST /v1/teams/get_phases    — workflow phases of a version
 *   POST /v1/teams/create        — new draft team
 *   POST /v1/teams/update        — update a draft
 *   POST /v1/teams/download      — package of a version
 *   POST /v1/teams/publish       — publish a version
 *   POST /v1/teams/unpublish     — back to draft
 *   POST /v1/teams/delete        — soft-delete a team
 *   POST /v1/teams/build         — AI builder (schemas/builder_types.ts)
 */

import { z } from 'zod';

// ─── Shared field fragments ─────────────────────────────────────────────────

const NamePattern = /^[a-z][a-z0-9-]*$/;
const NameMessage = 'Team name must be lowercase letters, numbers, and hyphens, starting with a letter';

const ScopeField = z.string().optional()
    .describe('Scope (publisher) slug');

const TeamIdField = z.string().uuid().optional()
    .describe('Team UUID — alternative to name + scope');

const NameOrIdMessage = 'Either name or team_id is required';
const has_name_or_id = (d: { name?: string; team_id?: string }): boolean => Boolean(d.name) || Boolean(d.team_id);

// ─── Inputs ─────────────────────────────────────────────────────────────────

/**
 * POST /v1/teams/get — one list, three modes (all other fields are AND filters):
 *   - `daemon_id` → teams installed on that daemon
 *   - `realm_id`  → the realm's team roster with daemon coverage
 *   - neither     → hub catalog (site admins see every team)
 */
export const TeamsGetInput = z.object({
    query: z.string().optional()
        .describe('Match on team name or description'),
    tag: z.string().optional()
        .describe('Only teams with this tag'),
    scope: z.string().optional()
        .describe('Only teams in this scope'),
    mine: z.boolean().optional()
        .describe('Only teams the caller authored'),
    listed: z.boolean().optional()
        .describe('Only listed (true) or unlisted (false) teams'),
    status: z.enum(['draft', 'published']).optional()
        .describe('Only teams in this lifecycle status'),
    realm_id: z.string().min(1).optional()
        .describe('Realm mode: the realm roster with coverage'),
    daemon_id: z.string().min(1).optional()
        .describe('Daemon mode: teams installed on this daemon'),
    origin: z.enum(['hub', 'cli']).optional()
        .describe('Realm mode: Hub catalog teams or CLI-installed'),
    coverage: z.enum(['full', 'partial', 'none']).optional()
        .describe('Realm mode: coverage across the realm daemons'),
    sort_by: z.enum(['team', 'origin', 'coverage', 'name', 'install_count', 'created_at', 'updated_at']).optional()
        .describe('Sort key. Realm mode: team | origin | coverage. Catalog / site-admin mode: name | install_count | '
            + 'created_at | updated_at (Core API 6). Keys that don\'t fit the mode, or that this Core lacks, are not sent; '
            + 'the answer\'s `sortable` lists what applied'),
    sort_dir: z.enum(['asc', 'desc']).optional()
        .describe('Sort direction (default asc)'),
    limit: z.number().int().min(1).max(200).optional()
        .describe('Page size (default 50, max 200)'),
    offset: z.number().int().min(0).optional()
        .describe('Zero-based page offset'),
});
export type TeamsGetInput = z.infer<typeof TeamsGetInput>;

/** POST /v1/teams/get_by_id — by team_id, or by name (+ scope). */
export const TeamsGetByIdInput = z.object({
    name: z.string().optional()
        .describe('Team name'),
    scope: ScopeField,
    team_id: TeamIdField,
    version: z.string().optional()
        .describe('Load this published version instead of the latest'),
}).refine(has_name_or_id, { message: NameOrIdMessage });
export type TeamsGetByIdInput = z.infer<typeof TeamsGetByIdInput>;

/** POST /v1/teams/get_versions */
export const TeamsGetVersionsInput = z.object({
    name: z.string().min(1, 'Team name is required')
        .describe('Team name'),
    scope: ScopeField,
    latest_only: z.boolean().optional()
        .describe('Only the latest version, not the history'),
});
export type TeamsGetVersionsInput = z.infer<typeof TeamsGetVersionsInput>;

/** POST /v1/teams/get_phases */
export const TeamsGetPhasesInput = z.object({
    team_id: z.string().uuid()
        .describe('Team UUID'),
    version_id: z.string().uuid().optional()
        .describe('Version UUID; latest published when omitted'),
});
export type TeamsGetPhasesInput = z.infer<typeof TeamsGetPhasesInput>;

/** POST /v1/teams/create — the team and its first draft (team.yml + README.md, or a fork's files); returns its `version_id`. */
export const TeamsCreateInput = z.object({
    name: z.string().min(1, 'Team name is required').regex(NamePattern, NameMessage)
        .describe('Team name: lowercase letters, digits, hyphens; starts with a letter'),
    scope: z.string().min(1, 'Scope is required')
        .describe('Scope (publisher) slug the caller can write to'),
    description: z.string().optional()
        .describe('Short summary'),
    forked_from: z.object({
        team_id: z.string().min(1).describe('Team to copy'),
        version: z.string().optional().describe('Version to copy (default: its latest)'),
    }).optional()
        .describe('Fork: the draft starts from that version’s files under the new name, and records where it came from'),
    visibility: z.enum(['public', 'private']).optional()
        .describe('The visibility the team is meant for (default private); a fork of a private team can be public only for its scope\'s publishers'),
});
export type TeamsCreateInput = z.infer<typeof TeamsCreateInput>;

/**
 * POST /v1/teams/update: the description, or `save_as: 'discard'` deletes the draft `version_id`
 * (PLAN-team-bundle S1.3c). Files change only through `teams/files/upload`; a draft becomes a
 * version only through `teams/publish`.
 */
export const TeamsUpdateInput = z.object({
    name: z.string().optional()
        .describe('Team name (lookup)'),
    scope: ScopeField,
    team_id: TeamIdField,
    description: z.string().optional()
        .describe('New summary'),
    save_as: z.enum(['discard']).optional()
        .describe("'discard': delete the draft named by version_id"),
    version_id: z.string().uuid().optional()
        .describe('The draft to discard'),
}).refine(has_name_or_id, { message: NameOrIdMessage });
export type TeamsUpdateInput = z.infer<typeof TeamsUpdateInput>;

/** POST /v1/teams/publish — `visibility` must be public or private. */
export const TeamsPublishInput = z.object({
    name: z.string().regex(NamePattern, NameMessage).optional()
        .describe('Team name (lookup)'),
    scope: ScopeField,
    team_id: TeamIdField,
    version: z.string().optional()
        .describe('The version to publish: new and higher than every version so far (required with version_id)'),
    changelog: z.string().optional()
        .describe('Release notes'),
    description: z.string().optional()
        .describe('Summary to set on publish'),
    license: z.string().optional()
        .describe('SPDX license id'),
    tags: z.array(z.string()).optional()
        .describe('Tag slugs'),
    visibility: z.enum(['public', 'private']).optional()
        .describe('Visibility after publish'),
    version_id: z.string().uuid().optional()
        .describe('The draft to publish (its files uploaded with teams/files/upload; agents come from its team.yml); omit to only list the team again'),
}).refine(has_name_or_id, { message: NameOrIdMessage });
export type TeamsPublishInput = z.infer<typeof TeamsPublishInput>;

/** POST /v1/teams/unpublish, /v1/teams/delete — by team_id, or by name (+ scope). */
export const TeamRefInput = z.object({
    name: z.string().optional()
        .describe('Team name'),
    scope: ScopeField,
    team_id: TeamIdField,
}).refine(has_name_or_id, { message: NameOrIdMessage });
export type TeamRefInput = z.infer<typeof TeamRefInput>;

/** POST /v1/teams/download */
export const TeamsDownloadInput = z.object({
    version_id: z.string().uuid().optional()
        .describe('The version to download, by id (wins over name / scope / version)'),
    name: z.string().min(1).optional()
        .describe('Team name (required without version_id)'),
    scope: ScopeField,
    version: z.string().optional()
        .describe('Version to download; latest published when omitted'),
}).refine((d) => Boolean(d.version_id) || Boolean(d.name), { message: 'Provide version_id, or the team name' });
export type TeamsDownloadInput = z.infer<typeof TeamsDownloadInput>;


// ─── Response data ──────────────────────────────────────────────────────────

/**
 * One team in `teams/get`. Catalog fields are always set; the coverage
 * fields only in realm mode (`realm_id`).
 */
export interface TeamListItemData {
    /** Team UUID; in realm mode a representative team row (may be null for local installs). */
    id: string | null;
    name: string;
    /** Same as name; daemons and realms address teams by slug. */
    slug: string;
    scope: string | null;
    description: string;
    author: string | null;
    latest_version: string;
    install_count: number;
    tags: string[];
    listed?: boolean;
    status?: 'draft' | 'published';
    /** Unix ms. */
    updated_at?: number;
    // Realm mode
    label?: string;
    origin?: 'hub' | 'cli';
    in_team_list?: boolean;
    installed_daemon_ids?: string[];
    installed_count?: number;
    online_daemon_count?: number;
    coverage_label?: string;
    missing_agents?: string[];
    /** Unix ms. */
    last_run_at?: number | null;
}

/** `teams/get` — the same shape in every mode. */
export interface TeamsGetData {
    teams: TeamListItemData[];
    total: number;
    limit: number;
    offset: number;
    /** `sort_by` keys Core applies in this mode (lib/core_list.ts); empty in daemon / mine mode. */
    sortable: string[];
}

/** One published version. */
export interface TeamVersionData {
    /** What `realms/add_team` takes as `version_id` (PLAN-team-bundle S4.1). */
    id: string;
    version: string;
    changelog: string | null;
    /** Unix ms. */
    published_at: number | null;
}

/** `teams/get_by_id` */
export interface TeamDetailData {
    id: string;
    name: string;
    scope: string | null;
    description: string;
    author: string | null;
    author_id: string | null;
    latest_version: string;
    install_count: number;
    tags: string[];
    listed: boolean;
    status: 'draft' | 'published';
    license: string;
    visibility: 'public' | 'private' | 'draft';
    /** Unix ms. */
    created_at: number;
    /** Unix ms. */
    updated_at: number;
    versions: TeamVersionData[];
    roles: { name: string; content_md: string }[];
    workflow: { phases: unknown[]; support?: unknown[] };
    agents: Record<string, unknown>;
    readme: string;
    cliq_version: string | null;
    tools: string[];
    inputs?: { name: string; description?: string }[];
    use_when?: string[];
    not_for?: string[];
    /** Manifest YAML of the loaded version. */
    raw_manifest: string | null;
    /** The version shown, read from its files (PLAN-team-bundle S1.4b); null when the team has none. */
    version_id: string | null;
    /** The team's open draft — only for people who can edit it; null when there is none. */
    draft: TeamWorkingCopyData | null;
    /** What the caller may do with this team. */
    can_edit: boolean;
    can_delete: boolean;
    can_toggle_listing: boolean;
}

/** `teams/create`, `update`, `publish`, `unpublish` — the team after the write. */
export interface TeamMutationData {
    id: string;
    name: string;
    scope: string;
    status: 'draft' | 'published';
    version: string | null;
    listed?: boolean;
    /** teams/create: the team's first draft. */
    version_id?: string;
}

/** A team's open draft: a version not yet published (PLAN-team-bundle S1.3c); its files via `teams/files/get`. */
export interface TeamWorkingCopyData {
    version_id: string;
    saved_at: string | null;
    /** The published version it was started from ("Draft · based on 1.2.0", PLAN-team-bundle S3), when it was. */
    based_on: { version_id: string; version: string } | null;
}

/** `teams/download` */
export interface TeamsDownloadData {
    filename: string;
    /** The zip package, base64. */
    data_base64: string;
    version: string;
    /** The version's id. */
    version_id: string;
}

/** `teams/delete` */
export interface TeamsDeleteData {
    deleted: boolean;
}

/** `teams/get_versions` — `version` is always the latest (null when none). */
export interface TeamsGetVersionsData {
    name: string;
    scope: string | null;
    version: string | null;
    /** Full history, newest first (omitted with `latest_only`). */
    versions?: TeamVersionData[];
}

/** `teams/get_phases` */
export interface TeamsGetPhasesData {
    team_id: string;
    version_id: string | null;
    version: string | null;
    phases: Record<string, unknown>[];
}
