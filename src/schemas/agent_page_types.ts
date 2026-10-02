/**
 * Manage › Agents and Realm › Agents — the agent list and one agent's page
 * (request schemas + response data).
 *
 * Routes (controllers/agent_list_controller.ts, controllers/agent_page_controller.ts):
 *   POST /v1/agent_list/get — the org's agents (or as one realm sees them)
 *   POST /v1/agent_page/get — one agent: details, versions, used by, settings
 *
 * BFF composition over Core: agents/get { include_usage }, agents/get_details,
 * agents/get_settings (org, and per realm), realms/get, realms/get_by_id.
 * Writes stay single Core routes (agents/update_settings, register, deregister).
 */

import { z } from 'zod';
import { RealmRefInput } from './realm_ref.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/agent_list/get — Manage › Agents (org) or Realm › Agents (`realm`). */
export const AgentListGetInput = z.object({
    org_id: z.string().uuid()
        .describe('Organization whose agents to list'),
    realm: RealmRefInput.optional()
        .describe('Realm view: setup and overrides as this realm sees them'),
}).strict();
export type AgentListGetInput = z.infer<typeof AgentListGetInput>;

/**
 * POST /v1/agent_page/get — one agent. Always: details, versions, used by,
 * and settings for the scope (org defaults, or one realm). `view: 'realms'`
 * adds every realm's view of the keys; `view: 'manifest'` adds the manifest.
 */
export const AgentPageGetInput = z.object({
    org_id: z.string().uuid()
        .describe('Organization the agent belongs to'),
    id: z.string().uuid()
        .describe('Catalog row id (any version of the agent)'),
    view: z.enum(['settings', 'realms', 'used_by', 'manifest', 'versions']).optional()
        .describe('Tab to load (default settings)'),
    realm: RealmRefInput.optional()
        .describe('Settings as this realm sees them (realm overrides)'),
}).strict();
export type AgentPageGetInput = z.infer<typeof AgentPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** A realm as the agent pages show it. */
export interface AgentRealmData {
    id: string;
    slug: string;
    name: string;
}

/** A team version using the agent, with the realms it runs in. */
export interface AgentUsedByData {
    scope: string;
    name: string;
    version: string | null;
    realms: Array<{ id: string; slug: string }>;
}

/** Keys a realm overrides for the agent. */
export interface AgentOverrideData {
    realm_id: string;
    realm_slug: string;
    keys: string[];
}

/** One agent row: versions, setup status, realm overrides and usage. */
export interface AgentListRowData {
    id: string;
    name: string;
    version: string | null;
    versions: string[];
    description: string | null;
    agent_type: string;
    is_system: boolean;
    /** Required-key status for the scope (org defaults, or the realm's effective values). */
    setup: { has_settings: boolean; required_total: number; required_configured: number; ready: boolean } | null;
    /** Realms that override keys (org view), or the keys this realm overrides (realm view: one entry). */
    overrides: AgentOverrideData[];
    used_by: AgentUsedByData[] | null;
    /** Teams using it in this realm (realm view) or anywhere (org view). */
    used_count: number | null;
}

/** `agent_list/get` */
export interface AgentListData {
    org_id: string;
    realm: AgentRealmData | null;
    items: AgentListRowData[];
    counts: { all: number; needs_setup: number; in_use: number | null; custom: number; builtin: number };
    /** In-use agents missing required keys, and how many teams that stops. */
    attention: { agents: string[]; teams: number } | null;
    realms_checked: number;
    realms_total: number;
    partial: boolean;
}

/** One setting field as the settings form shows it. Secrets are always masked. */
export interface AgentFieldData {
    key: string;
    description: string | null;
    default: string | null;
    when: Record<string, string> | null;
    required: boolean;
    secret: boolean;
    /** Effective value for the scope (masked when secret), null when unset. */
    value: string | null;
    set: boolean;
    /** Where the effective value comes from. */
    source: 'org' | 'realm' | null;
    /** Realm scope only: the org default underneath (masked when secret). */
    org_value: string | null;
}

/** The settings form for one scope (org defaults or a realm's effective values). */
export interface AgentSettingsViewData {
    scope: 'org' | 'realm';
    realm: AgentRealmData | null;
    fields: AgentFieldData[];
    required_total: number;
    required_configured: number;
    ready: boolean;
}

/** One realm's view of the agent's required keys (Realms tab). */
export interface AgentRealmRowData {
    realm: AgentRealmData;
    ready: boolean;
    keys: Record<string, 'org' | 'realm' | 'missing'>;
    used_here: string[];
}

/** `agent_page/get` */
export interface AgentPageData {
    org_id: string;
    agent: {
        id: string;
        name: string;
        version: string | null;
        description: string | null;
        agent_type: string;
        is_system: boolean;
        versions: Array<{ id: string; version: string | null; created_at: number; newest: boolean }>;
    };
    used_by: AgentUsedByData[] | null;
    settings: AgentSettingsViewData | null;
    /** Org-view summary of realm overrides (settings / realms tabs). */
    overrides: AgentOverrideData[] | null;
    realms: AgentRealmRowData[] | null;
    required_keys: string[];
    manifest: Record<string, unknown> | null;
    partial: boolean;
}
