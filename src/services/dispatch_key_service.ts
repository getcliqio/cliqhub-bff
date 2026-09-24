import type { DispatchKeyRepository } from '../repositories/dispatch_key_repository.js';
import type { DispatchKeyDTO } from '../types/dto.js';
import { ApiError } from '../repositories/api_error.js';

export class DispatchKeyService {
    private _repo: DispatchKeyRepository;

    constructor(repo: DispatchKeyRepository) {
        this._repo = repo;
    }

    async get_public_key(realm_id: string, token: string): Promise<DispatchKeyDTO> {
        const vo = await this._repo.get_public_key(realm_id, token);
        if (!vo.public_key_pem || vo.public_key_pem.includes('PRIVATE')) {
            throw new ApiError('internal', 'Hub did not return a usable dispatch public key', 502);
        }
        return {
            realm_id: vo.realm_id,
            public_key_pem: vo.public_key_pem,
            created_at: vo.created_at,
            rotated_at: vo.rotated_at,
        };
    }

    async regenerate(realm_id: string, token: string): Promise<DispatchKeyDTO> {
        const vo = await this._repo.regenerate(realm_id, token);
        if (!vo.public_key_pem || vo.public_key_pem.includes('PRIVATE')) {
            throw new ApiError('internal', 'Hub did not return a usable dispatch public key', 502);
        }
        return {
            realm_id: vo.realm_id,
            public_key_pem: vo.public_key_pem,
            created_at: vo.created_at,
            rotated_at: vo.rotated_at,
        };
    }
}
