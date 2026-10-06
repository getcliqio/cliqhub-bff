/**
 * Build › Teams — the team list and one team's page, tab by tab (request schemas + response data).
 *
 * Routes (controllers/team_list_controller.ts, controllers/team_page_controller.ts):
 *   POST /v1/team_list/get — the caller's teams, status counts, phase shape, where installed
 *   POST /v1/team_page/get — one team: header + the data of one tab (`view`)
 *
 * BFF composition over Core: teams/get { mine }, teams/get_phases, teams/get_by_id,
 * runs/get { team_id }, runs/get_by_id, runs/get_status, realms/get, teams/get { realm_id }.
 */

import { z } from 'zod';
import type { RealmRunRowData } from './realm_runs_types.js';
import { sort_fields } from './list_sort.js';

// ─── Shared field fragments ─────────────────────────────────────────────────

const SlugField = z.string().trim().min(1).max(128);
const QField = z.string().trim().min(1).max(200).optional()
    .describe('Free-text match');
const LimitField = z.number().int().min(1).max(100).optional()
    .describe('Page size (max 100)');
const OffsetField = z.number().int().min(0).optional()
    .describe('Zero-based page offset');

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/team_list/get */
export const TeamListGetInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('Only this org\'s realms count for "installed in"'),
    scope: SlugField.optional()
        .describe('Only teams owned by this scope (the org\'s slug)'),
    status: z.enum(['all', 'published', 'draft']).optional()
        .describe('Lifecycle filter (default all)'),
    q: QField,
    limit: LimitField,
    offset: OffsetField,
    ...sort_fields(['name', 'status'], 'sorted in the BFF over the whole list (default: Core\'s order)'),
}).strict();
export type TeamListGetInput = z.infer<typeof TeamListGetInput>;

/** POST /v1/team_page/get — always the header; plus the data for `view`. */
export const TeamPageGetInput = z.object({
    scope: SlugField
        .describe('Team scope'),
    name: SlugField
        .describe('Team name'),
    view: z.enum(['overview', 'workflow', 'files', 'runs', 'installs', 'versions', 'settings']).default('overview')
        .describe('Tab to load'),
    version: z.string().trim().min(1).max(64).optional()
        .describe('This published version; latest when omitted'),
    org_id: z.string().uuid().optional()
        .describe('runs / installs: only this org'),
    run_id: z.string().trim().min(1).max(128).optional()
        .describe('workflow: overlay this run\'s phase status ("latest" = newest run)'),
    compare_from: z.string().trim().min(1).max(64).optional()
        .describe('versions: compare from this version'),
    compare_to: z.string().trim().min(1).max(64).optional()
        .describe('versions: compare to this version'),
    state: z.enum(['running', 'awaiting_input', 'failed']).optional()
        .describe('runs: only runs in this state'),
    realm_id: z.string().trim().min(1).max(128).optional()
        .describe('runs: only this realm'),
    q: QField,
    limit: LimitField,
    offset: OffsetField,
    ...sort_fields(['run_name', 'state', 'team', 'started_at', 'last_updated_at'], 'runs view only (Core runs/get; default last_updated_at desc)'),
}).strict();
export type TeamPageGetInput = z.infer<typeof TeamPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One workflow phase, normalized from the version's workflow. */
export interface TeamPhaseData {
    name: string;
    /** standard | gate | pull | push | team (Core may add more; unknown types pass through). */
    type: string;
    agent: string | null;
    depends_on: string[];
    /** Human review on this phase. */
    review: boolean;
    reviewers: string | null;
    max_iterations: number | null;
    commands: string[];
    sources: string[];
    targets: string[];
    /** Sub-team reference for `team` phases. */
    team: string | null;
    /** Role brief (markdown) when the version ships one for this phase; null otherwise. */
    role: string | null;
    support: boolean;
}

/** One declared team input. */
export interface TeamInputData {
    name: string;
    description: string | null;
    required: boolean;
    default: string | null;
}

/** The team in one realm: version, whether it is behind, daemon coverage. */
export interface TeamInstallData {
    realm_id: string;
    realm_slug: string;
    realm_name: string;
    org_slug: string | null;
    version: string | null;
    /** A newer published version exists than the one in this realm. */
    behind: boolean;
    in_team_list: boolean;
    installed_count: number;
    online_daemon_count: number;
    last_run_at: number | null;
    missing_agents: string[];
}

