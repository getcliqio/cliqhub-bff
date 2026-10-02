/** Realm dispatch keys — read or rotate the realm's public key in Core. */

import { get_logger } from '../lib/log.js';
import type { DispatchKeyRepository } from '../repositories/dispatch_key_repository.js';
import type { DispatchKeyInput, DispatchKeyData } from '../schemas/dispatch_key_types.js';
import { to_dispatch_key_data } from '../mappers/dispatch_key_mapper.js';

const log = get_logger('svc.dispatch_key');

/** Realm dispatch key reads and rotation (Core `auth/get_dispatch_public_key`, `auth/rotate_dispatch_key`). */
export class DispatchKeyService {
    constructor(private readonly _repo: DispatchKeyRepository) {}

    /** The realm's current public key. */
    async get_public_key(input: DispatchKeyInput, token: string): Promise<DispatchKeyData> {
        return to_dispatch_key_data(await this._repo.get_public_key(input, token), input.realm_id);
    }

    /** Has Core generate a new key pair (realm admin; Core enforces it) and returns the new public key. */
    async rotate(input: DispatchKeyInput, token: string): Promise<DispatchKeyData> {
        const data = to_dispatch_key_data(await this._repo.rotate(input, token), input.realm_id);
        log.info('dispatch_key_rotated', { realm_id: input.realm_id });
        return data;
    }
}
