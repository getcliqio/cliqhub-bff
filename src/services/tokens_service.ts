/** Tokens — personal / realm / A2A / daemon-wire tokens, one Core call each. */

import { get_logger } from '../lib/log.js';
import type { TokensRepository } from '../repositories/tokens_repository.js';
import type {
    TokensGenerateInput, TokensGetInput, TokensRevokeInput, TokensRotateInput,
    TokensGenerateData, TokensGetData, TokensRevokeData, TokensRotateData,
} from '../schemas/tokens_types.js';
import {
    to_tokens_generate_data, to_tokens_get_data, to_tokens_revoke_data, to_tokens_rotate_data,
} from '../mappers/tokens_mapper.js';

const log = get_logger('svc.tokens');

/** Mint, list, revoke and rotate tokens. Log lines carry ids only, never the secret. */
export class TokensService {
    constructor(private readonly _repo: TokensRepository) {}

    /** Mints a token; the secret is in the result only. */
    async generate(input: TokensGenerateInput, token: string): Promise<TokensGenerateData> {
        const data = to_tokens_generate_data(await this._repo.generate(input, token), input);
        log.info('token_minted', {
            type: input.type,
            ...(data.id !== undefined ? { token_id: data.id } : {}),
            ...(input.realm_id ? { realm_id: input.realm_id } : {}),
        });
        return data;
    }

    /** Personal tokens, or a realm's tokens (never the secrets). */
    async get(input: TokensGetInput, token: string): Promise<TokensGetData> {
        return to_tokens_get_data(await this._repo.get(input, token));
    }

    /** Revokes one token. */
    async revoke(input: TokensRevokeInput, token: string): Promise<TokensRevokeData> {
        const data = to_tokens_revoke_data(await this._repo.revoke(input, token));
        log.info('token_revoked', {
            type: input.type,
            token_id: input.token_id,
            ...(input.realm_id ? { realm_id: input.realm_id } : {}),
        });
        return data;
    }

    /** Rotates a token (a2a: the realm's bearer); the new secret is in the result only. */
    async rotate(input: TokensRotateInput, token: string): Promise<TokensRotateData> {
        const data = to_tokens_rotate_data(await this._repo.rotate(input, token), input);
        log.info('token_rotated', {
            type: input.type,
            ...(input.token_id !== undefined ? { token_id: input.token_id } : {}),
            ...(input.realm_id ? { realm_id: input.realm_id } : {}),
        });
        return data;
    }
}
