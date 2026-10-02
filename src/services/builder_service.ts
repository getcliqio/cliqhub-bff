/** Team builder — forwards one `teams/build` action to Core and maps that action's result. */

import type { BuilderRepository } from '../repositories/builder_repository.js';
import type { TeamsBuildInput, TeamsBuildData } from '../schemas/builder_types.js';
import type {
    BuilderGenerateVO, BuilderStatusVO, BuilderImproveRoleVO, BuilderSuggestVO,
    BuilderValidateVO, BuilderChatVO,
} from '../types/core/builder.js';
import {
    to_builder_generate_data, to_builder_status_data, to_builder_improve_role_data,
    to_builder_suggest_data, to_builder_validate_data, to_builder_chat_data,
} from '../mappers/builder_mapper.js';

/** Team builder actions (generate, status, improve_role, suggest, validate, chat) via Core `teams/build`. */
export class BuilderService {
    constructor(private readonly _repo: BuilderRepository) {}

    /** Forwards `input.action` to Core `teams/build` and maps the result with that action's mapper. */
    async build(input: TeamsBuildInput, token?: string): Promise<TeamsBuildData> {
        switch (input.action) {
            case 'generate':
                return to_builder_generate_data(await this._repo.build<BuilderGenerateVO>(input, token));
            case 'status':
                return to_builder_status_data(await this._repo.build<BuilderStatusVO>(input, token));
            case 'improve_role':
                return to_builder_improve_role_data(await this._repo.build<BuilderImproveRoleVO>(input, token));
            case 'suggest':
                return to_builder_suggest_data(await this._repo.build<BuilderSuggestVO>(input, token));
            case 'validate':
                return to_builder_validate_data(await this._repo.build<BuilderValidateVO>(input, token));
            case 'chat':
                return to_builder_chat_data(await this._repo.build<BuilderChatVO>(input, token));
        }
    }
}
