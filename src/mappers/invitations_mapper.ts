/** Invitations — Core VO → BFF data. No mapper copies an invite token. */

import type {
    InvitationsCreateVO, InvitationListItemVO, InvitationsGetVO, InvitationsGetByIdVO,
    InvitationsRevokeVO, InvitationsGetByTokenVO, InvitationAcceptedVO,
} from '../types/core/invitations.js';
import type {
    InvitationsCreateData, InvitationListItemData, InvitationsGetData, InvitationsGetByIdData,
    InvitationsRevokeData, InvitationsGetByTokenData, InvitationAcceptedData, InvitationsAcceptData,
} from '../schemas/invitations_types.js';
import type { CreatedSession } from '../services/session_service.js';
import type { AcceptOutcome } from '../services/invitations_service.js';
import { to_cli_login_data } from './session_mapper.js';

/** `invitations/create` → the pending invite (`invite_url` only when no email went out). */
export function to_invitations_create_data(vo: InvitationsCreateVO): InvitationsCreateData {
    return {
        invite_id: vo.invite_id,
        status: vo.status,
        email: vo.email,
        role: vo.role,
        expires_at: vo.expires_at,
        resent: vo.resent,
        email_sent: vo.email_sent,
        invite_url: vo.invite_url ?? null,
    };
}

/** One invite with its deliveries. */
export function to_invitation_list_item_data(vo: InvitationListItemVO): InvitationListItemData {
    return {
        invite_id: vo.invite_id,
        email: vo.email,
        role: vo.role,
        kind: vo.kind,
        status: vo.status,
        inviter: vo.inviter ? { id: vo.inviter.id, display_name: vo.inviter.display_name } : null,
        send_count: vo.send_count,
        last_sent_at: vo.last_sent_at ?? null,
        expires_at: vo.expires_at,
        deliveries: (vo.deliveries ?? []).map((d) => ({
            kind: d.kind,
            sent_at: d.sent_at,
            email_sent: d.email_sent,
            provider_message_id: d.provider_message_id ?? null,
        })),
        created_at: vo.created_at,
    };
}

/** The org / realm a list or single read was for. */
function target_of(vo: { target_type: 'org' | 'realm'; org_id?: string; realm_id?: string }) {
    return {
        target_type: vo.target_type,
        ...(vo.org_id ? { org_id: vo.org_id } : {}),
        ...(vo.realm_id ? { realm_id: vo.realm_id } : {}),
    };
}

/** `invitations/get` → the target and one page of its invites. */
export function to_invitations_get_data(vo: InvitationsGetVO): InvitationsGetData {
    return {
        ...target_of(vo),
        invites: vo.invites.map(to_invitation_list_item_data),
        total: vo.total,
        page: vo.page,
        page_size: vo.page_size,
    };
}

/** `invitations/get_by_id` → the target and the invite. */
export function to_invitations_get_by_id_data(vo: InvitationsGetByIdVO): InvitationsGetByIdData {
    return { ...target_of(vo), invite: to_invitation_list_item_data(vo.invite) };
}

/** `invitations/revoke` → the invite and its new status. */
export function to_invitations_revoke_data(vo: InvitationsRevokeVO): InvitationsRevokeData {
    return { invite_id: vo.invite_id, status: vo.status };
}

/** `invitations/get_by_token` → the accept page preview. */
export function to_invitations_get_by_token_data(vo: InvitationsGetByTokenVO): InvitationsGetByTokenData {
    return {
        invite_id: vo.invite_id,
        kind: vo.kind,
        status: vo.status,
        org: { slug: vo.org.slug, display_name: vo.org.display_name },
        realm: vo.realm ? { slug: vo.realm.slug, display_name: vo.realm.display_name } : null,
        role: vo.role,
        inviter: vo.inviter ? { display_name: vo.inviter.display_name } : null,
        invitee_email: vo.invitee_email,
        account_exists: vo.account_exists,
        expires_at: vo.expires_at,
    };
}

/**
 * An accepted invite (Core's session PAT dropped), plus the new session's
 * sign-in data when accepting signed the person in (CLI clients: scope slugs
 * and the bearer token).
 */
function to_invitation_accepted_data(
    vo: Omit<InvitationAcceptedVO, 'token'>,
    session: CreatedSession | null,
    as_cli: boolean,
): InvitationAcceptedData {
    const data: InvitationAcceptedData = {
        decision: 'accept',
        user: { id: vo.user.id, username: vo.user.username, status: vo.user.status, created: vo.user.created },
        org: { id: vo.org.id, slug: vo.org.slug },
        realm: vo.realm ? { id: vo.realm.id, slug: vo.realm.slug } : null,
        membership: { role: vo.membership.role, status: vo.membership.status },
    };
    if (session) data.session = as_cli ? to_cli_login_data(session.login, session.target_token) : session.login;
    return data;
}

/** `invitations/accept` outcome → a decline, or the acceptance with any new session's sign-in data. */
export function to_invitations_accept_data(outcome: AcceptOutcome, as_cli: boolean): InvitationsAcceptData {
    if (outcome.decision === 'decline') return { decision: 'decline' };
    return to_invitation_accepted_data(outcome.accepted, outcome.session, as_cli);
}
