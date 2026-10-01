import { z } from 'zod';

const uuid = z.string().uuid();
const slug = z.string().trim().min(1).max(128);

/** A realm addressed the way realm URLs do (`/o/:org/realms/:slug`). */
const realm_ref = z.object({ org_slug: slug, slug }).strict();

/**
 * POST /v1/agent_list/get — Manage › Agents (org) or Realm › Agents.
 * BFF composition over existing Core routes: agents/get {include_usage},
 * agents/get_settings (org summary, and per realm), realms/get.
 */
export const agent_list_get_schema = z.object({
    org_id: uuid.describe('Organization whose agents to list.'),
    realm: realm_ref.optional().describe('Realm view: setup and overrides as this realm sees them.'),
}).strict();
export type AgentListGetInput = z.infer<typeof agent_list_get_schema>;

/**
 * POST /v1/agent_page/get — one agent. Always: details, versions, used by,
 * and settings for the scope (org defaults, or one realm). `view: 'realms'`
 * adds every realm's view of the keys; `view: 'manifest'` adds the manifest.
 */
export const agent_page_get_schema = z.object({
    org_id: uuid,
    id: uuid.describe('Catalog row id (any version of the agent).'),
    view: z.enum(['settings', 'realms', 'used_by', 'manifest', 'versions']).optional(),
    realm: realm_ref.optional().describe('Settings as this realm sees them (realm overrides).'),
}).strict();
export type AgentPageGetInput = z.infer<typeof agent_page_get_schema>;
