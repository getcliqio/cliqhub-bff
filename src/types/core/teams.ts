/**
 * Teams — response shapes as Core sends them (`/v1/teams/*`).
 * Mirrors Core `schemas/team_types.ts` (`TeamData`, `TeamMutationData`, …).
 */

import type { PagedData } from '../api_response.js';

/**
 * Core `TeamData` — one shape for catalog, realm and daemon modes.
 * Realm mode: `id` is the catalog team id of a published team (install with it).
 */
export interface TeamVO {
    id?: string;
    name: string;
    scope: string | null;
    version?: string | null;
    /** Realm mode: the id of the version the realm runs (null when not on its list). */
    version_id?: string | null;
    description?: string;
    status?: 'draft' | 'published';
    visibility?: string;
    listed?: boolean;
    tags?: string[];
    author?: string | null;
    latest_version?: string;
    install_count?: number;
    /** Site-admin catalog listing only. */
    version_count?: number;
    /** Site-admin catalog listing only. */
    author_id?: string | null;
    created_at?: number;
    updated_at?: number;
    // Realm coverage (realm_id mode)
    installed_daemon_ids?: string[];
    installed_count?: number;
    online_daemon_count?: number;
    coverage_label?: string;
    /** Realm mode: online daemons not on the realm's version; null when the team isn't on the realm's list. */
    online_stale?: number | null;
    /** Unpinned sub-teams with a newer published version than the realm's tree has (S8); absent on older Core builds. */
    sub_team_updates?: number | null;
    /** Realm mode: daemons that have the realm's version installed. */
    current_daemon_ids?: string[];
    missing_agents?: string[];
    origin?: 'hub' | 'cli';
    in_team_list?: boolean;
    last_run_at?: number | null;
    /** Realm mode: the most recent run started directly (no parent run: not as another team's sub-team); absent on older Core. */
    last_direct_run_at?: number | null;
    slug?: string;
    label?: string;
    sample_team_id?: string | null;
    /** Realm mode: team.yml `use_when` / `not_for` of the realm's version (else the latest). */
    use_when?: string[];
    not_for?: string[];
    /** Realm mode: the inputs a run must be given (required, no default). */
    required_inputs?: Array<{ name: string; description: string | null }>;
    /** The latest published version's sub-team calls (`with_sub_teams`), or a realm's installed tree (realm mode) — S9. */
    sub_teams?: Array<SubTeamCallVO & { parent_version_id?: string; version_id?: string; version?: string }>;
}

/** `teams/get` in every mode. */
export type TeamsGetVO = PagedData<TeamVO>;

/** One published version. */
export interface TeamVersionVO {
    /** What `realms/add_team` takes as `version_id`. */
    id: string;
    version: string;
    changelog: string | null;
    /** Core sends the publish date (an ISO string); older payloads carried Unix ms. */
    published_at: string | number | null;
}

/** `teams/get_by_id` */
/** One sub-team call of a version, as CliqHub recorded it at publish (PLAN-team-bundle S8). */
export interface SubTeamCallVO {
    phase: string;
    /** As written: `@acme/leaf` or `@acme/leaf@1.0.0`. */
    ref: string;
    /** The called team; null when it isn't on CliqHub (yet), or the publisher couldn't see it. */
    team_id: string | null;
    /** The pinned version; null when the call takes the latest. */
    pinned_version_id: string | null;
    /** From a dynamic map's `teams:` list: called only for items that name it. */
    may_call: boolean;
}

export interface TeamDetailVO {
    id: string;
    name: string;
    scope: string | null;
    description: string;
    license: string;
    visibility: 'public' | 'private' | 'draft';
    status: 'draft' | 'published';
    author: string | null;
    author_id: string | null;
    latest_version: string;
    install_count: number;
    tags: string[];
    created_at: number;
    updated_at: number;
    versions: TeamVersionVO[];
    roles: { name: string; content_md: string }[];
    workflow: { phases: unknown[]; support?: unknown[] };
    agents: Record<string, unknown>;
    readme: string;
    cliq_version: string | null;
    tools: string[];
    inputs?: { name: string; description?: string }[];
    use_when?: string[];
    not_for?: string[];
    listed: boolean;
    raw_manifest: string | null;
    /** The shown version's sub-team calls (S8); absent on older Core builds. */
    sub_teams?: SubTeamCallVO[];
    /** Teams whose latest version calls this one, that the caller can read (S9); absent on older Core builds. */
    used_by?: Array<{ id: string; scope: string | null; name: string; latest_version: string }>;
    /** The version shown (its files: `teams/files/get`); null when the team has none. */
    version_id?: string | null;
    /** Working copy (editors only); absent on older Core builds. */
    /** The open draft, shown to editors (PLAN-team-bundle S1.3c). */
    draft?: { version_id: string; saved_at: string | null; based_on?: { version_id: string; version: string } | null } | null;
    can_edit?: boolean;
    can_delete?: boolean;
    can_toggle_listing?: boolean;
}

/** Core `TeamMutationData` */
export interface TeamMutationVO {
    id: string;
    name: string;
    scope: string;
    status: 'draft' | 'published';
    version: string | null;
    listed?: boolean;
    /** `teams/create`: the team's first draft. */
    version_id?: string;
}

/** `teams/download` — the archive, base64. */
export interface TeamsDownloadVO {
    filename: string;
    data_base64: string;
    version: string;
    version_id: string;
    /** A daemon installing (PLAN-team-bundle S4.2). */
    team_id?: string;
    scope?: string | null;
    name?: string;
    daemon_team_id?: string;
}

/** `teams/delete`. */
export interface TeamsDeleteVO {
    deleted: boolean;
}

/** Core `TeamsGetVersionsData` — `version` with latest_only, else `latest` + `versions`. */
export interface TeamsGetVersionsVO {
    name: string;
    scope: string | null;
    latest?: string | null;
    version?: string | null;
    versions?: TeamVersionVO[];
}

/** Core `TeamsGetPhasesData` */
/** `teams/files/get` with `content: true` — a version's files (PLAN-team-bundle §2.2). */
export interface TeamsFilesGetVO {
    files: Array<{ id: string; path: string; size: number; sha256: string; content_type?: string; content?: string }>;
}

export interface TeamsGetPhasesVO {
    team_id: string;
    version_id: string | null;
    version: string | null;
    phases: Record<string, unknown>[];
}
