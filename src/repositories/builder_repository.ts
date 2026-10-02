/** Team builder — the single Core call `POST /v1/teams/build` (shape depends on `action`). */

import type { CoreClient } from './core_client.js';
import type { TeamsBuildInput } from '../schemas/builder_types.js';

/** Core's AI team builder (`post`, no body timeout — LLM calls are slow). */
export class BuilderRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/teams/build`; the caller names the VO for its action. */
    async build<T>(input: TeamsBuildInput, token?: string): Promise<T> {
        return this._client.post<T>('/v1/teams/build', input, token);
    }
}
