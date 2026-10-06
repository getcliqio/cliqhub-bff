/**
 * Manage › Agents and Realm › Agents — the agent list and one agent's page.
 *
 * Composes Core routes (all existing): agents/get { include_usage }, agents/get_details,
 * agents/get_settings (org, and per realm), realms/get, realms/get_by_id (realm slug).
 *
 * Secret values never reach the browser: Core masks them for callers without
 * agents.reveal, and the mapper masks again regardless, so the web UI can
 * only show "set · ends in …" and replace a value — never read it back.
 */

import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';
import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { AgentSettingsVO, AgentVO } from '../types/core/agents.js';
import type {
    AgentListGetInput, AgentPageGetInput,
    AgentListData, AgentListRowData, AgentPageData, AgentRealmData, AgentRealmRowData,
} from '../schemas/agent_page_types.js';
import { group_versions, overrides_of, to_agent_fields_data, to_agent_used_by_data } from '../mappers/agent_page_mapper.js';

const log = get_logger('svc.agent_page');

/** `Promise.all` over `items` with at most `limit` calls in flight; results keep input order. */
async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

/** Unwraps Core's `{ ok, data }` envelope when present. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

/** Agent list and agent page (org or realm view), composed from Core agent, settings and realm reads. */
export class AgentPageService {
    /** Realms whose per-realm settings are read for the overrides summary. */
    static readonly REALM_CAP = 25;

    constructor(private readonly _reads: CoreReadRepository, private readonly _control: ControlRepository) {}

    /** First page (100) of the org's realms, for names and the overrides fan-out. */
    private async realms(token: string, org_id: string): Promise<{ items: AgentRealmData[]; total: number }> {
        const r = await this._control.realms_page({ org_id, limit: 100, offset: 0 }, token);
        return { items: r.items.map((x) => ({ id: x.id, slug: x.slug, name: x.name || x.slug })), total: r.total };
    }

    /** Resolves a realm slug ref; Core's lookup is also the membership gate (throws 403/404). */
    private async realm_ref(token: string, ref: { org_slug: string; slug: string }): Promise<AgentRealmData> {
        const r = await this._control.realm_by_slug(ref.org_slug, ref.slug, token);
        return { id: r.id, slug: r.slug, name: r.name || r.slug };
    }

    private async agents(token: string, body: Record<string, unknown>): Promise<AgentVO[]> {
        return data_of<AgentVO[]>(await this._reads.read('agents.get', body, token)) ?? [];
    }

    /** agents/get_settings — Core answers one object for `id`, a list otherwise; always a list here. */
    private async settings(token: string, body: Record<string, unknown>): Promise<AgentSettingsVO[]> {
        const d = data_of<AgentSettingsVO | AgentSettingsVO[]>(await this._reads.read('agents.get_settings', body, token));
        return Array.isArray(d) ? d : d ? [d] : [];
    }

