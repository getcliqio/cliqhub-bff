/**
 * Realm dispatch keys — the public key daemons verify dispatched work with.
 *
 * Routes (1:1 with this controller, mounted in routes/auth.ts):
 *   POST /v1/auth/get_dispatch_public_key  — current public key
 *   POST /v1/auth/rotate_dispatch_key      — new key pair (realm admin, checked by Core)
 *
 * Route auth `token`: a session or a bearer (daemons read the key).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `DispatchKeyInput` in `schemas/dispatch_key_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { DispatchKeyService } from '../services/dispatch_key_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { DispatchKeyInput } from '../schemas/dispatch_key_types.js';
import type { DispatchKeyData } from '../schemas/dispatch_key_types.js';

/** A realm's dispatch public key: read and rotate. */
export class DispatchKeyController extends BaseController {
    constructor(private readonly _dispatch_key_service: DispatchKeyService) {
        super();
    }

    /**
     * The realm's current dispatch public key.
     *
     * @param req - Body: {@link DispatchKeyInput}
     * @param res - `{ ok: true, data: DispatchKeyData }`; 502 when Core sends no usable key
     */
    async get_public_key(req: ApiRequest<DispatchKeyInput, DispatchKeyData>, res: ApiOkResponse<DispatchKeyData>): Promise<void> {
        const body = this.parse_body(DispatchKeyInput, req);
        this.ok(res, await this._dispatch_key_service.get_public_key(body, this.bearer(req)));
    }

    /**
     * Rotates the realm's dispatch key pair; daemons pick up the new public key.
     *
     * @param req - Body: {@link DispatchKeyInput}
     * @param res - `{ ok: true, data: DispatchKeyData }`
     */
    async rotate(req: ApiRequest<DispatchKeyInput, DispatchKeyData>, res: ApiOkResponse<DispatchKeyData>): Promise<void> {
        const body = this.parse_body(DispatchKeyInput, req);
        this.ok(res, await this._dispatch_key_service.rotate(body, this.bearer(req)));
    }
}
