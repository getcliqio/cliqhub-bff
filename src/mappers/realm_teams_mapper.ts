/** Realm › Teams — Core realm-mode `teams/get` items → realm team rows. */

import type { TeamVO } from '../types/core/teams.js';
import type { RealmTeamRowData } from '../schemas/realm_teams_types.js';

/** True when `latest` is a higher dotted version than `current`. */
export function is_newer(latest: string | null | undefined, current: string | null | undefined): boolean {
    if (!latest || !current || latest === current) return false;
    const parse = (v: string) => v.replace(/^v/, '').split(/[.+-]/).map((x) => Number.parseInt(x, 10));
    const a = parse(latest);
    const b = parse(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = Number.isFinite(a[i]) ? a[i] : 0;
        const y = Number.isFinite(b[i]) ? b[i] : 0;
        if (x !== y) return x > y;
    }
    return false;
}

/**
 * One realm coverage item → a realm team row.
 *
 * @param r - Core realm-mode item (`slug`, `label`, coverage fields).
 * @param scope - Scope parsed from the label (or Core's `scope`).
 * @param slug - Team slug.
 * @param latest_version - Latest published version, or null when unknown / not published.
 */
export function to_realm_team_row(r: TeamVO, scope: string | null, slug: string, latest_version: string | null): RealmTeamRowData {
    return {
        scope,
        slug,
        label: r.label ?? (scope ? `@${scope}/${slug}` : slug),
        version: r.version ?? null,
        latest_version,
        update_available: is_newer(latest_version, r.version),
        origin: r.origin ?? 'local',
        in_team_list: Boolean(r.in_team_list),
        installed_count: r.installed_count ?? 0,
        online_daemon_count: r.online_daemon_count ?? 0,
        last_run_at: r.last_run_at ?? null,
        missing_agents: r.missing_agents ?? [],
    };
}

/** `@scope/slug` → { scope, slug } (Core's realm coverage rows carry the label). */
export function parse_label(label: string | undefined, fallback_slug: string): { scope: string | null; slug: string } {
    const m = /^@?([^/]+)\/(.+)$/.exec(label ?? '');
    return m ? { scope: m[1], slug: m[2] } : { scope: null, slug: fallback_slug };
}
