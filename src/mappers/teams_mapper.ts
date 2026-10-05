/**
 * Teams — Core VO → BFF data.
 * `teams/get` comes back from Core as `PagedData<TeamData>` in every mode;
 * clients get `{ teams, total, limit, offset }` with the catalog fields filled.
 */

import type {
    TeamVO, TeamsGetVO, TeamVersionVO, TeamDetailVO, TeamMutationVO, TeamsDownloadVO,
    TeamsDeleteVO, TeamsGetVersionsVO, TeamsGetPhasesVO,
} from '../types/core/teams.js';
import type {
    TeamListItemData, TeamsGetData, TeamVersionData, TeamDetailData, TeamMutationData,
    TeamsDownloadData, TeamsDeleteData, TeamsGetVersionsData, TeamsGetPhasesData,
} from '../schemas/teams_types.js';

/** Catalog / list team; `id` falls back to the daemon copy's `sample_team_id`, `slug` to the name. */
export function to_team_list_item_data(vo: TeamVO): TeamListItemData {
    return {
        id: vo.id ?? vo.sample_team_id ?? null,
        name: vo.name,
        slug: vo.slug ?? vo.name,
        scope: vo.scope,
        description: vo.description ?? '',
        author: vo.author ?? null,
        latest_version: vo.latest_version ?? vo.version ?? '',
        install_count: vo.install_count ?? 0,
        tags: vo.tags ?? [],
        listed: vo.listed,
        status: vo.status,
        updated_at: vo.updated_at,
        label: vo.label,
        origin: vo.origin,
        in_team_list: vo.in_team_list,
        installed_daemon_ids: vo.installed_daemon_ids,
        installed_count: vo.installed_count,
        online_daemon_count: vo.online_daemon_count,
        coverage_label: vo.coverage_label,
        missing_agents: vo.missing_agents,
        last_run_at: vo.last_run_at,
    };
}

/** `teams/get` page (`items`) → `{ teams, total, limit, offset }`. */
export function to_teams_get_data(vo: TeamsGetVO, sortable: string[] = []): TeamsGetData {
    return {
        teams: (vo.items ?? []).map(to_team_list_item_data),
        total: vo.total ?? 0,
        limit: vo.limit,
        offset: vo.offset,
        sortable,
    };
}

/** One published version. */
export function to_team_version_data(vo: TeamVersionVO): TeamVersionData {
    return { version: vo.version, changelog: vo.changelog, published_at: vo.published_at };
}

/** `teams/get_by_id` → full team; the `can_*` flags are true only when Core says so. */
export function to_team_detail_data(vo: TeamDetailVO): TeamDetailData {
    return {
        id: vo.id,
        name: vo.name,
        scope: vo.scope,
        description: vo.description,
        author: vo.author,
        author_id: vo.author_id,
        latest_version: vo.latest_version,
        install_count: vo.install_count,
        tags: vo.tags,
        listed: vo.listed,
        status: vo.status,
        license: vo.license,
        visibility: vo.visibility,
        created_at: vo.created_at,
        updated_at: vo.updated_at,
        versions: vo.versions.map(to_team_version_data),
        roles: vo.roles,
        workflow: vo.workflow,
        agents: vo.agents,
        readme: vo.readme,
        cliq_version: vo.cliq_version,
        tools: vo.tools,
        inputs: vo.inputs,
        use_when: vo.use_when,
        not_for: vo.not_for,
        raw_manifest: vo.raw_manifest ?? null,
        team_json: vo.team_json ?? null,
        draft: vo.draft?.manifest
            ? { manifest: vo.draft.manifest, description: vo.draft.description ?? null, saved_at: vo.draft.saved_at ?? null }
            : null,
        can_edit: vo.can_edit === true,
        can_delete: vo.can_delete === true,
        can_toggle_listing: vo.can_toggle_listing === true,
    };
}

/** Create / update / publish / unpublish / rename result. */
export function to_team_mutation_data(vo: TeamMutationVO): TeamMutationData {
    return {
        id: vo.id,
        name: vo.name,
        scope: vo.scope,
        status: vo.status,
        version: vo.version,
        listed: vo.listed,
        ...(vo.draft_saved_at !== undefined ? { draft_saved_at: vo.draft_saved_at } : {}),
    };
}

/** `teams/download` → the base64 archive. */
export function to_teams_download_data(vo: TeamsDownloadVO): TeamsDownloadData {
    return { filename: vo.filename, data_base64: vo.data_base64, version: vo.version };
}

/** `teams/delete` → `{ deleted }`. */
export function to_teams_delete_data(vo: TeamsDeleteVO): TeamsDeleteData {
    return { deleted: vo.deleted };
}

/** Core sends `version` with latest_only, `latest` otherwise — clients always get `version`. */
export function to_teams_get_versions_data(vo: TeamsGetVersionsVO): TeamsGetVersionsData {
    return {
        name: vo.name,
        scope: vo.scope,
        version: vo.version ?? vo.latest ?? null,
        versions: vo.versions?.map(to_team_version_data),
    };
}

/** `teams/get_phases` → a version's phases. */
export function to_teams_get_phases_data(vo: TeamsGetPhasesVO): TeamsGetPhasesData {
    return { team_id: vo.team_id, version_id: vo.version_id, version: vo.version, phases: vo.phases };
}
