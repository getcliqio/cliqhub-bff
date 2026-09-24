import type { DraftsRepository } from '../repositories/drafts_repository.js';
import type {
    DraftListResponseDTO, DraftDetailDTO,
    DraftSaveResponseDTO, DraftDeleteResponseDTO,
} from '../types/dto.js';
import {
    to_draft_list_response_dto, to_draft_detail_dto,
    to_draft_save_response_dto, to_draft_delete_response_dto,
} from '../types/mappers.js';

export class DraftsService {
    private _repo: DraftsRepository;

    constructor(repo: DraftsRepository) {
        this._repo = repo;
    }

    async get(token: string): Promise<DraftListResponseDTO> {
        const vo = await this._repo.get(token);
        return to_draft_list_response_dto(vo);
    }

    async get_by_id(params: { id: string }, token: string): Promise<DraftDetailDTO> {
        const vo = await this._repo.get_by_id(params, token);
        return to_draft_detail_dto(vo);
    }

    async new_draft(
        params: { title?: string; team_json: string },
        token: string,
    ): Promise<DraftSaveResponseDTO> {
        const vo = await this._repo.new_draft(params, token);
        return to_draft_save_response_dto(vo);
    }

    async update(
        params: { id: string; title?: string; team_json: string },
        token: string,
    ): Promise<DraftSaveResponseDTO> {
        const vo = await this._repo.update(params, token);
        return to_draft_save_response_dto(vo);
    }

    async delete_draft(params: { id: string }, token: string): Promise<DraftDeleteResponseDTO> {
        const vo = await this._repo.delete_draft(params, token);
        return to_draft_delete_response_dto(vo);
    }
}
