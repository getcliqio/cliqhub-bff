/**
 * Manage › Agents — Core agent / settings shapes → agent list and agent page data.
 *
 * Secret values never reach the browser: Core masks them for callers without
 * agents.reveal, and `to_agent_fields_data` masks again regardless.
 */

import type { AgentSettingsVO, AgentUsedByVO, AgentVO } from '../types/core/agents.js';
import type { AgentFieldData, AgentRealmData, AgentUsedByData } from '../schemas/agent_page_types.js';
import { is_newer } from './realm_teams_mapper.js';

const SECRET_SEGMENTS = new Set(['key', 'apikey', 'token', 'secret', 'password', 'passwd', 'pat', 'credentials']);

/** Explicit `secret` flag wins; otherwise the last key segment names a secret (`api_token`, `github.token`). */
export function is_secret(key: string, def?: { secret?: boolean }): boolean {
    if (def?.secret === true) return true;
    if (def?.secret === false) return false;
    return SECRET_SEGMENTS.has(key.toLowerCase().split(/[._-]/).filter(Boolean).pop() ?? '');
}

/** `••••` + last 4 for long values, `••••` for short ones; already-masked values pass through. */
export function mask(value: string): string {
    if (!value) return value;
    if (value.startsWith('••••')) return value; // already masked by Core
    return value.length >= 12 ? `••••${value.slice(-4)}` : '••••';
}

/** Newest row per agent name (semver), plus all its versions. */
export function group_versions(rows: AgentVO[]): Array<{ head: AgentVO; all: AgentVO[] }> {
    const by = new Map<string, AgentVO[]>();
    for (const r of rows) by.set(r.name, [...(by.get(r.name) ?? []), r]);
    return [...by.values()].map((all) => {
        const sorted = [...all].sort((a, b) => (is_newer(a.version, b.version) ? -1 : is_newer(b.version, a.version) ? 1 : (b.created_at ?? 0) - (a.created_at ?? 0)));
        return { head: sorted[0], all: sorted };
    });
}

/** Core usage rows → used-by with realm slugs (null when Core sent no usage). */
export function to_agent_used_by_data(list: AgentUsedByVO[] | undefined, realms: Map<string, AgentRealmData>): AgentUsedByData[] | null {
    if (!list) return null;
    return list.map((u) => ({ scope: u.scope, name: u.name, version: u.version, realms: u.realm_ids.map((id) => ({ id, slug: realms.get(id)?.slug ?? id })) }));
}

/** Keys whose effective value comes from the realm. */
export function overrides_of(s: AgentSettingsVO | null | undefined): string[] {
    if (!s) return [];
    return Object.entries(s.source ?? {}).filter(([, v]) => v === 'realm').map(([k]) => k);
}

/**
 * The settings form for a scope: every declared key with its (masked) value and
 * source; in realm scope also the org default underneath.
 */
export function to_agent_fields_data(scope: AgentSettingsVO, org: AgentSettingsVO | null, realm_scope: boolean): AgentFieldData[] {
    const req = new Set(scope.settings.required.map((d) => d.key));
    return [...scope.settings.required, ...scope.settings.optional].map((d) => {
        const secret = is_secret(d.key, d);
        const raw = scope.values?.[d.key] ?? '';
        const org_raw = org?.values?.[d.key] ?? '';
        return {
            key: d.key,
            description: d.description ?? null,
            default: d.default !== undefined && d.default !== null ? String(d.default) : null,
            when: d.when && Object.keys(d.when).length ? d.when : null,
            required: req.has(d.key),
            secret,
            value: raw ? (secret ? mask(raw) : raw) : null,
            set: Boolean(raw),
            source: raw ? (scope.source?.[d.key] ?? 'org') : null,
            org_value: realm_scope ? (org_raw ? (secret ? mask(org_raw) : org_raw) : null) : null,
        };
    });
}
