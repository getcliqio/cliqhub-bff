/**
 * Agents — response shapes as Core sends them (`/v1/agents/get`,
 * `/v1/agents/get_details`, `/v1/agents/get_settings`).
 */

/** One setting an agent declares (required or optional). */
export interface AgentSettingDefVO {
    key: string;
    description?: string;
    default?: unknown;
    /** Only applies when these other settings have these values. */
    when?: Record<string, string>;
    /** Explicit secret flag; inferred from the key name when absent. */
    secret?: boolean;
    /** How the UI edits it: text (default), secret, or mcp_servers. */
    type?: 'text' | 'secret' | 'mcp_servers';
}

/** `agents/get_settings` — one agent's settings for the org, or one realm. */
export interface AgentSettingsVO {
    id: string;
    name: string;
    version: string | null;
    description: string | null;
    is_system: boolean;
    settings: { required: AgentSettingDefVO[]; optional: AgentSettingDefVO[] };
    /** Effective values (secrets masked by Core for callers without agents.reveal). */
    values: Record<string, string>;
    /** Where each effective value comes from. */
    source: Record<string, 'org' | 'realm' | null>;
    required_total: number;
    required_configured: number;
    all_required_configured: boolean;
    /** The manifest's MCP block, when the agent can use MCP servers. */
    mcp?: AgentMcpData;
}

/** A team version that uses the agent (`include_usage`). */
export interface AgentUsedByVO {
    scope: string;
    name: string;
    version: string | null;
    realm_ids: string[];
}

/** `agents/get` row / `agents/get_details` — one catalog row (one version of an agent). */
export interface AgentVO {
    id: string;
    name: string;
    version: string | null;
    description: string | null;
    agent_type: string;
    is_system: boolean;
    /** Unix ms. */
    created_at: number;
    /** Unix ms. */
    updated_at: number;
    manifest?: Record<string, unknown>;
    /** Present when `include_usage` was sent (Core API ≥ 2). */
    used_by?: AgentUsedByVO[];
}

/** An agent manifest's `mcp` block: what MCP servers it can use. */
export interface AgentMcpData {
    transports: Array<'http' | 'stdio'>;
    allow_custom?: boolean;
    presets?: Array<{
        name: string; label: string; transport: 'http' | 'stdio'; description?: string;
        url?: string; headers?: Record<string, string>;
        command?: string; args?: string[]; env?: Record<string, string>;
        secrets?: Array<{ key: string; description?: string; help_url?: string }>;
    }>;
}
