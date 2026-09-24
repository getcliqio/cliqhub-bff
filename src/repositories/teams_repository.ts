import type { ApiClient } from './api_client.js';
import type {
    TeamListResponseVO, TeamDetailVO,
    TeamDownloadResponseVO,
    PublishResultVO, DeleteTeamResultVO,
    RenameTeamResultVO,
    LatestVersionResponseVO,
} from '../types/vo.js';

export class TeamsRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async get(
        params: {
            tag?: string; query?: string; mine?: boolean; group_by_scope?: boolean;
            status?: string; scope?: string; limit?: number; offset?: number;
            realm_id?: string;
            daemon_id?: string;
            origin?: string;
            coverage?: string;
            sort_by?: string;
            sort_dir?: string;
        },
        token?: string,
    ): Promise<TeamListResponseVO> {
        return this._client.post<TeamListResponseVO>(
            '/v1/teams/get', params, token,
        );
    }

    async get_by_id(
        params: { name?: string; scope?: string; version?: string; team_id?: string },
        token?: string,
    ): Promise<TeamDetailVO> {
        return this._client.post<TeamDetailVO>(
            '/v1/teams/get_by_id', params, token,
        );
    }

    async create(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._client.post<Record<string, unknown>>(
            '/v1/teams/create', params, token,
        );
    }

    async update(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._client.post<Record<string, unknown>>(
            '/v1/teams/update', params, token,
        );
    }

    async download(
        params: { name: string; scope?: string; version?: string },
        token: string,
    ): Promise<TeamDownloadResponseVO> {
        return this._client.post<TeamDownloadResponseVO>(
            '/v1/teams/download', params, token,
        );
    }

    async publish(
        params: Record<string, unknown>,
        token: string,
    ): Promise<PublishResultVO> {
        return this._client.post<PublishResultVO>(
            '/v1/teams/publish', params, token,
        );
    }

    async unpublish(
        params: Record<string, unknown>,
        token: string,
    ): Promise<Record<string, unknown>> {
        return this._client.post<Record<string, unknown>>(
            '/v1/teams/unpublish', params, token,
        );
    }

    async delete_team(
        params: { name?: string; scope?: string; team_id?: string },
        token: string,
    ): Promise<DeleteTeamResultVO> {
        return this._client.post<DeleteTeamResultVO>(
            '/v1/teams/delete', params, token,
        );
    }

    async rename(
        params: { name: string; scope: string; new_name: string },
        token: string,
    ): Promise<RenameTeamResultVO> {
        return this._client.post<RenameTeamResultVO>(
            '/v1/teams/rename', params, token,
        );
    }

    async get_versions(
        params: { name: string; scope?: string; latest_only?: boolean },
    ): Promise<LatestVersionResponseVO> {
        return this._client.post<LatestVersionResponseVO>(
            '/v1/teams/get_versions', params,
        );
    }

    async get_phases(
        params: { team_id: string; version_id?: string },
    ): Promise<{
        team_id: string;
        version_id: string | null;
        version: string | null;
        phases: unknown[];
    }> {
        return this._client.post(
            '/v1/teams/get_phases', params,
        );
    }
}
