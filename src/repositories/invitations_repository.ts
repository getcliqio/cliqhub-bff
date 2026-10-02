/** Invitations — Core calls for `/v1/invitations/*`. Returns Core's `data` (VO). */

import type { CoreClient } from './core_client.js';
import type {
    InvitationsCreateVO, InvitationsGetVO, InvitationsGetByIdVO, InvitationsRevokeVO,
    InvitationsGetByTokenVO, InvitationsAcceptVO,
} from '../types/core/invitations.js';
import type {
    InvitationsCreateInput, InvitationIdInput, InvitationsGetByTokenInput, InvitationsAcceptInput,
} from '../schemas/invitations_types.js';

/** `invitations/get` body, in Core's field names. */
export interface InvitationsGetFilter {
    target_type: 'org' | 'realm';
    org_id?: string;
    realm_id?: string;
    status?: string;
    query?: string;
    sort?: string;
    page?: number;
    page_size?: number;
}

/** Core `/v1/invitations/*` calls. */
export class InvitationsRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /v1/invitations/create` */
    async create(input: InvitationsCreateInput, token: string): Promise<InvitationsCreateVO> {
        return this._client.post<InvitationsCreateVO>('/v1/invitations/create', input, token);
    }

    /** `POST /v1/invitations/get` */
    async get(filter: InvitationsGetFilter, token: string): Promise<InvitationsGetVO> {
        return this._client.post<InvitationsGetVO>('/v1/invitations/get', filter, token);
    }

    /** `POST /v1/invitations/get_by_id` */
    async get_by_id(input: InvitationIdInput, token: string): Promise<InvitationsGetByIdVO> {
        return this._client.post<InvitationsGetByIdVO>('/v1/invitations/get_by_id', input, token);
    }

    /** `POST /v1/invitations/revoke` */
    async revoke(input: InvitationIdInput, token: string): Promise<InvitationsRevokeVO> {
        return this._client.post<InvitationsRevokeVO>('/v1/invitations/revoke', input, token);
    }

    /** `POST /v1/invitations/get_by_token` — works signed out. */
    async get_by_token(input: InvitationsGetByTokenInput, token?: string): Promise<InvitationsGetByTokenVO> {
        return this._client.post<InvitationsGetByTokenVO>('/v1/invitations/get_by_token', input, token);
    }

    /** `POST /v1/invitations/accept` — accept or decline, signed in or signed out. */
    async accept(input: InvitationsAcceptInput, token?: string): Promise<InvitationsAcceptVO> {
        return this._client.post<InvitationsAcceptVO>('/v1/invitations/accept', input, token);
    }
}
