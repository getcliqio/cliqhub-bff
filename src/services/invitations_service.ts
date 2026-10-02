/**
 * Invitations — org and realm invites (Core `/v1/invitations/*`).
 * Accepting can sign the person in: when Core returns a session PAT with the
 * acceptance, this service turns it into a BFF session. Declining never does.
 */

import { get_logger } from '../lib/log.js';
import type { InvitationsRepository, InvitationsGetFilter } from '../repositories/invitations_repository.js';
import type { SessionService, CreatedSession } from './session_service.js';
import type { InvitationAcceptedVO } from '../types/core/invitations.js';
import type {
    InvitationsCreateInput, InvitationsGetInput, InvitationIdInput, InvitationsGetByTokenInput,
    InvitationsAcceptInput,
    InvitationsCreateData, InvitationsGetData, InvitationsGetByIdData, InvitationsRevokeData,
    InvitationsGetByTokenData,
} from '../schemas/invitations_types.js';
import {
    to_invitations_create_data, to_invitations_get_data, to_invitations_get_by_id_data,
    to_invitations_revoke_data, to_invitations_get_by_token_data,
} from '../mappers/invitations_mapper.js';

const log = get_logger('svc.invitations');

/** The outcome of `accept`: a decline, or the acceptance plus the new session when one was created. */
export type AcceptOutcome =
    | { decision: 'decline' }
    | { decision: 'accept'; accepted: Omit<InvitationAcceptedVO, 'token'>; session: CreatedSession | null };

/** Org and realm invites — one Core `/v1/invitations/*` call per action; Core enforces who may invite. */
export class InvitationsService {
    constructor(
        private readonly _repo: InvitationsRepository,
        private readonly _session_service: SessionService,
    ) {}

    /**
     * Invites an email (or sends a pending invite again: same link, new expiry,
     * `resent: true`). Core's 409 `already_member` / `deleted` propagate unchanged.
     */
    async create(input: InvitationsCreateInput, token: string): Promise<InvitationsCreateData> {
        const data = to_invitations_create_data(await this._repo.create(input, token));
        log.info('invite_created', {
            target_type: input.target_type, org_id: input.org_id, realm_id: input.realm_id, invite_id: data.invite_id,
            role: data.role, resent: data.resent, email_sent: data.email_sent, reactivate: input.reactivate === true,
        });
        return data;
    }

    /** Invites of an org or realm (`target_type` follows from the id when not given). */
    async get(input: InvitationsGetInput, token: string): Promise<InvitationsGetData> {
        const filter: InvitationsGetFilter = {
            target_type: input.target_type ?? (input.org_id ? 'org' : 'realm'),
            ...(input.org_id ? { org_id: input.org_id } : {}),
            ...(input.realm_id ? { realm_id: input.realm_id } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.query ? { query: input.query } : {}),
            ...(input.sort ? { sort: input.sort } : {}),
            ...(input.page != null ? { page: input.page } : {}),
            ...(input.page_size != null ? { page_size: input.page_size } : {}),
        };
        return to_invitations_get_data(await this._repo.get(filter, token));
    }

    /** One invite by id. */
    async get_by_id(input: InvitationIdInput, token: string): Promise<InvitationsGetByIdData> {
        return to_invitations_get_by_id_data(await this._repo.get_by_id(input, token));
    }

    /** Cancels a pending invite; Core's 409 `not_pending` propagates unchanged. */
    async revoke(input: InvitationIdInput, token: string): Promise<InvitationsRevokeData> {
        const data = to_invitations_revoke_data(await this._repo.revoke(input, token));
        log.info('invite_revoked', { invite_id: input.invite_id });
        return data;
    }

    /** The accept page preview for an invite link (public; the caller may be signed out). */
    async get_by_token(input: InvitationsGetByTokenInput, token?: string): Promise<InvitationsGetByTokenData> {
        return to_invitations_get_by_token_data(await this._repo.get_by_token(input, token));
    }

    /**
     * Accepts or declines an invite. When an accept returns a session PAT
     * (Core created or activated the account), that becomes a BFF session.
     * Core's `expired`, `not_pending`, `sign_in_required`, `email_mismatch`
     * and `conflict` errors propagate unchanged.
     */
    async accept(input: InvitationsAcceptInput, token?: string): Promise<AcceptOutcome> {
        const vo = await this._repo.accept(input, token);
        if (vo.decision === 'decline') {
            log.info('invite_declined');
            return { decision: 'decline' };
        }
        const { token: new_user_token, ...accepted } = vo;
        const session = new_user_token
            ? await this._session_service.create_from_backend_token(new_user_token)
            : null;
        log.info('invite_accepted', {
            user_id: accepted.user.id, org_id: accepted.org.id, realm_id: accepted.realm?.id ?? null,
            user_created: accepted.user.created, session_created: session !== null,
        });
        return { decision: 'accept', accepted, session };
    }
}
