/**
 * Invitations — request schemas (Zod) and response data types for org and
 * realm invites. Bodies mirror Core `schemas/invitation_types.ts`.
 *
 * Routes (controllers/invitations_controller.ts):
 *   POST /v1/invitations/create        — invite an email to an org or realm; again = send again
 *   POST /v1/invitations/get           — invites of an org or realm, with their email deliveries
 *   POST /v1/invitations/get_by_id     — one invite
 *   POST /v1/invitations/revoke        — cancel a pending invite
 *   POST /v1/invitations/get_by_token  — what an invite link grants (public)
 *   POST /v1/invitations/accept        — accept or decline (public); accepting signs the person in
 *
 * No response ever carries the invite token; `invite_url` is set only when
 * the email could not be sent.
 */

import { z } from 'zod';
import type { LoginData, CliLoginData } from './session_types.js';

// ─── Shared field fragments ─────────────────────────────────────────────────

const TargetTypeField = z.enum(['org', 'realm'])
    .describe('What the invite is for');

const OrgIdField = z.string().uuid()
    .describe('Org UUID (org invites)');

const RealmIdField = z.string().min(1)
    .describe('Realm id (realm invites)');

const InviteIdField = z.string().uuid()
    .describe('Invite UUID');

const TokenField = z.string().min(1, 'token is required')
    .describe('The secret from the invite link');

/** Invite lifecycle states. */
const InviteStatusField = z.enum(['pending', 'accepted', 'declined', 'revoked', 'expired']);

const require_target = (v: { target_type: 'org' | 'realm'; org_id?: string; realm_id?: string }, ctx: z.RefinementCtx): void => {
    if (v.target_type === 'org' && v.org_id == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'org_id is required when target_type is org', path: ['org_id'] });
    }
    if (v.target_type === 'realm' && !v.realm_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'realm_id is required when target_type is realm', path: ['realm_id'] });
    }
};

// ─── Inputs ─────────────────────────────────────────────────────────────────

/**
 * POST /v1/invitations/create — always an invite (a pending membership); a
 * second create for the same email and target sends the same link again.
 */
export const InvitationsCreateInput = z.object({
    target_type: TargetTypeField,
    org_id: OrgIdField.optional(),
    realm_id: RealmIdField.optional(),
    email: z.string().min(1, 'email is required')
        .describe('Email to invite'),
    role: z.enum(['owner', 'admin', 'member', 'operator']).optional()
        .describe('Role on acceptance (owner: orgs only; operator: realms only)'),
    reactivate: z.boolean().optional()
        .describe('Site admin: restore the soft-deleted user that holds this email'),
}).superRefine((v, ctx) => {
    require_target(v, ctx);
    if (v.target_type === 'org' && v.role === 'operator') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'operator role is not valid for org invites', path: ['role'] });
    }
    if (v.target_type === 'realm' && v.role === 'owner') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'owner role is not valid for realm invites', path: ['role'] });
    }
});
export type InvitationsCreateInput = z.infer<typeof InvitationsCreateInput>;

/** POST /v1/invitations/get — one org's or realm's invites, filtered, sorted and paged. */
export const InvitationsGetInput = z.object({
    target_type: TargetTypeField.optional()
        .describe('What the invites are for (default: org when org_id is set, else realm)'),
    org_id: OrgIdField.optional(),
    realm_id: RealmIdField.optional(),
    status: InviteStatusField.optional()
        .describe('Only invites in this state'),
    query: z.string().optional()
        .describe('Substring match on the invited email'),
    sort: z.string().regex(/^-?[a-z_]+$/, 'sort is a field name, `-` first for descending').optional()
        .describe('Sort field, `-` prefix for descending (e.g. -created_at)'),
    page: z.number().int().min(1).optional()
        .describe('1-based page number'),
    page_size: z.number().int().min(1).max(100).optional()
        .describe('Invites per page (max 100)'),
}).superRefine((v, ctx) => {
    if (v.org_id == null && !v.realm_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'org_id or realm_id is required', path: ['org_id'] });
    }
    if (v.target_type) require_target({ ...v, target_type: v.target_type }, ctx);
});
export type InvitationsGetInput = z.infer<typeof InvitationsGetInput>;

