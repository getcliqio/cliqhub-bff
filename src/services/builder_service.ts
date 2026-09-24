import type { BuilderRepository } from '../repositories/builder_repository.js';
import type { TeamsBuildInput } from '../schemas/builder_schemas.js';
import type {
    BuilderGenerateResponseDTO,
    BuilderGenerateStatusDTO,
    BuilderImproveRoleResponseDTO,
    BuilderValidateResponseDTO,
    BuilderChatResponseDTO,
} from '../types/dto.js';
import {
    to_builder_generate_response_dto,
    to_builder_generate_status_dto,
    to_builder_improve_role_response_dto,
    to_builder_validate_response_dto,
    to_builder_chat_response_dto,
} from '../types/mappers.js';

export class BuilderService {
    private _repo: BuilderRepository;

    constructor(repo: BuilderRepository) {
        this._repo = repo;
    }

    async build(
        params: TeamsBuildInput,
        token?: string,
    ): Promise<
        | BuilderGenerateResponseDTO
        | BuilderGenerateStatusDTO
        | BuilderImproveRoleResponseDTO
        | BuilderValidateResponseDTO
        | BuilderChatResponseDTO
        | Record<string, unknown>
    > {
        const vo = await this._repo.build<Record<string, unknown>>(params, token);
        switch (params.action) {
            case 'generate':
                return to_builder_generate_response_dto(vo as any);
            case 'status':
                return to_builder_generate_status_dto(vo as any);
            case 'improve_role':
                return to_builder_improve_role_response_dto(vo as any);
            case 'validate':
                return to_builder_validate_response_dto(vo as any);
            case 'chat':
                return to_builder_chat_response_dto(vo as any);
            case 'suggest':
                return vo;
            default:
                return vo;
        }
    }
}
