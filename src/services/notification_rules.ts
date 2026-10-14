/**
 * Notification rules — pure routing logic behind the notification center
 * (service-layer helper; no I/O). Mirrors Core's `NotificationService.resolve_rules`
 * so what the console shows matches what actually fires:
 *
 *   - a rule's `event` is a selector: exact type, family wildcard (`run.*`) or `*`
 *   - tiers: realm → org; the first tier with ANY matching
 *     rule wins, and all its matching rules fire ("replace" semantics)
 */

import type {
    NotifEventRuleData, NotifRealmEventData, NotifRealmEventStatus, NotifRuleData, NotifScopeKind,
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

/** Resolve one event for a realm from the rules in play there (realm rules, else org rules). */
export function resolve_event<T extends TieredRule>(event: string, rules: T[]): { winners: T[]; replaced: T[] } {
    const matching = rules.filter((r) => selector_matches(r.event, event));
    if (matching.length === 0) return { winners: [], replaced: [] };
    const top = Math.max(...matching.map((r) => TIER_RANK[r.tier]));
    return {
        winners: matching.filter((r) => TIER_RANK[r.tier] === top),
        replaced: matching.filter((r) => TIER_RANK[r.tier] < top),
    };
}

/** For each rule, list broader-tier rules in the same context whose selectors overlap (sets `replaces` in place). */
export function mark_replaces(rules: NotifRuleData[]): void {
    for (const r of rules) {
        if (r.scope.kind === 'org') continue;
        r.replaces = rules
            .filter((b) => TIER_RANK[b.scope.kind] < TIER_RANK[r.scope.kind])
            .filter((b) => b.scope.org_id === r.scope.org_id)
            .filter((b) => b.scope.kind === 'org' || b.scope.realm_id === r.scope.realm_id)
            .filter((b) => selectors_overlap(b.event, r.event))
            .map((b) => b.id);
    }
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
        case 'email': return d.account === true ? 'Account email' : String(d.address ?? d.to ?? 'email');
        case 'webhook': return `Webhook · ${host_of(d.url)}`;
        case 'http': return `${String(d.method ?? 'POST')} · ${host_of(d.url)}`;
        case 'jira': return `Jira · ${String(d.project_key ?? '')} (${host_of(d.url)})`;
        case 'channel_ref': return `→ channel ${String(d.name ?? '')}`;
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
}

/**
 * Each event as it stands in one realm — the rows of the realm's Notifications page. One row per
 * selector any org or realm rule names (exact events and wildcards), matched the way Core delivers:
 *   - the realm has rules for it → `off` when all are switched off, else `replaced` (the org covers it
 *     too) or `realm_only`
 *   - a broader realm selector covers it (realm `run.*` over the org's `run.failed`) → `replaced`, `via` set
 *   - else the org's covering rules → `default`, or `paused` when the org switched them all off
 * Sorted by event.
 */
export function realm_events(
    org_rules: EventRuleInput[],
    realm_rules: EventRuleInput[],
    channel: (id: string) => { name: string; enabled: boolean } | undefined,
): NotifRealmEventData[] {
    const entry = (r: EventRuleInput, tier: NotifScopeKind): NotifEventRuleData => ({
        rule_id: r.id, selector: r.event, tier, channel_id: r.channel_id,
        channel_name: channel(r.channel_id)?.name ?? null,
        channel_enabled: channel(r.channel_id)?.enabled ?? true,
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
        let status: NotifRealmEventStatus;
        if (realm.length) status = realm.every((r) => r.enabled === false) ? 'off' : org.length ? 'replaced' : 'realm_only';
        else status = org.every((r) => r.enabled === false) ? 'paused' : 'default';
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
