import type { AuthRepository } from '../repositories/auth_repository.js';
import type {
    CreateTokenResponseDTO, RotateTokenResponseDTO,
} from '../types/dto.js';

/** Token CRUD only — session create/get/update/delete live in SessionService. */
export class AuthService {
    private _auth_repo: AuthRepository;

    constructor(auth_repo: AuthRepository) {
        this._auth_repo = auth_repo;
    }

    async new_token(
        opts: {
            type?: 'user' | 'realm' | 'a2a' | 'daemon_wire';
            name?: string;
            realm_ids?: string[];
            realm_id?: string;
            aud?: string;
            run_id?: string;
            action?: 'execute' | 'cancel' | 'access';
            permissions?: Record<string, unknown>;
        },
        backend_token: string,
    ): Promise<CreateTokenResponseDTO> {
        const result = await this._auth_repo.new_token(opts, backend_token);
        if (opts.type === 'a2a') {
            return {
                token: result.token,
                bearer: result.bearer ?? result.token,
                name: result.name ?? 'a2a',
                realm_id: result.realm_id ?? opts.realm_id,
                realm_ids: result.realm_ids ?? (opts.realm_id ? [opts.realm_id] : []),
                has_bearer: result.has_bearer,
                bearer_prefix: result.bearer_prefix,
            };
        }
        if (opts.type === 'daemon_wire') {
            return {
                token: result.token,
                name: result.name ?? 'daemon_wire',
                realm_id: result.realm_id ?? opts.realm_id,
                realm_ids: result.realm_ids ?? (opts.realm_id ? [opts.realm_id] : []),
                expires_in: result.expires_in,
            };
        }
        return {
            token: result.token,
            name: result.name,
            id: result.id,
            realm_ids: result.realm_ids ?? [],
        };
    }

    async list_tokens(
        opts: {
            type?: 'user' | 'realm';
            realm_id?: string;
            limit?: number;
            offset?: number;
        },
        backend_token: string,
    ) {
        return this._auth_repo.list_tokens(opts, backend_token);
    }

    async revoke_token(
        opts: {
            type?: 'user' | 'realm';
            token_id: number | string;
            realm_id?: string;
        },
        backend_token: string,
    ) {
        return this._auth_repo.revoke_token(opts, backend_token);
    }

    async rotate_token(
        opts: {
            type?: 'user' | 'realm' | 'a2a';
            token_id?: number | string;
            realm_id?: string;
        },
        backend_token: string,
    ): Promise<RotateTokenResponseDTO> {
        const result = await this._auth_repo.rotate_token(opts, backend_token);
        if (opts.type === 'a2a') {
            return {
                token: result.token,
                bearer: result.bearer ?? result.token,
                type: 'a2a',
                realm_id: result.realm_id ?? opts.realm_id,
                has_bearer: result.has_bearer,
                bearer_prefix: result.bearer_prefix,
            };
        }
        return { token: result.token };
    }
}
