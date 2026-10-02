/**
 * Manage › Organization — request schema (Zod, SoT for the inbound body) and response data.
 *
 * Routes (controllers/org_page_controller.ts):
 *   POST /v1/org_page/get — the org with members, roles, scopes, pending invites and the permission catalogue
 *
 * BFF composition over Core: orgs/get_by_id, invitations/get { target_type: 'org', status: 'pending' }, permissions/list.
 */

import { z } from 'zod';
import type { OrgDetailData } from './orgs_types.js';
import type { InvitationListItemData } from './invitations_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/org_page/get */
export const OrgPageGetInput = z.object({
    org_id: z.string().uuid()
        .describe('Org UUID'),
});
export type OrgPageGetInput = z.infer<typeof OrgPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** `org_page/get` */
export interface OrgPageData {
    /** The org: status, owner, members (active, pending and former), roles, scopes. */
    org: OrgDetailData;
    /** Pending org invites with their deliveries; null when the caller may not see them. */
    invites: InvitationListItemData[] | null;
    /** Permission catalogue for the role editor; null when it could not be read. */
    permissions: { all: string[]; owner_only: string[] } | null;
    /** Invites or permissions failed to load. */
    partial: boolean;
}