/** POST /v1/invitations/get_by_id, /revoke — one invite. */
export const InvitationIdInput = z.object({
    invite_id: InviteIdField,
    target_type: TargetTypeField.optional(),
});
export type InvitationIdInput = z.infer<typeof InvitationIdInput>;

/** POST /v1/invitations/get_by_token */
export const InvitationsGetByTokenInput = z.object({
    token: TokenField,
});
export type InvitationsGetByTokenInput = z.infer<typeof InvitationsGetByTokenInput>;

/** POST /v1/invitations/accept — accept or decline; a new person also sends their account fields. */
export const InvitationsAcceptInput = z.object({
    token: TokenField,
    decision: z.enum(['accept', 'decline'], { required_error: 'decision is required' })
        .describe('Accept or decline the invite'),
    username: z.string().optional()
        .describe('New account: username'),
    password: z.string().optional()
        .describe('New account: password'),
    display_name: z.string().optional()
        .describe('New account: display name'),
});
export type InvitationsAcceptInput = z.infer<typeof InvitationsAcceptInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** Invite lifecycle state. */
export type InviteStatus = z.infer<typeof InviteStatusField>;

/** What an invite is for: an org membership, a realm membership, or ownership of a new org. */
export type InviteKind = 'org' | 'realm' | 'owner';

/** `invitations/create` — the pending invite (`resent` when it already existed). */
export interface InvitationsCreateData {
    invite_id: string;
    status: 'pending';
    email: string;
    role: string;
    expires_at: string;
    /** A pending invite to the same target existed: same link, new expiry. */
    resent: boolean;
    email_sent: boolean;
    /** The accept link, only when the email could not be sent. */
    invite_url: string | null;
}

/** One email sent for an invite. */
export interface InviteDeliveryData {
    kind: 'sent' | 'reminder';
    sent_at: string;
    email_sent: boolean;
    provider_message_id: string | null;
}

/** One invite of `invitations/get` / `get_by_id`. */
export interface InvitationListItemData {
    invite_id: string;
    email: string;
    role: string;
    kind: InviteKind;
    status: InviteStatus;
    inviter: { id: string; display_name: string } | null;
    send_count: number;
    last_sent_at: string | null;
    expires_at: string;
    deliveries: InviteDeliveryData[];
    created_at: string;
}

/** `invitations/get` — one page of invites. */
export interface InvitationsGetData {
    target_type: 'org' | 'realm';
    org_id?: string;
    realm_id?: string;
    invites: InvitationListItemData[];
    /** Invites matching the filter, across all pages. */
    total: number;
    page: number;
    page_size: number;
}

/** `invitations/get_by_id` */
export interface InvitationsGetByIdData {
    target_type: 'org' | 'realm';
    org_id?: string;
    realm_id?: string;
    invite: InvitationListItemData;
}

/** `invitations/revoke` */
export interface InvitationsRevokeData {
    invite_id: string;
    status: 'revoked';
}

/** `invitations/get_by_token` — the accept page preview (expired / used invites keep their status). */
export interface InvitationsGetByTokenData {
    invite_id: string;
    kind: InviteKind;
    status: InviteStatus;
    org: { slug: string; display_name: string };
    realm: { slug: string; display_name: string } | null;
    role: string;
    inviter: { display_name: string } | null;
    invitee_email: string;
    /** False → the page shows the sign-up form. */
    account_exists: boolean;
    expires_at: string;
}

/** An accepted invite: who joined what, with which membership. */
export interface InvitationAcceptedData {
    decision: 'accept';
    /** `created`: the person was not signed in and their invited account was activated (a reactivated account keeps its username). */
    user: { id: string; username: string; status: 'active'; created: boolean };
    /** The org joined (a realm invite also joins the realm's org). */
    org: { id: string; slug: string };
    realm: { id: string; slug: string } | null;
    membership: { role: string; status: string };
    /** The new session when accepting signed the person in (CLI: with the bearer token). */
    session?: LoginData | CliLoginData;
}

/** A declined invite. */
export interface InvitationDeclinedData {
    decision: 'decline';
}

/** `invitations/accept` */
export type InvitationsAcceptData = InvitationAcceptedData | InvitationDeclinedData;
