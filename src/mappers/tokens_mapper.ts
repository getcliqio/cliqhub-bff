/** Tokens — Core VO → BFF data. Fields of a new / rotated secret depend on the token type. */

import type { TokenVO, TokensGenerateVO, TokensGetVO, TokensRevokeVO, TokensRotateVO } from '../types/core/tokens.js';
import type {
    TokenData, TokensGenerateData, TokensGetData, TokensRevokeData, TokensRotateData,
    TokensGenerateInput, TokensRotateInput,
} from '../schemas/tokens_types.js';

/** Token metadata (never the secret). */
export function to_token_data(vo: TokenVO): TokenData {
    return {
        id: vo.id,
        name: vo.name,
        permissions: vo.permissions ?? {},
        created_at: vo.created_at,
        last_used_at: vo.last_used_at,
    };
}

/** The new secret: a2a adds the bearer fields, daemon_wire its lifetime. */
export function to_tokens_generate_data(vo: TokensGenerateVO, input: TokensGenerateInput): TokensGenerateData {
    const realm_ids = vo.realm_ids ?? (input.realm_id ? [input.realm_id] : []);
    if (input.type === 'a2a') {
        return {
            token: vo.token,
            bearer: vo.bearer ?? vo.token,
            name: vo.name ?? 'a2a',
            realm_id: vo.realm_id ?? input.realm_id,
            realm_ids,
            has_bearer: vo.has_bearer,
            bearer_prefix: vo.bearer_prefix,
        };
    }
    if (input.type === 'daemon_wire') {
        return {
            token: vo.token,
            name: vo.name ?? 'daemon_wire',
            realm_id: vo.realm_id ?? input.realm_id,
            realm_ids,
            expires_in: vo.expires_in,
        };
    }
    return { token: vo.token, name: vo.name, id: vo.id, realm_ids: vo.realm_ids ?? [] };
}

/** `get_tokens` → the caller's tokens. */
export function to_tokens_get_data(vo: TokensGetVO): TokensGetData {
    return { tokens: (vo.tokens ?? []).map(to_token_data), total: vo.total ?? 0 };
}

/** `revoke_token` → `{ revoked }`. */
export function to_tokens_revoke_data(vo: TokensRevokeVO): TokensRevokeData {
    return { revoked: vo.revoked };
}

/** The rotated secret: a2a returns the realm bearer fields. */
export function to_tokens_rotate_data(vo: TokensRotateVO, input: TokensRotateInput): TokensRotateData {
    if (input.type === 'a2a') {
        return {
            token: vo.token,
            bearer: vo.bearer ?? vo.token,
            type: 'a2a',
            realm_id: vo.realm_id ?? input.realm_id,
            has_bearer: vo.has_bearer,
            bearer_prefix: vo.bearer_prefix,
        };
    }
    return { token: vo.token };
}