/** One team row: status, phase shape and the realms it is installed in. */
export interface TeamListRowData {
    id: string | null;
    name: string;
    scope: string | null;
    description: string;
    status: 'draft' | 'published';
    latest_version: string | null;
    author: string | null;
    /** Phase types in workflow order (null when the phases could not be read). */
    phase_types: string[] | null;
    /** Builder kinds (agent, gate, human, connector, fetch, script, team), same order. */
    phase_kinds: string[] | null;
    /** Phase names, same order (for the list's per-phase tooltip). */
    phase_names: string[] | null;
    installs: TeamInstallData[];
}

/** `team_list/get` — one page of the caller's teams with status counts. */
export interface TeamListData {
    items: TeamListRowData[];
    total: number;
    offset: number;
    limit: number;
    counts: { all: number; published: number; draft: number };
    /** Realms looked at for "installed in" (capped) vs. realms the viewer has. */
    realms_checked: number;
    realms_total: number;
    partial: boolean;
    /** `sort_by` keys this list accepts. */
    sortable: string[];
}

/** One published version. */
export interface TeamReleaseData {
    version: string;
    changelog: string | null;
    published_at: number | null;
    is_latest: boolean;
}

/** The team page header (identity, versions, permissions). */
export interface TeamHeaderData {
    id: string;
    name: string;
    scope: string | null;
    label: string;
    description: string;
    status: 'draft' | 'published';
    latest_version: string | null;
    /** Version this page shows. */
    version: string | null;
    versions: TeamReleaseData[];
    author: string | null;
    listed: boolean;
    tags: string[];
    can_edit: boolean;
    can_delete: boolean;
    can_toggle_listing: boolean;
    /** When the team's unversioned working copy was saved (editors only); null when there is none. */
    draft_saved_at: string | null;
}

/** A run of the team, with its realm link. */
export interface TeamRunRowData extends RealmRunRowData {
    realm_id: string | null;
    realm_slug: string | null;
    org_slug: string | null;
}

/** One difference between two versions (versions tab compare). */
export interface TeamChangeData {
    kind: 'added' | 'removed' | 'changed';
    target: 'phase' | 'role' | 'inputs';
    name: string;
    detail: string;
}

/** Tab of the team page; only that tab's section is filled. */
export type TeamPageView = 'overview' | 'workflow' | 'files' | 'runs' | 'installs' | 'versions' | 'settings';

/** `team_page/get` — header, counts and the requested tab's data. */
export interface TeamPageData {
    team: TeamHeaderData;
    counts: { phases: number; versions: number; runs: number | null };
    view: TeamPageView;
    overview?: {
        phases: TeamPhaseData[];
        support: TeamPhaseData[];
        inputs: TeamInputData[];
        agents: string[];
        latest: TeamReleaseData | null;
        installs: TeamInstallData[];
    };
    workflow?: {
        phases: TeamPhaseData[];
        support: TeamPhaseData[];
        recent_runs: TeamRunRowData[];
        overlay: {
            run: TeamRunRowData;
            /** Version the run used (its graph may differ from the page's version). */
            version: string | null;
            phases: TeamPhaseData[] | null;
            statuses: Record<string, string>;
        } | null;
    };
    files?: { files: Array<{ path: string; kind: 'yaml' | 'md'; content: string }> };
    runs?: {
        items: TeamRunRowData[];
        total: number;
        offset: number;
        limit: number;
        counts: { all: number | null; running: number | null; awaiting_input: number | null; failed_7d: number | null };
        realms: Array<{ id: string; slug: string; name: string; org_slug: string | null }>;
        /** `sort_by` keys Core applies (lib/core_list.ts). */
        sortable: string[];
    };
    installs?: {
        items: TeamInstallData[];
        not_installed: Array<{ id: string; slug: string; name: string; org_slug: string | null }>;
        realms_checked: number;
        realms_total: number;
    };
    versions?: {
        items: TeamReleaseData[];
        compare: { from: string; to: string; changes: TeamChangeData[] } | null;
    };
    partial: boolean;
}
