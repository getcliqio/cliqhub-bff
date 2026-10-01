/**
 * Pure notification-routing logic used by the BFF notification center.
 * Mirrors Core's NotificationService.resolve_rules so what the console
 * shows matches what actually fires:
 *
 *   - a rule's `event` is a selector: exact type, family wildcard (`run.*`) or `*`
 *   - tiers: team-in-realm → realm → org; the first tier with ANY matching
 *     rule wins, and all its matching rules fire ("replace" semantics)
 */
import type { NotifScopeKind } from '../types/dto.js';

/** Selectors that match a concrete event: exact, its family wildcard, and `*`. */
export function matching_selectors(event: string): string[] {
    const out = [event];
    const dot = event.indexOf('.');
    if (dot > 0) out.push(`${event.slice(0, dot + 1)}*`);
    out.push('*');
    return out;
}

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

export const TIER_RANK: Record<NotifScopeKind, number> = { team: 3, realm: 2, org: 1 };

export interface Tiered_rule {
    id: string;
    event: string;
    channel_id: string;
    tier: NotifScopeKind;
}

/** Resolve one event for a realm (+ optional team) from the rules in play there. */
export function resolve_event<T extends Tiered_rule>(event: string, rules: T[]): { winners: T[]; replaced: T[] } {
    const matching = rules.filter((r) => selector_matches(r.event, event));
    if (matching.length === 0) return { winners: [], replaced: [] };
    const top = Math.max(...matching.map((r) => TIER_RANK[r.tier]));
    return {
        winners: matching.filter((r) => TIER_RANK[r.tier] === top),
        replaced: matching.filter((r) => TIER_RANK[r.tier] < top),
    };
}

function mask(v: string, keep = 4): string {
    return v.length <= keep ? '••••' : `••••${v.slice(-keep)}`;
}

function host_of(url: unknown): string {
    try {
        return new URL(String(url)).host;
    } catch {
        return 'invalid url';
    }
}

/** Short, secret-free description of a destination. */
export function destination_label(d: { type: string; [k: string]: unknown }): string {
    switch (d.type) {
        case 'slack': return `Slack webhook ${mask(String(d.webhook_url ?? ''))}`;
        case 'email': return String(d.address ?? d.to ?? 'email');
        case 'webhook': return `Webhook · ${host_of(d.url)}`;
        case 'http': return `${String(d.method ?? 'POST')} · ${host_of(d.url)}`;
        case 'jira': return `Jira · ${String(d.project_key ?? '')} (${host_of(d.url)})`;
        case 'channel_ref': return `→ channel ${String(d.name ?? '')}`;
        case 'cliqhub': return 'In-app (CliqHub)';
        default: return d.type;
    }
}
