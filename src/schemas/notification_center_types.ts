/**
 * Notification center — every notification rule and channel the user can see,
 * who gets told for each event, and bulk rule writes (request schemas + response data).
 *
 * Routes (controllers/notification_center_controller.ts):
 *   POST /v1/notification_center/get        — rules + channels by org and realm
 *   POST /v1/notification_center/check      — who is told for each event in a realm (or team)
 *   POST /v1/notification_center/set_rules  — one rule per event at one level, one channel
 *
 * BFF composition over Core: `/v1/orgs/get { mine }` → per org `/v1/orgs/get_notification_rules`
 * + `/v1/notification_channels/get`; a page of `/v1/realms/get` → per realm rules + channels;
 * `/v1/events/types/list`. Writes loop Core's single-rule `/v1/{orgs,realms}/set_notification_rules`.
 */

import { z } from 'zod';

// ─── Shared field fragments ─────────────────────────────────────────────────

const RealmIdField = z.string().trim().min(1).max(200);
const TeamSlugField = z.string().trim().min(1).max(200);

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/notification_center/get */
export const NotificationCenterGetInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('Only this org (the caller must belong to it)'),
    realm_id: RealmIdField.optional()
        .describe('Only this realm (plus org-wide rules that reach it)'),
    realm_q: z.string().trim().min(1).max(200).optional()
        .describe('Search realms by slug or name'),
    realm_limit: z.number().int().min(1).max(50).optional()
        .describe('Realms per page (default 10)'),
    realm_offset: z.number().int().min(0).optional()
        .describe('Zero-based realm page offset'),
}).strict();
export type NotificationCenterGetInput = z.infer<typeof NotificationCenterGetInput>;

/** POST /v1/notification_center/check — after org, realm and team rules are applied. */
export const NotificationCenterCheckInput = z.object({
    realm_id: RealmIdField
        .describe('Realm to check'),
    team_slug: TeamSlugField.optional()
        .describe('Also apply this team\'s rules'),
}).strict();
export type NotificationCenterCheckInput = z.infer<typeof NotificationCenterCheckInput>;

/** POST /v1/notification_center/set_rules — org-wide (`org_id`), realm (`realm_id`) or team (`realm_id` + `team_slug`). */
export const NotificationCenterSetRulesInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('Org-wide rules (omit when realm_id is set)'),
    realm_id: RealmIdField.optional()
        .describe('Realm rules, or team rules with team_slug'),
    team_slug: TeamSlugField.optional()
        .describe('Team the rules are for (needs realm_id)'),
    events: z.array(z.string().trim().min(1).max(200)).min(1).max(60)
        .describe('Event selectors: exact, family wildcard (run.*) or *'),
    channel_id: z.string().trim().min(1).max(200)
        .describe('Channel every rule sends to'),
}).strict().superRefine((b, ctx) => {
    if (!b.realm_id && !b.org_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['org_id'], message: 'org_id or realm_id is required' });
    if (b.team_slug && !b.realm_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['team_slug'], message: 'team_slug needs realm_id' });
});
export type NotificationCenterSetRulesInput = z.infer<typeof NotificationCenterSetRulesInput>;

// ─── Viewer ─────────────────────────────────────────────────────────────────

/** Who is looking — the effective user (take-over aware); decides what is editable. */
export interface NotifViewer {
    user_id: string;
    site_admin: boolean;
}

// ─── Response data ──────────────────────────────────────────────────────────

/** Tier a rule applies at (narrowest wins). */
export type NotifScopeKind = 'org' | 'realm' | 'team';

/** Where a rule applies: an org, a realm, or one team in a realm. */
export interface NotifScopeData {
    kind: NotifScopeKind;
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
    team_slug: string | null;
}

/** One delivery target of a channel, for display. */
export interface NotifDestinationData {
    type: string;
    /** Human summary, secrets masked (e.g. "#hooks.slack.com/…4f1", "ops@acme.com"). */
    label: string;
}

/** Who owns a channel: an org, a realm, or one user (personal). */
export interface NotifChannelOwnerData {
    kind: 'org' | 'realm' | 'personal';
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
}

