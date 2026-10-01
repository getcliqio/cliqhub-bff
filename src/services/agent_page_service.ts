import type { CoreApiClient } from '../repositories/core_api_client.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { AgentListGetInput, AgentPageGetInput } from '../schemas/agent_page_schemas.js';
import { is_newer } from './realm_teams_service.js';

/**
 * Manage › Agents and Realm › Agents (BFF composition).
 *
 * Core routes used (all existing): agents/get {include_usage}, agents/get_details,
 * agents/get_settings (org, and per realm), realms/get, realms/get_by_id.
 *
 * Secret values never reach the browser: Core masks them for callers without
 * agents.reveal, and this service masks again regardless, so the web UI can
 * only show "set · ends in …" and replace a value — never read it back.
 */

type Setting_def = { key: string; description?: string; default?: unknown; when?: Record<string, string>; secret?: boolean };
type Settings_vo = {
    id: string; name: string; version: string | null; description: string | null; is_system: boolean;
    settings: { required: Setting_def[]; optional: Setting_def[] };
    values: Record<string, string>;
    source: Record<string, 'org' | 'realm' | null>;
    required_total: number; required_configured: number; all_required_configured: boolean;
};
type Used_by_vo = { scope: string; name: string; version: string | null; realm_ids: string[] };
type Agent_vo = {
    id: string; name: string; version: string | null; description: string | null; agent_type: string;
    is_system: boolean; created_at: number; updated_at: number; manifest?: Record<string, unknown>; used_by?: Used_by_vo[];
};
type Realm_lite = { id: string; slug: string; name: string };

export interface AgentUsedByDTO { scope: string; name: string; version: string | null; realms: Array<{ id: string; slug: string }> }
export interface AgentListRowDTO {
    id: string; name: string; version: string | null; versions: string[]; description: string | null;
    agent_type: string; is_system: boolean;
    /** Required-key status for the scope (org defaults, or the realm's effective values). */
    setup: { has_settings: boolean; required_total: number; required_configured: number; ready: boolean } | null;
    /** Realms that override keys (org view), or the keys this realm overrides (realm view: one entry). */
    overrides: Array<{ realm_id: string; realm_slug: string; keys: string[] }>;
    used_by: AgentUsedByDTO[] | null;
    /** Teams using it in this realm (realm view) or anywhere (org view). */
    used_count: number | null;
}
export interface AgentListDTO {
    org_id: string;
    realm: Realm_lite | null;
    items: AgentListRowDTO[];
    counts: { all: number; needs_setup: number; in_use: number | null; custom: number; builtin: number };
    /** In-use agents missing required keys, and how many teams that stops. */
    attention: { agents: string[]; teams: number } | null;
    realms_checked: number; realms_total: number;
    partial: boolean;
}

export interface AgentFieldDTO {
    key: string; description: string | null; default: string | null; when: Record<string, string> | null;
    required: boolean; secret: boolean;
    /** Effective value for the scope (masked when secret), null when unset. */
    value: string | null;
    set: boolean;
    /** Where the effective value comes from. */
    source: 'org' | 'realm' | null;
    /** Realm scope only: the org default underneath (masked when secret). */
    org_value: string | null;
}
export interface AgentSettingsViewDTO {
    scope: 'org' | 'realm';
    realm: Realm_lite | null;
    fields: AgentFieldDTO[];
    required_total: number; required_configured: number; ready: boolean;
}
export interface AgentRealmRowDTO {
    realm: Realm_lite; ready: boolean;
    keys: Record<string, 'org' | 'realm' | 'missing'>;
    used_here: string[];
}
export interface AgentPageDTO {
    org_id: string;
    agent: {
        id: string; name: string; version: string | null; description: string | null; agent_type: string; is_system: boolean;
        versions: Array<{ id: string; version: string | null; created_at: number; newest: boolean }>;
    };
    used_by: AgentUsedByDTO[] | null;
    settings: AgentSettingsViewDTO | null;
    /** Org-view summary of realm overrides (always, cheap: from `realms`). */
    overrides: Array<{ realm_id: string; realm_slug: string; keys: string[] }> | null;
    realms: AgentRealmRowDTO[] | null;
    required_keys: string[];
    manifest: Record<string, unknown> | null;
    partial: boolean;
}

const SECRET_SEGMENTS = new Set(['key', 'apikey', 'token', 'secret', 'password', 'passwd', 'pat', 'credentials']);
export function is_secret(key: string, def?: { secret?: boolean }): boolean {
    if (def?.secret === true) return true;
    if (def?.secret === false) return false;
    return SECRET_SEGMENTS.has(key.toLowerCase().split(/[._-]/).filter(Boolean).pop() ?? '');
}
export function mask(value: string): string {
    if (!value) return value;
    if (value.startsWith('••••')) return value; // already masked by Core
    return value.length >= 12 ? `••••${value.slice(-4)}` : '••••';
}

async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