    /**
     * The org's agents (newest version each) with setup status, realm overrides
     * and usage — or, with `realm`, as that realm sees them.
     *
     * @param input - org_id, optional realm (slug ref; also the membership gate)
     * @param token - The caller's Core token
     */
    async list(input: AgentListGetInput, token: string): Promise<AgentListData> {
        const realm = input.realm ? await this.realm_ref(token, input.realm) : null; // membership gate for the realm view
        const agents_r = await this.agents(token, { org_id: input.org_id, include_manifest: false, include_usage: true });
        // A Core older than API 2 ignores include_usage: no used_by on any row.
        const usage_ok = agents_r.length === 0 || agents_r.some((a) => Array.isArray(a.used_by));
        const [scope_settings, realms_res] = await Promise.all([
            best_effort(log, 'agent_list_settings_failed', this.settings(token, { org_id: input.org_id, ...(realm ? { realm_id: realm.id } : {}) }), null, { org_id: input.org_id, realm_id: realm?.id }),
            best_effort(log, 'agent_list_realms_failed', this.realms(token, input.org_id), null, { org_id: input.org_id }),
        ]);
        const realm_list = realms_res?.items ?? [];
        const realm_map = new Map(realm_list.map((r) => [r.id, r]));
        if (realm) realm_map.set(realm.id, realm);
        // Org view: which realms override what (one summary per realm, capped).
        const checked = realm ? [] : realm_list.slice(0, AgentPageService.REALM_CAP);
        const per_realm = await map_limited(checked, 6, async (r) => ({ r, s: await best_effort(log, 'agent_list_realm_settings_failed', this.settings(token, { org_id: input.org_id, realm_id: r.id }), null, { org_id: input.org_id, realm_id: r.id }) }));

        const by_name = new Map((scope_settings ?? []).map((s) => [s.name, s]));
        const groups = group_versions(agents_r);
        let partial = scope_settings === null || realms_res === null || per_realm.some((x) => x.s === null);

        const items: AgentListRowData[] = groups.map(({ head, all }) => {
            const s = by_name.get(head.name);
            const used = to_agent_used_by_data(usage_ok ? head.used_by ?? [] : undefined, realm_map);
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
        const rank = (r: AgentListRowData) => ((r.used_count ?? 0) > 0 && r.setup && !r.setup.ready ? 0 : (r.used_count ?? 0) > 0 ? 1 : 2);
        items.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

        const needs = items.filter((i) => i.setup && i.setup.required_total > 0 && !i.setup.ready);
        const blocking = needs.filter((i) => (i.used_count ?? 0) > 0);
        const teams = new Set(blocking.flatMap((i) => (i.used_by ?? []).map((u) => `${u.scope}/${u.name}`)));
        if (!usage_ok) partial = true;
        return {
            org_id: input.org_id,
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

    /**
     * One agent: details, versions, used by and settings for the scope (org
     * defaults, or one realm); per-realm key status on the realms tab.
     *
     * @param input - org_id + agent id, the tab, optional realm
     * @param token - The caller's Core token
     */
    async page(input: AgentPageGetInput, token: string): Promise<AgentPageData> {
        const view = input.view ?? 'settings';
        const realm = input.realm ? await this.realm_ref(token, input.realm) : null;
        const detail = data_of<AgentVO>(await this._reads.read('agents.get_details', { org_id: input.org_id, id: input.id, include_manifest: view === 'manifest' }, token));
        const [rows, realms_res, org_s, realm_s] = await Promise.all([
            this.agents(token, { org_id: input.org_id, names: [detail.name], include_manifest: false, include_usage: true }),
            best_effort(log, 'agent_page_realms_failed', this.realms(token, input.org_id), null, { org_id: input.org_id }),
            best_effort(log, 'agent_page_settings_failed', this.settings(token, { org_id: input.org_id, id: input.id }), null, { org_id: input.org_id, agent_id: input.id }),
            realm ? best_effort(log, 'agent_page_realm_settings_failed', this.settings(token, { org_id: input.org_id, id: input.id, realm_id: realm.id }), null, { org_id: input.org_id, agent_id: input.id, realm_id: realm.id }) : Promise.resolve(null),
        ]);
        const realm_list = realms_res?.items ?? [];
        const realm_map = new Map(realm_list.map((r) => [r.id, r]));
        if (realm) realm_map.set(realm.id, realm);
        const group = group_versions(rows.length ? rows : [detail])[0];
        const used = to_agent_used_by_data(group.head.used_by, realm_map);
        const org_one = org_s?.[0] ?? null;
        const realm_one = realm_s?.[0] ?? null;
        const scope_one = realm ? realm_one : org_one;
        let partial = realms_res === null || org_one === null || (realm !== null && realm_one === null);

        // Per-realm key sources: always for the overrides card; full rows for the Realms tab.
        const checked = realm_list.slice(0, AgentPageService.REALM_CAP);
        const need_realms = !realm && (view === 'realms' || view === 'settings');
        const per = need_realms ? await map_limited(checked, 6, async (r) => ({ r, s: (await best_effort(log, 'agent_page_realm_settings_failed', this.settings(token, { org_id: input.org_id, id: input.id, realm_id: r.id }), null, { org_id: input.org_id, agent_id: input.id, realm_id: r.id }))?.[0] ?? null })) : [];
        if (per.some((x) => x.s === null)) partial = true;
        const required_keys = (org_one?.settings.required ?? []).map((d) => d.key);
        const realms_rows: AgentRealmRowData[] | null = view === 'realms' && !realm ? per.map(({ r, s }) => {
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
            org_id: input.org_id,
            agent: {
                id: detail.id, name: detail.name, version: group.head.version, description: group.head.description ?? detail.description,
                agent_type: detail.agent_type, is_system: detail.is_system,
                versions: group.all.map((a, i) => ({ id: a.id, version: a.version, created_at: a.created_at, newest: i === 0 })),
            },
            used_by: realm && used ? used.filter((u) => u.realms.some((x) => x.id === realm.id)) : used,
            settings: scope_one ? {
                scope: realm ? 'realm' : 'org',
                realm,
                fields: to_agent_fields_data(scope_one, realm ? org_one : null, Boolean(realm)),
                required_total: scope_one.required_total,
                required_configured: scope_one.required_configured,
                ready: scope_one.all_required_configured,
                mcp: scope_one.mcp ?? null,
            } : null,
            overrides: need_realms ? per.flatMap(({ r, s }) => { const keys = overrides_of(s ?? undefined); return keys.length ? [{ realm_id: r.id, realm_slug: r.slug, keys }] : []; }) : null,
            realms: realms_rows,
            required_keys,
            manifest: view === 'manifest' ? detail.manifest ?? null : null,
            partial,
        };
    }
}
