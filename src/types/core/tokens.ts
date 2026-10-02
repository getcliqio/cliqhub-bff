/** Tokens — response shapes as Core sends them (`/v1/auth/*_token(s)`). */

/** A token's permission grant: domain allow-lists and per-domain access levels. */
export interface TokenPermissionsVO {
    domains?: {
        orgs?: Array<string | '*'> | '*';
        scopes?: Array<string | '*'> | '*';
        realms?: Array<string | '*'> | '*';
    };
    access?: Partial<Record<string, Array<'read' | 'write' | 'admin'>>>;
}

/** Token metadata (`get_tokens` row; never the secret). */
export interface TokenVO {
    id: number;
    name: string;
    permissions: TokenPermissionsVO;
    created_at: string;
    last_used_at: string | null;
}

/** `generate_token` — the new secret; bearer fields for a2a, `expires_in` for daemon_wire. */
export interface TokensGenerateVO {
    token: string;
    name: string;
    id?: number;
    realm_ids?: string[];
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
    expires_in?: number;
}

/** `get_tokens`. */
export interface TokensGetVO {
    tokens: TokenVO[];
    total: number;
}

/** `revoke_token`. */
export interface TokensRevokeVO {
    revoked: boolean;
    type?: string;
}

/** `rotate_token` — the new secret (bearer fields for a2a). */
export interface TokensRotateVO {
    token: string;
    type?: string;
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
}
