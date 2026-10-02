/**
 * Tokens — personal, realm, A2A and daemon-wire tokens.
 *
 * Routes (1:1 with this controller, mounted in routes/auth.ts):
 *   POST /v1/auth/generate_token  — mint a token
 *   POST /v1/auth/get_tokens      — list tokens
 *   POST /v1/auth/revoke_token    — revoke one
 *   POST /v1/auth/rotate_token    — rotate one
 *
 * Route auth `token`: a session or any bearer; Core decides who may mint what.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Tokens*Input` in `schemas/tokens_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { TokensService } from '../services/tokens_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    TokensGenerateInput, TokensGetInput, TokensRevokeInput, TokensRotateInput,
} from '../schemas/tokens_types.js';
import type {
    TokensGenerateData, TokensGetData, TokensRevokeData, TokensRotateData,
} from '../schemas/tokens_types.js';

/** Personal, realm, A2A and daemon-wire tokens. */
export class TokensController extends BaseController {
    constructor(private readonly _tokens_service: TokensService) {
        super();
    }

    /**
     * Mints a token. The secret is in this answer only.
     *
     * @param req - Body: {@link TokensGenerateInput}
     * @param res - HTTP 201 `{ ok: true, data: TokensGenerateData }`
     */
    async generate(
        req: ApiRequest<TokensGenerateInput, TokensGenerateData>,
        res: ApiOkResponse<TokensGenerateData>,
    ): Promise<void> {
        const body = this.parse_body(TokensGenerateInput, req);
        this.ok(res, await this._tokens_service.generate(body, this.bearer(req)), 201);
    }

    /**
     * Lists the caller's tokens, or a realm's (`type: realm`). No secrets.
     *
     * @param req - Body: {@link TokensGetInput}
     * @param res - `{ ok: true, data: TokensGetData }`
     */
    async get(req: ApiRequest<TokensGetInput, TokensGetData>, res: ApiOkResponse<TokensGetData>): Promise<void> {
        const body = this.parse_body(TokensGetInput, req);
        this.ok(res, await this._tokens_service.get(body, this.bearer(req)));
    }

    /**
     * Revokes a token.
     *
     * @param req - Body: {@link TokensRevokeInput}
     * @param res - `{ ok: true, data: TokensRevokeData }`
     */
    async revoke(req: ApiRequest<TokensRevokeInput, TokensRevokeData>, res: ApiOkResponse<TokensRevokeData>): Promise<void> {
        const body = this.parse_body(TokensRevokeInput, req);
        this.ok(res, await this._tokens_service.revoke(body, this.bearer(req)));
    }

    /**
     * Rotates a token (A2A: the realm's bearer). The new secret is in this answer only.
     *
     * @param req - Body: {@link TokensRotateInput}
     * @param res - `{ ok: true, data: TokensRotateData }`
     */
    async rotate(req: ApiRequest<TokensRotateInput, TokensRotateData>, res: ApiOkResponse<TokensRotateData>): Promise<void> {
        const body = this.parse_body(TokensRotateInput, req);
        this.ok(res, await this._tokens_service.rotate(body, this.bearer(req)));
    }
}
