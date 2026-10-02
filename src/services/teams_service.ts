/** Teams — one Core call per action, mapped to BFF data. Core enforces scope / ownership rules. */

import { get_logger } from '../lib/log.js';
import { core_sort, sortable_keys, type CoreSortRead } from '../lib/core_list.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { CoreCompatService } from './core_compat_service.js';
import type {
    TeamsGetInput, TeamsGetByIdInput, TeamsGetVersionsInput, TeamsGetPhasesInput,
    TeamsCreateInput, TeamsUpdateInput, TeamsPublishInput, TeamRefInput, TeamsDownloadInput,
    TeamsRenameInput,
    TeamsGetData, TeamDetailData, TeamsGetVersionsData, TeamsGetPhasesData, TeamMutationData,
    TeamsDownloadData, TeamsDeleteData,
} from '../schemas/teams_types.js';
import {
    to_teams_get_data, to_team_detail_data, to_teams_get_versions_data, to_teams_get_phases_data,
    to_team_mutation_data, to_teams_download_data, to_teams_delete_data,
} from '../mappers/teams_mapper.js';

const log = get_logger('svc.teams');

/** Team catalog reads and draft / publish / delete / rename writes. */
export class TeamsService {
    /**
     * @param _repo - Core team calls.
     * @param _compat - Core version check; catalog sort keys (Core API 6) are only sent to a Core that has them.
     */
    constructor(private readonly _repo: TeamsRepository, private readonly _compat?: CoreCompatService) {}

    /**
     * Catalog, realm roster or daemon inventory — `{ teams, total, limit, offset, sortable }`.
     * `sort_by` goes to Core only when it fits the mode and the running Core
     * supports it (Core answers 400 for a key from the other mode).
     */
    async get(input: TeamsGetInput, token?: string): Promise<TeamsGetData> {
        const { sort_by, sort_dir, ...filters } = input;
        // Daemon inventory and the caller's own (mine) list have no sort in Core.
        const read: CoreSortRead | null = filters.daemon_id || filters.mine ? null : filters.realm_id ? 'teams.get:realm' : 'teams.get:catalog';
        const api = read === 'teams.get:catalog' ? await this._compat?.api_version() ?? null : null;
        const sort = read ? core_sort(read, { sort_by, sort_dir }, {}, api) : {};
        const vo = await this._repo.get({ ...filters, ...sort }, token);
        return to_teams_get_data(vo, read ? sortable_keys(read, api) : []);
    }

    /** One team with versions, manifest and the caller's edit rights. */
    async get_by_id(input: TeamsGetByIdInput, token?: string): Promise<TeamDetailData> {
        return to_team_detail_data(await this._repo.get_by_id(input, token));
    }

    /** Published versions of a team (or only the latest). */
    async get_versions(input: TeamsGetVersionsInput, token?: string): Promise<TeamsGetVersionsData> {
        return to_teams_get_versions_data(await this._repo.get_versions(input, token));
    }

    /** The workflow phases of one team version. */
    async get_phases(input: TeamsGetPhasesInput, token?: string): Promise<TeamsGetPhasesData> {
        return to_teams_get_phases_data(await this._repo.get_phases(input, token));
    }

    /** Creates a draft team in a scope. */
    async create(input: TeamsCreateInput, token: string): Promise<TeamMutationData> {
        const data = to_team_mutation_data(await this._repo.create(input, token));
        log.info('team_created', { team_id: data.id, name: data.name, scope: data.scope });
        return data;
    }

    /** Edits the draft (patch-bumped unless `bump` says otherwise). */
    async update(input: TeamsUpdateInput, token: string): Promise<TeamMutationData> {
        return to_team_mutation_data(await this._repo.update(input, token));
    }

    /** A team package (base64 zip) for one version. */
    async download(input: TeamsDownloadInput, token: string): Promise<TeamsDownloadData> {
        return to_teams_download_data(await this._repo.download(input, token));
    }

    /** Publishes a version (auto-bumped when `version` is omitted). */
    async publish(input: TeamsPublishInput, token: string): Promise<TeamMutationData> {
        const data = to_team_mutation_data(await this._repo.publish(input, token));
        log.info('team_published', { team_id: data.id, name: data.name, scope: data.scope, version: data.version });
        return data;
    }

    /** Takes a team back to draft. */
    async unpublish(input: TeamRefInput, token: string): Promise<TeamMutationData> {
        const data = to_team_mutation_data(await this._repo.unpublish(input, token));
        log.info('team_unpublished', { team_id: data.id, name: data.name, scope: data.scope });
        return data;
    }

    /** Deletes a team by id or by name (+ scope). */
    async delete(input: TeamRefInput, token: string): Promise<TeamsDeleteData> {
        const data = to_teams_delete_data(await this._repo.delete(input, token));
        log.info('team_deleted', { team_id: input.team_id, name: input.name, scope: input.scope });
        return data;
    }

    /** Renames a team within its scope. */
    async rename(input: TeamsRenameInput, token: string): Promise<TeamMutationData> {
        const data = to_team_mutation_data(await this._repo.rename(input, token));
        log.info('team_renamed', { team_id: data.id, from: input.name, name: data.name, scope: data.scope });
        return data;
    }
}
