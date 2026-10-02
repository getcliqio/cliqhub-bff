/**
 * Invitations — invite people to an org or realm; accept an invite.
 *
 * Routes (1:1 with this controller, mounted in routes/invitations.ts):
 *   POST /v1/invitations/create        — invite an email, or send a pending invite again
 *   POST /v1/invitations/get           — invites of an org / realm with their deliveries
 *   POST /v1/invitations/get_by_id     — one invite
 *   POST /v1/invitations/revoke        — cancel a pending invite
 *   POST /v1/invitations/get_by_token  — the accept page preview                  (public)
 *   POST /v1/invitations/accept        — accept (may sign in) or decline        (public)
 *
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Invitation*Input` in `schemas/invitations_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { InvitationsService } from '../services/invitations_service.js';
import type { EnvConfig } from '../config/env.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    InvitationsCreateInput, InvitationsGetInput, InvitationIdInput, InvitationsGetByTokenInput,
    InvitationsAcceptInput,
} from '../schemas/invitations_types.js';
import type {
    InvitationsCreateData, InvitationsGetData, InvitationsGetByIdData, InvitationsRevokeData,
    InvitationsGetByTokenData, InvitationsAcceptData,
} from '../schemas/invitations_types.js';
import { set_session_cookie, wants_bearer_token } from '../lib/session_cookie.js';
import { to_invitations_accept_data } from '../mappers/invitations_mapper.js';

/** Org / realm invitations: create, list, read, revoke and accept by token. */
export class InvitationsController extends BaseController {
    constructor(
        private readonly _invitations_service: InvitationsService,
        private readonly _config: EnvConfig,
    ) {
        super();
    }

    /**
     * Invites an email to an org or realm (a pending membership). Inviting the
     * same email again resends the same link with a new expiry (`resent`).
     *
     * @param req - Body: {@link InvitationsCreateInput}
     * @param res - `{ ok: true, data: InvitationsCreateData }`
     */
    async create(
        req: ApiRequest<InvitationsCreateInput, InvitationsCreateData>,
        res: ApiOkResponse<InvitationsCreateData>,
    ): Promise<void> {
        const body = this.parse_body(InvitationsCreateInput, req);
        this.ok(res, await this._invitations_service.create(body, this.session(req).target_token));
    }

    /**
     * Invites of an org or realm the caller manages, filtered by status, sorted and paged.
     *
     * @param req - Body: {@link InvitationsGetInput}
     * @param res - `{ ok: true, data: InvitationsGetData }`
     */
    async get(req: ApiRequest<InvitationsGetInput, InvitationsGetData>, res: ApiOkResponse<InvitationsGetData>): Promise<void> {
        const body = this.parse_body(InvitationsGetInput, req);
        this.ok(res, await this._invitations_service.get(body, this.session(req).target_token));
    }

    /**
     * One invite of an org or realm the caller belongs to.
     *
     * @param req - Body: {@link InvitationIdInput}
     * @param res - `{ ok: true, data: InvitationsGetByIdData }`
     */
    async get_by_id(
        req: ApiRequest<InvitationIdInput, InvitationsGetByIdData>,
        res: ApiOkResponse<InvitationsGetByIdData>,
    ): Promise<void> {
        const body = this.parse_body(InvitationIdInput, req);
        this.ok(res, await this._invitations_service.get_by_id(body, this.session(req).target_token));
    }

    /**
     * Cancels a pending invite.
     *
     * @param req - Body: {@link InvitationIdInput}
     * @param res - `{ ok: true, data: InvitationsRevokeData }`
     */
    async revoke(req: ApiRequest<InvitationIdInput, InvitationsRevokeData>, res: ApiOkResponse<InvitationsRevokeData>): Promise<void> {
        const body = this.parse_body(InvitationIdInput, req);
        this.ok(res, await this._invitations_service.revoke(body, this.session(req).target_token));
    }

    /**
     * The accept page preview of an invite link; used, revoked and expired
     * invites answer with their status. Works signed out.
     *
     * @param req - Body: {@link InvitationsGetByTokenInput}
     * @param res - `{ ok: true, data: InvitationsGetByTokenData }`; 404 for an unknown link
     */
    async get_by_token(
        req: ApiRequest<InvitationsGetByTokenInput, InvitationsGetByTokenData>,
        res: ApiOkResponse<InvitationsGetByTokenData>,
    ): Promise<void> {
        const body = this.parse_body(InvitationsGetByTokenInput, req);
        this.ok(res, await this._invitations_service.get_by_token(body, this.optional_token(req)));
    }

    /**
     * Accepts or declines an invite. An accept that created or activated the
     * account signs the person in: session cookie set, and `session` carries
     * the sign-in data (a CLI client, `X-Client: cli`, also gets the bearer
     * token). A decline never creates a session.
     *
     * @param req - Body: {@link InvitationsAcceptInput}
     * @param res - `{ ok: true, data: InvitationsAcceptData }`
     */
    async accept(
        req: ApiRequest<InvitationsAcceptInput, InvitationsAcceptData>,
        res: ApiOkResponse<InvitationsAcceptData>,
    ): Promise<void> {
        const body = this.parse_body(InvitationsAcceptInput, req);
        const outcome = await this._invitations_service.accept(body, this.optional_token(req));
        if (outcome.decision === 'accept' && outcome.session) set_session_cookie(res, this._config, outcome.session.session_id);
        this.ok(res, to_invitations_accept_data(outcome, wants_bearer_token(req)));
    }
}