/** Newest row per agent name (semver), plus all its versions. */
export function group_versions(rows: Agent_vo[]): Array<{ head: Agent_vo; all: Agent_vo[] }> {
    const by = new Map<string, Agent_vo[]>();
    for (const r of rows) by.set(r.name, [...(by.get(r.name) ?? []), r]);
    return [...by.values()].map((all) => {
        const sorted = [...all].sort((a, b) => (is_newer(a.version, b.version) ? -1 : is_newer(b.version, a.version) ? 1 : (b.created_at ?? 0) - (a.created_at ?? 0)));
        return { head: sorted[0], all: sorted };
    });
}

function used_by_dto(list: Used_by_vo[] | undefined, realms: Map<string, Realm_lite>): AgentUsedByDTO[] | null {
    if (!list) return null;
    return list.map((u) => ({ scope: u.scope, name: u.name, version: u.version, realms: u.realm_ids.map((id) => ({ id, slug: realms.get(id)?.slug ?? id })) }));
}

function overrides_of(s: Settings_vo | undefined): string[] {
    if (!s) return [];
    return Object.entries(s.source ?? {}).filter(([, v]) => v === 'realm').map(([k]) => k);
}

export class AgentPageService {
    static readonly REALM_CAP = 25;

    constructor(private _core: CoreApiClient, private _control: ControlRepository) {}

    private async realms(token: string, org_id: string): Promise<{ items: Realm_lite[]; total: number }> {
        const r = await this._control.realms_page({ org_id, limit: 100, offset: 0 }, token);
        return { items: r.items.map((x) => ({ id: x.id, slug: x.slug, name: x.name || x.slug })), total: r.total };
    }

    private async realm_ref(token: string, ref: { org_slug: string; slug: string }): Promise<Realm_lite> {
        const r = await this._control.realm_by_slug(ref.org_slug, ref.slug, token);
        return { id: r.id, slug: r.slug, name: r.name || r.slug };
    }

    private async agents(token: string, body: Record<string, unknown>): Promise<Agent_vo[]> {
        return data_of<Agent_vo[]>(await this._core.post('/v1/agents/get', body, token)) ?? [];
    }

    private async settings(token: string, body: Record<string, unknown>): Promise<Settings_vo[]> {
        const d = data_of<Settings_vo | Settings_vo[]>(await this._core.post('/v1/agents/get_settings', body, token));
        return Array.isArray(d) ? d : d ? [d] : [];
    }

    async list(token: string, p: AgentListGetInput): Promise<AgentListDTO> {
        const realm = p.realm ? await this.realm_ref(token, p.realm) : null; // membership gate for the realm view
        const agents_r = await this.agents(token, { org_id: p.org_id, include_manifest: false, include_usage: true });
        // A Core older than API 2 ignores include_usage: no used_by on any row.
        const usage_ok = agents_r.length === 0 || agents_r.some((a) => Array.isArray(a.used_by));
        const [scope_settings, realms_res] = await Promise.all([
            this.settings(token, { org_id: p.org_id, ...(realm ? { realm_id: realm.id } : {}) }).catch(() => null),
            this.realms(token, p.org_id).catch(() => null),
        ]);
        const realm_list = realms_res?.items ?? [];
        const realm_map = new Map(realm_list.map((r) => [r.id, r]));
        if (realm) realm_map.set(realm.id, realm);
        // Org view: which realms override what (one summary per realm, capped).
        const checked = realm ? [] : realm_list.slice(0, AgentPageService.REALM_CAP);
        const per_realm = await map_limited(checked, 6, async (r) => ({ r, s: await this.settings(token, { org_id: p.org_id, realm_id: r.id }).catch(() => null) }));

        const by_name = new Map((scope_settings ?? []).map((s) => [s.name, s]));
        const groups = group_versions(agents_r);
        let partial = scope_settings === null || realms_res === null || per_realm.some((x) => x.s === null);

        const items: AgentListRowDTO[] = groups.map(({ head, all }) => {
            const s = by_name.get(head.name);
            const used = used_by_dto(usage_ok ? head.used_by ?? [] : undefined, realm_map);
            const used_here = used ? (realm ? used.filter((u) => u.realms.some((x) => x.id === realm.id)) : used) : null;
            const overrides = realm
                ? (overrides_of(s).length ? [{ realm_id: realm.id, realm_slug: realm.slug, keys: overrides_of(s) }] : [])
                : per_realm.flatMap(({ r, s: rs }) => {
                    const keys = overrides_of(rs?.find((x) => x.name === head.name));
                    return keys.length ? [{ realm_id: r.id, realm_slug: r.slug, keys }] : [];
                });
            const has = s ? (s.settings.required.length + s.settings.optional.length) > 0 : false;
            return {
                id: head.id, name: head.name, version: head.version, versions: all.map((a) => a.version ?? '').filter(Boolean),
                description: head.description, agent_type: head.agent_type, is_system: head.is_system,
                setup: s ? { has_settings: has, required_total: s.required_total, required_configured: s.required_configured, ready: s.all_required_configured } : null,
                overrides,
                used_by: realm ? used_here : used,
                used_count: used_here ? used_here.length : null,
            };
        });
        // In use and not ready first, then in use, then name.
        const rank = (r: AgentListRowDTO) => ((r.used_count ?? 0) > 0 && r.setup && !r.setup.ready ? 0 : (r.used_count ?? 0) > 0 ? 1 : 2);
        items.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

        const needs = items.filter((i) => i.setup && i.setup.required_total > 0 && !i.setup.ready);
        const blocking = needs.filter((i) => (i.used_count ?? 0) > 0);
        const teams = new Set(blocking.flatMap((i) => (i.used_by ?? []).map((u) => `${u.scope}/${u.name}`)));
        if (!usage_ok) partial = true;
        return {
            org_id: p.org_id,
            realm,
            items,
            counts: {
                all: items.length,
                needs_setup: needs.length,
                in_use: usage_ok ? items.filter((i) => (i.used_count ?? 0) > 0).length : null,
                custom: items.filter((i) => !i.is_system).length,
                builtin: items.filter((i) => i.is_system).length,
            },
            attention: usage_ok && blocking.length ? { agents: blocking.map((i) => i.name), teams: teams.size } : null,
            realms_checked: realm ? 1 : checked.length,
            realms_total: realm ? 1 : realms_res?.total ?? 0,
            partial,
        };
    }

