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

/** Workflow features a marketplace team can be filtered by (builder phase kinds). */
export const CATALOG_HAS = ['human', 'gate', 'team', 'connector'] as const;
export type CatalogHas = (typeof CATALOG_HAS)[number];

/**
 * POST /v1/team_list/get — `source: 'mine'` (default) is the caller's teams;
 * `source: 'catalog'` is the marketplace: every team the caller can see, with
 * facet counts, filtered and sorted in the BFF.
 */
export const TeamListGetInput = z.object({
    source: z.enum(['mine', 'catalog']).optional()
        .describe("'mine' (default): the caller's teams; 'catalog': the marketplace"),
    org_id: z.string().uuid().optional()
        .describe('mine: only this org\'s realms count for "installed in"'),
    scope: SlugField.optional()
        .describe('Only teams owned by this scope (mine: the org\'s slug; catalog: the publisher)'),
    status: z.enum(['all', 'published', 'draft']).optional()
        .describe('mine: lifecycle filter (default all)'),
    tags: z.array(SlugField).max(20).optional()
        .describe('catalog: teams with any of these tags (categories)'),
    verified: z.boolean().optional()
        .describe('catalog: only teams from verified publishers'),
    has: z.array(z.enum(CATALOG_HAS)).max(4).optional()
        .describe('catalog: teams whose workflow has all of these (human review, gate, sub-team, connector)'),
    realm_id: z.string().trim().min(1).max(128).optional()
        .describe('catalog: show install state in this realm'),
    runnable: z.boolean().optional()
        .describe('catalog (with realm_id): only teams installed there on an online daemon with every agent set up'),
    q: QField,
    limit: LimitField,
    offset: OffsetField,
    ...sort_fields(['name', 'status', 'popular', 'newest', 'updated'], 'sorted in the BFF over the whole list; mine: name | status (default Core\'s order); catalog: popular (default) | newest | updated | name'),
}).strict();
export type TeamListGetInput = z.infer<typeof TeamListGetInput>;

/** POST /v1/team_page/get — always the header; plus the data for `view`. */
export const TeamPageGetInput = z.object({
    scope: SlugField
        .describe('Team scope'),
    name: SlugField
        .describe('Team name'),
    view: z.enum(['overview', 'workflow', 'files', 'runs', 'installs', 'versions', 'settings', 'run']).default('overview')
        .describe('Tab to load; `run` is the New run form (realms it can run in, inputs, human phases, the realm\'s people and channels)'),
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
        .describe('runs: only this realm; run: the realm to start in (default: the first it is installed in)'),
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
    /** Input type when declared (e.g. `channel`); null for free text. */
    type: string | null;
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
    installs: TeamInstallData[];
    /** catalog: marketplace details. */
    catalog?: TeamCatalogRowData;
}

/** Marketplace details of one team (team_list/get source catalog). */
export interface TeamCatalogRowData {
    tags: string[];
    install_count: number;
    version_count: number;
    fork_count: number;
    verified: boolean;
    /** Unix ms. */
    updated_at: number | null;
    /** Workflow features present (human, gate, team, connector). */
    has: CatalogHas[];
    /** Installed in the requested realm, on an online daemon, with every agent set up. */
    runnable: boolean;
    /** Slugs of the caller's orgs whose team library has this team. */
    in_orgs: string[];
}

/** Facet counts over the marketplace teams matching the search text. */
export interface TeamCatalogFacetsData {
    tags: { tag: string; count: number }[];
    publishers: { scope: string; count: number; verified: boolean }[];
    has: Record<CatalogHas, number>;
    verified: number;
    /** Installed in the requested realm (null without realm_id). */
    installed: number | null;
    runnable: number | null;
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
    /** catalog: facet counts. */
    facets?: TeamCatalogFacetsData;
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
    /** Where this team was forked from (origin hidden or gone → null name/scope); null for an original. */
    forked_from: { team_id: string; scope: string | null; name: string | null; version: string | null; latest_version: string | null } | null;
    /** How many teams were forked from this one. */
    fork_count: number;
    /** When the unversioned working copy was last saved (editors only); null when there is none. */
    draft_saved_at: string | null;
    /** The caller's orgs and whether each has the team (null when they could not be read). */
    orgs: TeamOrgStateData[] | null;
}

/** One of the caller's orgs and the team's place in it. */
export interface TeamOrgStateData {
    org_id: string;
    org_slug: string;
    org_name: string;
    /** The caller's role in the org. */
    role: string;
    /** In the org's team library. */
    in_library: boolean;
    /** One of the org's scopes owns the team. */
    own: boolean;
    added_at: string | null;
    added_by: string | null;
    /** The org's realms whose team list has the team. */
    realms: Array<{ realm_id: string; slug: string }>;
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
export type TeamPageView = 'overview' | 'workflow' | 'files' | 'runs' | 'installs' | 'versions' | 'settings' | 'run';

/** A human phase of the team and who reviews it by default. */
export interface TeamHumanPhaseData {
    name: string;
    /** The manifest's reviewers expression or list, as written (null when none). */
    default_reviewers: string | null;
}

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
    /** The New run form. */
    run?: {
        /** Realms the team is installed in (or listed for). */
        realms: TeamInstallData[];
        /** The realm the form starts in (null when it is installed nowhere). */
        realm_id: string | null;
        inputs: TeamInputData[];
        human_phases: TeamHumanPhaseData[];
        /** People who can review in that realm. */
        people: Array<{ username: string; role: string }>;
        /** Notification channels of that realm. */
        channels: Array<{ name: string; enabled: boolean; types: string[] }>;
    };
    partial: boolean;
}
