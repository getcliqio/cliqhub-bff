import type { ApiClient } from './api_client.js';
import type { TeamsBuildInput } from '../schemas/builder_schemas.js';

/**
 * Single upstream path: POST /v1/teams/build with `action`.
 * Response shape varies by action; callers map via BuilderService.
 */
export class BuilderRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async build<T>(params: TeamsBuildInput, token?: string): Promise<T> {
        return this._client.post<T>('/v1/teams/build', params, token);
    }
}