    private fields(scope: Settings_vo, org: Settings_vo | null, realm_scope: boolean): AgentFieldDTO[] {
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

    async page(token: string, p: AgentPageGetInput): Promise<AgentPageDTO> {
        const view = p.view ?? 'settings';
        const realm = p.realm ? await this.realm_ref(token, p.realm) : null;
        const detail = data_of<Agent_vo>(await this._core.post('/v1/agents/get_details', { org_id: p.org_id, id: p.id, include_manifest: view === 'manifest' }, token));
        const [rows, realms_res, org_s, realm_s] = await Promise.all([
            this.agents(token, { org_id: p.org_id, names: [detail.name], include_manifest: false, include_usage: true }),
            this.realms(token, p.org_id).catch(() => null),
            this.settings(token, { org_id: p.org_id, id: p.id }).catch(() => null),
            realm ? this.settings(token, { org_id: p.org_id, id: p.id, realm_id: realm.id }).catch(() => null) : Promise.resolve(null),
        ]);
        const realm_list = realms_res?.items ?? [];
        const realm_map = new Map(realm_list.map((r) => [r.id, r]));
        if (realm) realm_map.set(realm.id, realm);
        const group = group_versions(rows.length ? rows : [detail])[0];
        const used = used_by_dto(group.head.used_by, realm_map);
        const org_one = org_s?.[0] ?? null;
        const realm_one = realm_s?.[0] ?? null;
        const scope_one = realm ? realm_one : org_one;
        let partial = realms_res === null || org_one === null || (realm !== null && realm_one === null);

        // Per-realm key sources: always for the overrides card; full rows for the Realms tab.
        const checked = realm_list.slice(0, AgentPageService.REALM_CAP);
        const need_realms = !realm && (view === 'realms' || view === 'settings');
        const per = need_realms ? await map_limited(checked, 6, async (r) => ({ r, s: (await this.settings(token, { org_id: p.org_id, id: p.id, realm_id: r.id }).catch(() => null))?.[0] ?? null })) : [];
        if (per.some((x) => x.s === null)) partial = true;
        const required_keys = (org_one?.settings.required ?? []).map((d) => d.key);
        const realms_rows: AgentRealmRowDTO[] | null = view === 'realms' && !realm ? per.map(({ r, s }) => {
            const keys: Record<string, 'org' | 'realm' | 'missing'> = {};
            for (const k of required_keys) keys[k] = s?.values?.[k] ? (s.source?.[k] === 'realm' ? 'realm' : 'org') : 'missing';
            return {
                realm: r,
                ready: s ? s.all_required_configured : false,
                keys,
                used_here: (used ?? []).filter((u) => u.realms.some((x) => x.id === r.id)).map((u) => `${u.scope}/${u.name}`),
            };
        }).sort((a, b) => (b.used_here.length > 0 ? 1 : 0) - (a.used_here.length > 0 ? 1 : 0) || a.realm.slug.localeCompare(b.realm.slug)) : null;

        return {
            org_id: p.org_id,
            agent: {
                id: detail.id, name: detail.name, version: group.head.version, description: group.head.description ?? detail.description,
                agent_type: detail.agent_type, is_system: detail.is_system,
                versions: group.all.map((a, i) => ({ id: a.id, version: a.version, created_at: a.created_at, newest: i === 0 })),
            },
            used_by: realm && used ? used.filter((u) => u.realms.some((x) => x.id === realm.id)) : used,
            settings: scope_one ? {
                scope: realm ? 'realm' : 'org',
                realm,
                fields: this.fields(scope_one, realm ? org_one : null, Boolean(realm)),
                required_total: scope_one.required_total,
                required_configured: scope_one.required_configured,
                ready: scope_one.all_required_configured,
            } : null,
            overrides: need_realms ? per.flatMap(({ r, s }) => { const keys = overrides_of(s ?? undefined); return keys.length ? [{ realm_id: r.id, realm_slug: r.slug, keys }] : []; }) : null,
            realms: realms_rows,
            required_keys,
            manifest: view === 'manifest' ? detail.manifest ?? null : null,
            partial,
        };
    }
}