/** A notification channel with its destinations and how many rules use it. */
export interface NotifChannelData {
    id: string;
    name: string;
    owner: NotifChannelOwnerData;
    destinations: NotifDestinationData[];
    enabled: boolean;
    rule_count: number;
    /** Set on the channels every org is seeded with (e.g. `org.email`). */
    system_key: string | null;
    /** Cannot be changed or removed; the UI disables its controls. */
    locked: boolean;
    /** Why the channel is locked; null when it isn't. */
    lock_reason: string | null;
}

/** A notification rule: event selector → channel at a scope. */
export interface NotifRuleData {
    id: string;
    event: string;
    scope: NotifScopeData;
    channel_id: string;
    channel_name: string | null;
    priority: number;
    /** Broader rules this one replaces (same org/realm, overlapping event selector). */
    replaces: string[];
    /** Who the rule tells: `invitee`, `org_owners`, `inviter` or user ids; empty → the channel's own destinations. */
    recipients: string[];
    /** Set on the rules every org is seeded with (e.g. `invite.sent.invitee`). */
    system_key: string | null;
    /** Cannot be changed or removed; the UI shows `lock_reason`. */
    locked: boolean;
    lock_reason: string | null;
}

/** An org the center read, and whether the viewer may edit its org-wide rules and channels. */
export interface NotifOrgData {
    id: string;
    slug: string;
    display_name: string;
    role: string;
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change org-wide rules (Core `rules.manage`: org owners and site admins). */
    can_edit: boolean;
    /** May add/change org channels (Core `channels.manage`). */
    can_edit_channels: boolean;
}

/** A realm on the current page, and whether the viewer may edit its rules. */
export interface NotifRealmData extends NotifRealmRefData {
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change realm + team rules and realm channels (`rules.manage.realm` or realm admin). */
    can_edit: boolean;
}

/** Paging / search state of the realm list. */
export interface NotifRealmPageData {
    offset: number;
    limit: number;
    /** Realms matching `q` in the view (all pages). */
    total: number;
    q: string | null;
    status: 'ok' | 'error';
    error: string | null;
}

/** `notification_center/get` — orgs, one page of realms, channels, rules and event types. */
export interface NotificationCenterData {
    orgs: NotifOrgData[];
    /** Only the realms on this page (see realm_page); their rules and channels are included. */
    realms: NotifRealmData[];
    realm_page: NotifRealmPageData;
    channels: NotifChannelData[];
    rules: NotifRuleData[];
    event_types: string[];
    partial: boolean;
}

/** One rule matching an event in `check`. */
export interface NotifCheckEntryData {
    rule_id: string;
    /** The rule's event selector (exact, `family.*` or `*`). */
    selector: string;
    tier: NotifScopeKind;
    channel_id: string;
    channel_name: string | null;
}

/** `check` row: which rules fire for one event and which broader ones they replace. */
export interface NotifCheckRowData {
    event: string;
    /** Rules that fire for this event here (all at the winning tier). */
    winners: NotifCheckEntryData[];
    /** Broader-tier rules that also match but are replaced. */
    replaced: NotifCheckEntryData[];
}

/** A realm with the org it belongs to. */
export interface NotifRealmRefData {
    id: string;
    slug: string;
    name: string;
    org_id: string;
    org_slug: string;
}

/** `notification_center/check` — who gets told for each event in a realm (or team). */
export interface NotificationCheckData {
    realm: NotifRealmRefData;
    team_slug: string | null;
    /** Teams you can check in this realm (from the realm roster and existing team rules). */
    teams: string[];
    rows: NotifCheckRowData[];
    partial: boolean;
}

/** One event `set_rules` could not save, with Core's error code and details (e.g. `locked`, `{ system_key }`). */
export interface NotifSetRuleFailureData {
    event: string;
    error: string;
    code: string | null;
    details: Record<string, unknown> | null;
}

/** POST /v1/notification_center/set_rules */
export interface NotifSetRulesData {
    saved: Array<{ event: string; rule_id: string }>;
    failed: NotifSetRuleFailureData[];
}
