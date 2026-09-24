import { z } from 'zod';

export const teams_get_schema = z.object({
    tag: z.string().optional(),
    query: z.string().optional(),
    mine: z.boolean().optional(),
    group_by_scope: z.boolean().optional(),
    status: z.enum(['draft', 'published']).optional(),
    /**
     * Realm roster + daemon coverage (replaces /v1/realms/teams/get).
     * When set, catalog filters above are ignored by Core.
     */
    realm_id: z.string().min(1).optional(),
    /**
     * Live installed teams from a daemon (replaces /v1/daemons/teams/get).
     */
    daemon_id: z.string().min(1).optional(),
    origin: z.enum(['published', 'local']).optional(),
    coverage: z.enum(['full', 'partial', 'none']).optional(),
    sort_by: z.enum(['team', 'origin', 'coverage']).optional(),
    sort_dir: z.enum(['asc', 'desc']).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
});

export const teams_get_by_id_schema = z.object({
    name: z.string().optional(),
    scope: z.string().optional(),
    team_id: z.string().uuid().optional(),
    /** Load a specific published version instead of latest. */
    version: z.string().optional(),
}).refine(
    (d) => Boolean(d.name) || Boolean(d.team_id),
    { message: 'Either name or team_id is required' },
);

export const teams_download_schema = z.object({
    name: z.string().min(1, 'Team name is required'),
    scope: z.string().optional(),
    version: z.string().optional(),
});

const slug_pattern = /^[a-z][a-z0-9-]*$/;

export const teams_create_schema = z.object({
    name: z.string().min(1, 'Team name is required').regex(slug_pattern, 'Name must be lowercase alphanumeric with hyphens'),
    scope: z.string().min(1, 'Scope is required'),
    description: z.string().optional(),
    manifest: z.union([z.string(), z.record(z.unknown())]).optional(),
    team_json: z.string().optional(),
});

export const teams_update_schema = z.object({
    name: z.string().optional(),
    scope: z.string().optional(),
    team_id: z.string().uuid().optional(),
    description: z.string().optional(),
    manifest: z.union([z.string(), z.record(z.unknown())]).optional(),
    team_json: z.string().optional(),
    bump: z.enum(['minor', 'major']).optional(),
}).refine(
    (d) => Boolean(d.name) || Boolean(d.team_id),
    { message: 'Either name or team_id is required' },
);

export const teams_publish_schema = z.object({
    name: z.string().regex(slug_pattern, 'Name must be lowercase alphanumeric with hyphens').optional(),
    scope: z.string().optional(),
    team_id: z.string().uuid().optional(),
    version: z.string().optional(),
    bump: z.enum(['patch', 'minor', 'major']).optional(),
    data_base64: z.string().optional(),
    changelog: z.string().optional(),
    readme: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    agents: z.record(z.unknown()).optional(),
    agent_uploads: z.record(z.string()).optional(),
}).refine(
    (d) => Boolean(d.name) || Boolean(d.team_id),
    { message: 'Either name or team_id is required' },
);

export const teams_unpublish_schema = z.object({
    name: z.string().optional(),
    scope: z.string().optional(),
    team_id: z.string().uuid().optional(),
}).refine(
    (d) => Boolean(d.name) || Boolean(d.team_id),
    { message: 'Either name or team_id is required' },
);

export const teams_delete_schema = z.object({
    name: z.string().optional(),
    scope: z.string().optional(),
    team_id: z.string().uuid().optional(),
}).refine(
    (d) => Boolean(d.name) || Boolean(d.team_id),
    { message: 'Either name or team_id is required' },
);

export const teams_rename_schema = z.object({
    name: z.string().min(1, 'Current team name is required'),
    scope: z.string().min(1, 'Scope is required'),
    new_name: z.string().min(1, 'New name is required').regex(slug_pattern, 'New name must be lowercase alphanumeric with hyphens'),
});

export const teams_get_versions_schema = z.object({
    name: z.string().min(1, 'Team name is required'),
    scope: z.string().optional(),
    latest_only: z.boolean().optional(),
});

export const teams_get_phases_schema = z.object({
    team_id: z.string().uuid(),
    version_id: z.string().uuid().optional(),
});

export type TeamsGetInput = z.infer<typeof teams_get_schema>;
export type TeamsGetByIdInput = z.infer<typeof teams_get_by_id_schema>;
export type TeamsDownloadInput = z.infer<typeof teams_download_schema>;
export type TeamsCreateInput = z.infer<typeof teams_create_schema>;
export type TeamsUpdateInput = z.infer<typeof teams_update_schema>;
export type TeamsPublishInput = z.infer<typeof teams_publish_schema>;
export type TeamsUnpublishInput = z.infer<typeof teams_unpublish_schema>;
export type TeamsDeleteInput = z.infer<typeof teams_delete_schema>;
export type TeamsRenameInput = z.infer<typeof teams_rename_schema>;
export type TeamsGetVersionsInput = z.infer<typeof teams_get_versions_schema>;
export type TeamsGetPhasesInput = z.infer<typeof teams_get_phases_schema>;
