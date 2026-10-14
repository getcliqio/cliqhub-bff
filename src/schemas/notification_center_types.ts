/**
 * Notification center — every notification rule and channel the user can see,
 * who gets told for each event, and bulk rule writes (request schemas + response data).
 *
 * Routes (controllers/notification_center_controller.ts):
 *   POST /v1/notification_center/get        — rules + channels by org and realm
 *   POST /v1/notification_center/check      — who is told for each event in a realm
 *   POST /v1/notification_center/set_rules  — rule writes at one level: one channel for many events,
 *                                             listed rules (event + channel + on/off), and removals
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

/** POST /v1/notification_center/check — after org and realm rules are applied. */
export const NotificationCenterCheckInput = z.object({
    realm_id: RealmIdField
        .describe('Realm to check'),
}).strict();
export type NotificationCenterCheckInput = z.infer<typeof NotificationCenterCheckInput>;

/** POST /v1/notification_center/set_rules — org-wide (`org_id`) or realm (`realm_id`). */
export const NotificationCenterSetRulesInput = z.object({
    org_id: z.string().uuid().optional()
        .describe('Org-wide rules (omit when realm_id is set)'),
    realm_id: RealmIdField.optional()
        .describe('Realm rules'),
    events: z.array(z.string().trim().min(1).max(200)).min(1).max(60).optional()
        .describe('Event selectors (exact, family wildcard run.* or *), each sent to `channel_id`'),
    channel_id: z.string().trim().min(1).max(200).optional()
        .describe('Channel every rule in `events` sends to'),
    enabled: z.boolean().optional()
        .describe('On/off for the `events` rules (new rules are on; omitted keeps an existing rule\'s state)'),
    items: z.array(z.object({
        event: z.string().trim().min(1).max(200),
        channel_id: z.string().trim().min(1).max(200),
        enabled: z.boolean().optional(),
    }).strict()).min(1).max(60).optional()
        .describe('Rules to create or update, each with its own channel and on/off (Replace, Turn off, a switch)'),
    remove: z.array(z.string().uuid()).min(1).max(60).optional()
        .describe('Rule ids to delete first (Reset, Remove)'),
}).strict().superRefine((b, ctx) => {
    if (!b.realm_id && !b.org_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['org_id'], message: 'org_id or realm_id is required' });
    if (b.events && !b.channel_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['channel_id'], message: 'channel_id is required with events' });
    if (!b.events && !b.items && !b.remove) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Nothing to do: give events, items or remove' });
});
export type NotificationCenterSetRulesInput = z.infer<typeof NotificationCenterSetRulesInput>;

// ─── Viewer ─────────────────────────────────────────────────────────────────

/** Who is looking — the effective user (take-over aware); decides what is editable. */
export interface NotifViewer {
    user_id: string;
    site_admin: boolean;
}

// ─── Response data ──────────────────────────────────────────────────────────

/** Tier a rule applies at (a realm's rules replace the org's for that realm). */
export type NotifScopeKind = 'org' | 'realm';

/** Where a rule applies: an org or a realm. */
export interface NotifScopeData {
    kind: NotifScopeKind;
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
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
    /** The person a personal channel belongs to (`kind: 'personal'`); null otherwise. */
    user_id: string | null;
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
    /** Set on the rules every org is seeded with (e.g. `invite.sent.invitee`). */
    system_key: string | null;
    /** Cannot be changed or removed; the UI shows `lock_reason`. */
    locked: boolean;
    lock_reason: string | null;
    /** Switched on. A rule sends only when it and its channel are on. */
    enabled: boolean;
}

/** One rule behind a realm event row. */
export interface NotifEventRuleData {
    rule_id: string;
    /** The rule's event selector (exact, `family.*` or `*`). */
    selector: string;
    tier: NotifScopeKind;
    channel_id: string;
    channel_name: string | null;
    /** The channel itself is on (both must be on for the rule to send). */
    channel_enabled: boolean;
    enabled: boolean;
    locked: boolean;
    lock_reason: string | null;
}

/**
 * Where a realm event's rule comes from:
 * `default` the org's · `paused` the org's, all switched off by the org · `replaced` this realm's
 * (the org also covers the event) · `realm_only` this realm's, the org doesn't cover it ·
 * `off` this realm's rules for it are all switched off (nothing sends here).
 */
export type NotifRealmEventStatus = 'default' | 'paused' | 'replaced' | 'realm_only' | 'off';

/** One event (or selector) as it stands in a realm. */
export interface NotifRealmEventData {
    /** An exact event or a selector (`run.*`, `*`) some rule names. */
    event: string;
    status: NotifRealmEventStatus;
    /** The org's rule for it is locked: the realm can't replace or turn it off. */
    locked: boolean;
    /** A broader realm selector that replaces it (e.g. `run.*`), else null. */
    via: string | null;
    /** The org's rules covering it (what Default means here). */
    org: NotifEventRuleData[];
    /** This realm's rules for it (empty when `default` / `paused`). */
    realm: NotifEventRuleData[];
}

/** An org the center read, and whether the viewer may edit its org-wide rules and channels. */
export interface NotifOrgData {
    id: string;
    slug: string;
    display_name: string;
    role: string;
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change org-wide rules (Core `rules.manage`: owners, site admins and roles that hold it). */
    can_edit: boolean;
    /** May add/change org channels (Core `channels.manage`). */
    can_edit_channels: boolean;
}

/** A realm on the current page, and whether the viewer may edit its rules. */
export interface NotifRealmData extends NotifRealmRefData {
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change realm rules and realm channels (`rules.manage.realm` or realm admin). */
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
    /** With `realm_id`: each event as it stands in that realm (Default / Replaced / Off / …); else null. */
    realm_events: NotifRealmEventData[] | null;
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

/** `notification_center/check` — who gets told for each event in a realm. */
export interface NotificationCheckData {
    realm: NotifRealmRefData;
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
    /** Rule ids deleted (from `remove`). */
    removed: string[];
}
