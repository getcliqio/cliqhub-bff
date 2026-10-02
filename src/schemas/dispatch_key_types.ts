/**
 * Realm dispatch keys — the realm's public key daemons verify dispatched work with.
 *
 * Routes (controllers/dispatch_key_controller.ts):
 *   POST /v1/auth/get_dispatch_public_key  — current public key
 *   POST /v1/auth/rotate_dispatch_key      — new key pair (realm admin)
 */

import { z } from 'zod';

/** Both routes. */
export const DispatchKeyInput = z.object({
    realm_id: z.string().min(1)
        .describe('Realm id'),
});
export type DispatchKeyInput = z.infer<typeof DispatchKeyInput>;

/** Both routes — never the private key. */
export interface DispatchKeyData {
    realm_id: string;
    public_key_pem: string;
    /** Unix seconds. */
    created_at: number | null;
    /** Unix seconds. */
    rotated_at: number | null;
}
