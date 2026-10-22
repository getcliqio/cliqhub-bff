/**
 * Notification rules — pure routing logic behind the notification center
 * (service-layer helper; no I/O). Mirrors Core's `NotificationService.resolve_rules`
 * so what the console shows matches what actually fires:
 *
 *   - a rule's `event` is a selector: exact type, family wildcard (`run.*`) or `*`
 *   - the org's rules and a realm's own rules both apply: a realm's rule adds to the org's for that
 *     realm, never replaces it (PLAN-notifications-v2 B1)
 */

import type {
    NotifEventGroupData, NotifEventRowData, NotifEventRuleData, NotifRealmEventData, NotifRealmEventStatus, NotifRuleData, NotifScopeKind,
} from '../schemas/notification_center_types.js';
import type { NotifDestinationVO } from '../types/core/notifications.js';

/** A rule reduced to what tier resolution needs. */
export interface TieredRule {
    id: string;
    /** Event selector (exact, `family.*` or `*`). */
    event: string;
    channel_id: string;
    tier: NotifScopeKind;
}

/** Tier specificity: higher wins (realm > org). */
export const TIER_RANK: Record<NotifScopeKind, number> = { realm: 2, org: 1 };

/** Selectors that match a concrete event: exact, its family wildcard, and `*`. */
export function matching_selectors(event: string): string[] {
    const out = [event];
    const dot = event.indexOf('.');
    if (dot > 0) out.push(`${event.slice(0, dot + 1)}*`);
    out.push('*');
    return out;
}

/** Does `selector` match the concrete `event`? */
export function selector_matches(selector: string, event: string): boolean {
    return matching_selectors(event).includes(selector);
}

/** Do two selectors match at least one common event? */
export function selectors_overlap(a: string, b: string): boolean {
    if (a === b || a === '*' || b === '*') return true;
    const fam = (s: string) => (s.endsWith('.*') ? s.slice(0, -1) : null);
    const fa = fam(a);
    const fb = fam(b);
    if (fa && fb) return fa === fb;
    if (fa) return b.startsWith(fa);
    if (fb) return a.startsWith(fb);
    return false;
}

/** Resolve one event for a realm: every matching rule, the org's and the realm's — both apply (none is replaced). */
export function resolve_event<T extends TieredRule>(event: string, rules: T[]): { winners: T[]; replaced: T[] } {
    return { winners: rules.filter((r) => selector_matches(r.event, event)), replaced: [] };
}

/** No rule replaces another (org and realm rules both apply): `replaces` is always empty. */
export function mark_replaces(rules: NotifRuleData[]): void {
    for (const r of rules) r.replaces = [];
}

/** Group by event, then broad → specific so overrides read top-down. */
export function sort_rules(rules: NotifRuleData[]): NotifRuleData[] {
    return [...rules].sort((a, b) =>
        a.event.localeCompare(b.event)
        || TIER_RANK[a.scope.kind] - TIER_RANK[b.scope.kind]
        || (a.scope.realm_slug ?? '').localeCompare(b.scope.realm_slug ?? ''));
}

/** `••••` plus the last `keep` characters (all dots when too short to show any). */
function mask(v: string, keep = 4): string {
    return v.length <= keep ? '••••' : `••••${v.slice(-keep)}`;
}

/** Host of a destination URL, for labels. */
function host_of(url: unknown): string {
    try {
        return new URL(String(url)).host;
    } catch {
        // A malformed stored URL is data, not a fault: the label says so instead (pure helper, nothing to log).
        return 'invalid url';
    }
}

/** Short, secret-free description of a destination. */
export function destination_label(d: NotifDestinationVO): string {
    switch (d.type) {
        case 'slack': return `Slack webhook ${mask(String(d.webhook_url ?? ''))}`;
        case 'email': return d.members === true ? "Email · each member's own address" : d.account === true ? 'Account email' : String(d.address ?? d.to ?? 'email');
        case 'webhook': return `Webhook · ${host_of(d.url)}`;
        case 'http': return `${String(d.method ?? 'POST')} · ${host_of(d.url)}`;
        case 'jira': return `Jira · ${String(d.project_key ?? '')} (${host_of(d.url)})`;
        case 'channel_ref': return String(d.name ?? '');
        case 'cliqhub': return 'In-app (CliqHub)';
        default: return d.type;
    }
}

/** What `realm_events` needs to know about a rule. */
export interface EventRuleInput {
    id: string;
    event: string;
    channel_id: string;
    enabled?: boolean;
    locked?: boolean;
    lock_reason?: string | null;
    /** A rule to a person (their personal channel): who. */
    person?: { user_id: string; username: string; display_name: string | null } | null;
}

/** What a rule's chip shows: the channel's name, or the person's. */
function target_of(r: EventRuleInput, channel: (id: string) => { name: string; enabled: boolean } | undefined): { channel_name: string | null; channel_enabled: boolean; person: boolean } {
    if (r.person) return { channel_name: r.person.display_name || r.person.username, channel_enabled: true, person: true };
    return { channel_name: channel(r.channel_id)?.name ?? null, channel_enabled: channel(r.channel_id)?.enabled ?? true, person: false };
}

