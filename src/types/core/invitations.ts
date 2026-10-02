/**
 * Invitations — response shapes as Core sends them (`/v1/invitations/*`).
 * Only repositories return these; services map them to `schemas/invitations_types.ts` data.
 */

/** Invite lifecycle state. */
export type InviteStatusVO = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

/** What an invite is for. */
export type InviteKindVO = 'org' | 'realm' | 'owner';

/** `invitations/create` — the pending invite; never the token. */
export interface InvitationsCreateVO {
    invite_id: string;
    status: 'pending';
    email: string;
    role: string;
    expires_at: string;
    resent: boolean;
    email_sent: boolean;
    invite_url: string | null;
}

/** One recorded email of an invite. */
export interface InviteDeliveryVO {
    kind: 'sent' | 'reminder';
    sent_at: string;
    email_sent: boolean;
    provider_message_id?: string | null;
}

/** One invite in `invitations/get` / `get_by_id`; never the token. */
export interface InvitationListItemVO {
    invite_id: string;
    email: string;
    role: string;
    kind: InviteKindVO;
    status: InviteStatusVO;
    inviter: { id: string; display_name: string } | null;
    send_count: number;
    last_sent_at: string | null;
    expires_at: string;
    deliveries?: InviteDeliveryVO[];
    created_at: string;
}

/** `invitations/get` — one page of invites. */
export interface InvitationsGetVO {
    target_type: 'org' | 'realm';
    org_id?: string;
    realm_id?: string;
    invites: InvitationListItemVO[];
    total: number;
    page: number;
    page_size: number;
}

/** `invitations/get_by_id`. */
export interface InvitationsGetByIdVO {
    target_type: 'org' | 'realm';
    org_id?: string;
    realm_id?: string;
    invite: InvitationListItemVO;
}

/** `invitations/revoke`. */
export interface InvitationsRevokeVO {
    invite_id: string;
    status: 'revoked';
}

/** `invitations/get_by_token` — the accept page preview. */
export interface InvitationsGetByTokenVO {
    invite_id: string;
    kind: InviteKindVO;
    status: InviteStatusVO;
    org: { slug: string; display_name: string };
    realm: { slug: string; display_name: string } | null;
    role: string;
    inviter: { display_name: string } | null;
    invitee_email: string;
    account_exists: boolean;
    expires_at: string;
}

/**
 * `invitations/accept` with `decision: accept`. When the person was not
 * signed in, Core activated their invited account (`user.created: true`) and
 * returns a session PAT in `token`. A reactivated account keeps its username,
 * which `user.username` carries.
 */
export interface InvitationAcceptedVO {
    decision: 'accept';
    user: { id: string; username: string; status: 'active'; created: boolean };
    org: { id: string; slug: string };
    realm: { id: string; slug: string } | null;
    membership: { role: string; status: string };
    token?: string;
}

/** `invitations/accept` with `decision: decline`. */
export interface InvitationDeclinedVO {
    decision: 'decline';
}

/** `invitations/accept`. */
export type InvitationsAcceptVO = InvitationAcceptedVO | InvitationDeclinedVO;
