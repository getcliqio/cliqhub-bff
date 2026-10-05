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
    missing_agents?: string[];
    origin?: 'published' | 'local';
    in_team_list?: boolean;
    last_run_at?: number | null;
    slug?: string;
    label?: string;
    sample_team_id?: string | null;
}

/** `teams/get` in every mode. */
export type TeamsGetVO = PagedData<TeamVO>;

/** One published version. */
export interface TeamVersionVO {
    version: string;
    changelog: string | null;
    published_at: number | null;
}

/** `teams/get_by_id` */
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
    team_json: string | null;
    /** Working copy (editors only); absent on older Core builds. */
    draft?: { manifest: string; description: string | null; saved_at: string | null } | null;
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
    draft_saved_at?: string | null;
}

/** `teams/download` — the archive, base64. */
export interface TeamsDownloadVO {
    filename: string;
    data_base64: string;
    version: string;
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
export interface TeamsGetPhasesVO {
    team_id: string;
    version_id: string | null;
    version: string | null;
    phases: Record<string, unknown>[];
}
