/** Teams — Core calls for `/v1/teams/*`. Returns Core's `data` (VO). */

import type { CoreClient } from './core_client.js';
import type {
    TeamsGetVO, TeamDetailVO, TeamMutationVO, TeamsDownloadVO, TeamsDeleteVO,
    TeamsGetVersionsVO, TeamsGetPhasesVO,
} from '../types/core/teams.js';
import type {
    TeamsGetInput, TeamsGetByIdInput, TeamsGetVersionsInput, TeamsGetPhasesInput,
    TeamsCreateInput, TeamsUpdateInput, TeamsPublishInput, TeamRefInput, TeamsDownloadInput,
    TeamsRenameInput,
} from '../schemas/teams_types.js';

/** Core `/v1/teams/*` calls. */
export class TeamsRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/teams/get` — public catalog reads work without a token. */
    async get(input: TeamsGetInput, token?: string): Promise<TeamsGetVO> {
        return this._client.post<TeamsGetVO>('/v1/teams/get', input, token);
    }

    /** `POST /v1/teams/get_by_id` */
    async get_by_id(input: TeamsGetByIdInput, token?: string): Promise<TeamDetailVO> {
        return this._client.post<TeamDetailVO>('/v1/teams/get_by_id', input, token);
    }

    /** `POST /v1/teams/get_versions` */
    async get_versions(input: TeamsGetVersionsInput, token?: string): Promise<TeamsGetVersionsVO> {
        return this._client.post<TeamsGetVersionsVO>('/v1/teams/get_versions', input, token);
    }

    /** `POST /v1/teams/get_phases` */
    async get_phases(input: TeamsGetPhasesInput, token?: string): Promise<TeamsGetPhasesVO> {
        return this._client.post<TeamsGetPhasesVO>('/v1/teams/get_phases', input, token);
    }

    /** `POST /v1/teams/create` */
    async create(input: TeamsCreateInput, token: string): Promise<TeamMutationVO> {
        return this._client.post<TeamMutationVO>('/v1/teams/create', input, token);
    }

    /** `POST /v1/teams/update` */
    async update(input: TeamsUpdateInput, token: string): Promise<TeamMutationVO> {
        return this._client.post<TeamMutationVO>('/v1/teams/update', input, token);
    }

    /** `POST /v1/teams/download` */
    async download(input: TeamsDownloadInput, token: string): Promise<TeamsDownloadVO> {
        return this._client.post<TeamsDownloadVO>('/v1/teams/download', input, token);
    }

    /** `POST /v1/teams/publish` */
    async publish(input: TeamsPublishInput, token: string): Promise<TeamMutationVO> {
        return this._client.post<TeamMutationVO>('/v1/teams/publish', input, token);
    }

    /** `POST /v1/teams/unpublish` */
    async unpublish(input: TeamRefInput, token: string): Promise<TeamMutationVO> {
        return this._client.post<TeamMutationVO>('/v1/teams/unpublish', input, token);
    }

    /** `POST /v1/teams/delete` */
    async delete(input: TeamRefInput, token: string): Promise<TeamsDeleteVO> {
        return this._client.post<TeamsDeleteVO>('/v1/teams/delete', input, token);
    }

    /** `POST /v1/teams/rename` */
    async rename(input: TeamsRenameInput, token: string): Promise<TeamMutationVO> {
        return this._client.post<TeamMutationVO>('/v1/teams/rename', input, token);
    }
}