/**
 * Each event as it stands in one realm — the rows of the realm's Notifications page. One row per
 * selector any org or realm rule names (exact events and wildcards), matched the way Core delivers —
 * the org's rules and the realm's own both apply:
 *   - org and realm rules → `both` while a realm rule is on; with the realm's off, `default` (the org's
 *     still send) or `off` (the org's are paused too)
 *   - only realm rules → `realm_only`, or `off` when they're all switched off
 *   - only the org's → `default`, or `paused` when the org switched them all off
 *   - a broader realm selector covers it (realm `run.*` with the org's `run.failed`) → `via` set
 * Sorted by event.
 */
export function realm_events(
    org_rules: EventRuleInput[],
    realm_rules: EventRuleInput[],
    channel: (id: string) => { name: string; enabled: boolean } | undefined,
): NotifRealmEventData[] {
    const entry = (r: EventRuleInput, tier: NotifScopeKind): NotifEventRuleData => ({
        rule_id: r.id, selector: r.event, tier, channel_id: r.channel_id,
        ...target_of(r, channel),
        enabled: r.enabled !== false, locked: r.locked === true, lock_reason: r.lock_reason ?? null,
    });
    // A rule with selector `s` covers row `e` when `s` is one of e's matching selectors.
    const covering = (rules: EventRuleInput[], e: string) => rules.filter((r) => matching_selectors(e).includes(r.event));
    const selectors = [...new Set([...org_rules, ...realm_rules].map((r) => r.event))].sort();
    return selectors.map((e) => {
        const org = covering(org_rules, e);
        const own = realm_rules.filter((r) => r.event === e);
        const broader = own.length ? [] : covering(realm_rules, e);
        const realm = own.length ? own : broader;
        const org_on = org.some((r) => r.enabled !== false);
        const realm_on = realm.some((r) => r.enabled !== false);
        let status: NotifRealmEventStatus;
        if (realm.length && org.length) status = realm_on ? 'both' : org_on ? 'default' : 'off';
        else if (realm.length) status = realm_on ? 'realm_only' : 'off';
        else status = org_on ? 'default' : 'paused';
        return {
            event: e,
            status,
            locked: org.some((r) => r.locked === true),
            via: broader.length ? broader[0].event : null,
            org: org.map((r) => entry(r, 'org')),
            realm: realm.map((r) => entry(r, 'realm')),
        };
    });
}

/** A rule as the Events read sees it. */
export interface EventsRuleInput extends EventRuleInput {
    system_key?: string | null;
}

/**
 * Every event — whether or not a rule sends it — grouped by family (`run`, `phase`, …, in the order the
 * catalog lists them), each with the org's rules and (in a realm view) the realm's own rules that reach it,
 * matched the way Core delivers (exact, `family.*`, `*`): the rows of the Events page (C2).
 *
 * @param realm_rules - The realm's own rules in a realm view; null in an org view.
 */
export function event_groups(
    event_types: string[],
    org_rules: EventsRuleInput[],
    realm_rules: EventsRuleInput[] | null,
    channel: (id: string) => { name: string; enabled: boolean } | undefined,
): NotifEventGroupData[] {
    const entry = (r: EventsRuleInput, tier: NotifScopeKind): NotifEventRuleData => ({
        rule_id: r.id, selector: r.event, tier, channel_id: r.channel_id,
        ...target_of(r, channel),
        enabled: r.enabled !== false, locked: r.locked === true, lock_reason: r.lock_reason ?? null,
    });
    const covering = (rules: EventsRuleInput[], e: string) => rules.filter((r) => matching_selectors(e).includes(r.event));
    const groups = new Map<string, NotifEventRowData[]>();
    for (const e of event_types) {
        const dot = e.indexOf('.');
        const family = dot > 0 ? e.slice(0, dot) : e;
        const org = covering(org_rules, e);
        const realm = realm_rules ? covering(realm_rules, e) : [];
        const all = [...org, ...realm];
        const row: NotifEventRowData = {
            event: e,
            sent: all.some((r) => r.enabled !== false && target_of(r, channel).channel_enabled),
            fixed: all.some((r) => r.locked === true),
            built_in: all.some((r) => Boolean(r.system_key)),
            org: org.map((r) => entry(r, 'org')),
            realm: realm.map((r) => entry(r, 'realm')),
        };
        const list = groups.get(family) ?? [];
        list.push(row);
        groups.set(family, list);
    }
    const whole = (rules: EventsRuleInput[] | null, family: string, tier: NotifScopeKind) =>
        (rules ?? []).filter((r) => r.event === `${family}.*`).map((r) => entry(r, tier));
    return [...groups.entries()].map(([family, events]) => ({
        family,
        family_rules: { org: whole(org_rules, family, 'org'), realm: whole(realm_rules, family, 'realm') },
        events,
    }));
}
