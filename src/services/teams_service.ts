import type { TeamsRepository } from '../repositories/teams_repository.js';
import type {
    TeamListResponseDTO, TeamDetailDTO,
    TeamDownloadResponseDTO,
    PublishResultDTO, DeleteTeamResultDTO,
    RenameTeamResultDTO,
    LatestVersionResponseDTO,
    MyTeamsAllResponseDTO,
} from '../types/dto.js';
import {
    to_team_list_response_dto, to_team_detail_dto,
    to_team_download_response_dto,
    to_publish_result_dto, to_delete_team_result_dto,
    to_rename_team_result_dto,
    to_latest_version_response_dto,
    to_my_teams_all_response_dto,
} from '../types/mappers.js';

export class TeamsService {
    private _teams_repo: TeamsRepository;

    constructor(teams_repo: TeamsRepository) {
        this._teams_repo = teams_repo;
    }

    async get(
        params: {
            tag?: string; query?: string; mine?: boolean; group_by_scope?: boolean;
            status?: string; limit?: number; offset?: number;
            realm_id?: string;
            daemon_id?: string;
            origin?: string;
            coverage?: string;
            sort_by?: string;
            sort_dir?: string;
        },
        token?: string,
    ): Promise<TeamListResponseDTO | MyTeamsAllResponseDTO | Record<string, unknown>> {
        const vo = await this._teams_repo.get(params, token);
        /** Live daemon inventory / realm coverage — pass through (no catalog mapper). */
        if (params.daemon_id || params.realm_id) {
            return vo as unknown as Record<string, unknown>;
        }
        if (params.mine && params.group_by_scope && 'scopes' in vo) {
            return to_my_teams_all_response_dto(vo as any);
        }
        return to_team_list_response_dto(vo as any);
    }

    async get_by_id(
        params: { name?: string; scope?: string; version?: string; team_id?: string },
        token?: string,
    ): Promise<TeamDetailDTO> {
        const vo = await this._teams_repo.get_by_id(params, token);
        return to_team_detail_dto(vo);
    }

    async create(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._teams_repo.create(params, token);
    }

    async update(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._teams_repo.update(params, token);
    }

    async download(
        params: { name: string; scope?: string; version?: string },
        token: string,
    ): Promise<TeamDownloadResponseDTO> {
        const vo = await this._teams_repo.download(params, token);
        return to_team_download_response_dto(vo);
    }

    async publish(
        params: Record<string, unknown>,
        token: string,
    ): Promise<PublishResultDTO> {
        const vo = await this._teams_repo.publish(params, token);
        return to_publish_result_dto(vo);
    }

    async unpublish(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._teams_repo.unpublish(params, token);
    }

    async delete_team(
        params: { name?: string; scope?: string; team_id?: string },
        token: string,
    ): Promise<DeleteTeamResultDTO> {
        const vo = await this._teams_repo.delete_team(params, token);
        return to_delete_team_result_dto(vo);
    }

    async rename(
        params: { name: string; scope: string; new_name: string },
        token: string,
    ): Promise<RenameTeamResultDTO> {
        const vo = await this._teams_repo.rename(params, token);
        return to_rename_team_result_dto(vo);
    }

    async get_versions(
        params: { name: string; scope?: string; latest_only?: boolean },
    ): Promise<LatestVersionResponseDTO> {
        const vo = await this._teams_repo.get_versions(params);
        return to_latest_version_response_dto(vo);
    }

    async get_phases(
        params: { team_id: string; version_id?: string },
    ): Promise<{
        team_id: string;
        version_id: string | null;
        version: string | null;
        phases: unknown[];
    }> {
        return this._teams_repo.get_phases(params);
    }
}
