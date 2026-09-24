import type { ApiClient } from './api_client.js';

/** All invitations verbs → Core `/v1/invitations/*`. */
export class InvitationsRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async create(params: Record<string, unknown>, token: string) {
        return this._client.post('/v1/invitations/create', params, token);
    }

    async get(params: Record<string, unknown>, token: string) {
        return this._client.post('/v1/invitations/get', params, token);
    }

    async get_by_id(params: Record<string, unknown>, token: string) {
        return this._client.post('/v1/invitations/get_by_id', params, token);
    }

    async revoke(params: Record<string, unknown>, token: string) {
        return this._client.post('/v1/invitations/revoke', params, token);
    }

    async get_by_token(params: { token: string }, backend_token?: string) {
        return this._client.post('/v1/invitations/get_by_token', params, backend_token);
    }

    async accept(params: Record<string, unknown>, backend_token?: string) {
        return this._client.post('/v1/invitations/accept', params, backend_token);
    }
}
