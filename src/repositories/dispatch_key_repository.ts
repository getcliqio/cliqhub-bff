import type { CoreApiClient } from './core_api_client.js';
import type { DispatchKeyVO } from '../types/vo.js';

export class DispatchKeyRepository {
    private _client: CoreApiClient;

    constructor(client: CoreApiClient) {
        this._client = client;
    }

    async get_public_key(realm_id: string, token: string): Promise<DispatchKeyVO> {
        const raw = await this._client.post<{
            realm_id?: string;
            public_key_pem?: string;
            created_at?: number;
            rotated_at?: number;
        }>('/v1/auth/get_dispatch_public_key', { realm_id }, token);

        return {
            realm_id: raw.realm_id ?? realm_id,
            public_key_pem: raw.public_key_pem ?? '',
            created_at: raw.created_at ?? null,
            rotated_at: raw.rotated_at ?? null,
        };
    }

    async regenerate(realm_id: string, token: string): Promise<DispatchKeyVO> {
        const raw = await this._client.post<{
            realm_id?: string;
            public_key_pem?: string;
            created_at?: number;
            rotated_at?: number;
        }>('/v1/auth/rotate_dispatch_key', { realm_id }, token);

        return {
            realm_id: raw.realm_id ?? realm_id,
            public_key_pem: raw.public_key_pem ?? '',
            created_at: raw.created_at ?? null,
            rotated_at: raw.rotated_at ?? null,
        };
    }
}
