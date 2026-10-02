/** Realm dispatch keys — response shape as Core sends it. */

/**
 * The flat body Core sends for
 * `/v1/auth/get_dispatch_public_key` and `/v1/auth/rotate_dispatch_key`.
 */
export interface DispatchKeyVO extends Record<string, unknown> {
    realm_id?: string;
    public_key_pem?: string;
    created_at?: number;
    rotated_at?: number;
}
