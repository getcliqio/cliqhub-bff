/**
 * Realm dispatch keys — Core answers these two routes with a flat body
 * (`{ ok, realm_id, public_key_pem, … }`), so they are read with `post_body`.
 */

import type { CoreClient } from './core_client.js';
import type { DispatchKeyVO } from '../types/core/dispatch_key.js';
import type { DispatchKeyInput } from '../schemas/dispatch_key_types.js';

/** A realm's dispatch key: read and rotate. */
export class DispatchKeyRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/auth/get_dispatch_public_key` */
    async get_public_key(input: DispatchKeyInput, token: string): Promise<DispatchKeyVO> {
        return this._client.post_body<DispatchKeyVO>('/v1/auth/get_dispatch_public_key', input, token);
    }

    /** `POST /v1/auth/rotate_dispatch_key` */
    async rotate(input: DispatchKeyInput, token: string): Promise<DispatchKeyVO> {
        return this._client.post_body<DispatchKeyVO>('/v1/auth/rotate_dispatch_key', input, token);
    }
}
