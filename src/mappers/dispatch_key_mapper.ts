/** Realm dispatch keys — Core VO → BFF data. */

import { ApiError } from '../errors/api_error.js';
import type { DispatchKeyVO } from '../types/core/dispatch_key.js';
import type { DispatchKeyData } from '../schemas/dispatch_key_types.js';

/**
 * Only a public key ever leaves the BFF.
 *
 * @throws ApiError 502 when Core sent no key or a private one.
 */
export function to_dispatch_key_data(vo: DispatchKeyVO, realm_id: string): DispatchKeyData {
    const pem = vo.public_key_pem ?? '';
    if (!pem || pem.includes('PRIVATE')) {
        throw new ApiError('internal', 'Hub did not return a usable dispatch public key', 502);
    }
    return {
        realm_id: vo.realm_id ?? realm_id,
        public_key_pem: pem,
        created_at: vo.created_at ?? null,
        rotated_at: vo.rotated_at ?? null,
    };
}
