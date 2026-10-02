/**
 * Inbox — the caller's in-app notifications across orgs (request schema + response data).
 *
 * Routes (controllers/inbox_controller.ts):
 *   POST /v1/inbox/get — one page of notifications, newest first
 *
 * BFF composition over Core: `/v1/orgs/get { mine }` → per org `/v1/notifications/get`.
 * The bell summary (`InboxSummaryInput` → `NotifInboxSummaryData`) is served inside `/v1/overview/get`.
 */

import { z } from 'zod';
import type { OrgListItemVO } from '../types/core/orgs.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/inbox/get — filters AND-ed; page backwards with `until_ms`. */
export const InboxGetInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('Only this org (the caller must belong to it)'),
    realm_id: z.string().trim().min(1).max(200).optional()
        .describe('Only this realm (Core intersects with membership)'),
    types: z.array(z.string().trim().min(1).max(120)).max(50).optional()
        .describe('Exact event types'),
    q: z.string().trim().min(1).max(200).optional()
        .describe('Match on title, message, event, team or run id'),
    since_ms: z.number().int().nonnegative().optional()
        .describe('From this time (unix ms)'),
    until_ms: z.number().int().nonnegative().optional()
        .describe('Cursor: `next_until_ms` of the previous page'),
    limit: z.number().int().min(1).max(100).optional()
        .describe('Page size (max 100)'),
}).strict();
export type InboxGetInput = z.infer<typeof InboxGetInput>;

/** Bell summary request — internal (OverviewService), not a route body. */
export interface InboxSummaryInput {
    /** Orgs to look at (the overview's orgs, already membership-checked). */
    orgs: OrgListItemVO[];
    /** When the user last opened the inbox (unix ms); newer rows count as new. */
    seen_ms: number;
}

// ─── Response data ──────────────────────────────────────────────────────────

/** One in-app notification with its link targets. */
export interface NotifInboxItemData {
    id: string;
    event: string;
    title: string | null;
    message: string | null;
    severity: string | null;
    /** Org whose inbox returned this row; null for account-wide rows. */
    org_id: string | null;
    org_slug: string | null;
    realm_id: string | null;
    realm_slug: string | null;
    team: string | null;
    run_id: string | null;
    phase: string | null;
    /** Promoted from payload for links: hug.* → review, notification.failed → channel. */
    review_id: string | null;
    channel_id: string | null;
    original_event: string | null;
    at: number;
}

/** An org the inbox read, and whether its read failed. */
export interface NotifInboxOrgData {
    id: string;
    slug: string;
    display_name: string;
    status: 'ok' | 'error';
    error: string | null;
}

/** `inbox/get` — one page of notifications across the caller's orgs. */
export interface NotifInboxData {
    items: NotifInboxItemData[];
    /** Pass back as `until_ms` for the next page; null when there is nothing older. */
    next_until_ms: number | null;
    orgs: NotifInboxOrgData[];
    partial: boolean;
}

/** Bell summary returned with the overview. */
export interface NotifInboxSummaryData {
    /** Rows newer than `inbox_seen_ms` among the newest SUMMARY_WINDOW per org. */
    new_count: number;
    /** True when new_count hit the window (show "20+"). */
    capped: boolean;
    latest: NotifInboxItemData[];
    status: 'ok' | 'partial' | 'error';
}
