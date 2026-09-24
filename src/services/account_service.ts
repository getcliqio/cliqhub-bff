import type { AccountRepository } from '../repositories/account_repository.js';
import type {
    UpdateProfileResponseDTO,
    ChangePasswordResponseDTO,
} from '../types/dto.js';
import {
    to_update_profile_response_dto,
    to_change_password_response_dto,
} from '../types/mappers.js';

export class AccountService {
    private _repo: AccountRepository;

    constructor(repo: AccountRepository) {
        this._repo = repo;
    }

    async update_profile(
        params: { display_name?: string; email?: string; preferences?: Record<string, unknown> },
        token: string,
    ): Promise<UpdateProfileResponseDTO> {
        const vo = await this._repo.update_profile(params, token);
        return to_update_profile_response_dto(vo);
    }

    async change_password(
        params: { current_password: string; new_password: string },
        token: string,
    ): Promise<ChangePasswordResponseDTO> {
        const vo = await this._repo.change_password(params, token);
        return to_change_password_response_dto(vo);
    }
}
