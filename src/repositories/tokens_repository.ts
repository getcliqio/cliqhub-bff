/** Tokens — Core calls for `/v1/auth/{generate,get,revoke,rotate}_token(s)`. Returns Core's `data` (VO). */

import type { CoreClient } from './core_client.js';
import type { TokensGenerateVO, TokensGetVO, TokensRevokeVO, TokensRotateVO } from '../types/core/tokens.js';
import type {
    TokensGenerateInput, TokensGetInput, TokensRevokeInput, TokensRotateInput,
} from '../schemas/tokens_types.js';

/** Core token calls: generate, list, revoke, rotate. */
export class TokensRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/auth/generate_token` */
    async generate(input: TokensGenerateInput, token: string): Promise<TokensGenerateVO> {
        return this._client.post<TokensGenerateVO>('/v1/auth/generate_token', input, token);
    }

    /** `POST /v1/auth/get_tokens` */
    async get(input: TokensGetInput, token: string): Promise<TokensGetVO> {
        return this._client.post<TokensGetVO>('/v1/auth/get_tokens', input, token);
    }

    /** `POST /v1/auth/revoke_token` */
    async revoke(input: TokensRevokeInput, token: string): Promise<TokensRevokeVO> {
        return this._client.post<TokensRevokeVO>('/v1/auth/revoke_token', input, token);
    }

    /** `POST /v1/auth/rotate_token` */
    async rotate(input: TokensRotateInput, token: string): Promise<TokensRotateVO> {
        return this._client.post<TokensRotateVO>('/v1/auth/rotate_token', input, token);
    }
}
