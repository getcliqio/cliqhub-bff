/**
 * Named Core read routes (`'runs.get'`) for page composition, so services
 * hold no Core URLs.
 */

import type { CoreClient } from './core_client.js';

/**
 * Core read routes used by BFF page composition. Services name a route here
 * (`'runs.get'`) instead of holding Core URLs; every read goes out as the
 * caller's bearer and returns Core's body as sent (flat `{ ok, …fields }`).
 * A route listed here must exist in Core's route policy table
 * (checked by tests/unit/routes/core_route_contract.test.ts).
 */
export const CORE_READS = {
    'agents.get': '/v1/agents/get',
    'agents.get_details': '/v1/agents/get_details',
    'agents.get_settings': '/v1/agents/get_settings',
    'daemons.get': '/v1/daemons/get',
    'daemons.get_by_id': '/v1/daemons/get_by_id',
    'invitations.get': '/v1/invitations/get',
    'orgs.get': '/v1/orgs/get',
    'orgs.get_by_id': '/v1/orgs/get_by_id',
    'orgs.get_scopes': '/v1/orgs/get_scopes',
    'permissions.list': '/v1/permissions/list',
    'realms.get': '/v1/realms/get',
    'reports.audit': '/internal/reports/audit',
    'reviews.get_by_id': '/v1/reviews/get_by_id',
    'runs.get': '/v1/runs/get',
    'runs.get_logs': '/v1/runs/get_logs',
    'runs.get_telemetry': '/v1/runs/get_telemetry',
    'teams.get': '/v1/teams/get',
    'teams.get_by_id': '/v1/teams/get_by_id',
    'teams.get_phases': '/v1/teams/get_phases',
    'users.get': '/v1/users/get',
    'workspaces.get': '/v1/workspaces/get',
    'workspaces.get_by_id': '/v1/workspaces/get_by_id',
} as const;

/** A route name from {@link CORE_READS}. */
export type CoreRead = keyof typeof CORE_READS;

/** Generic POST to a {@link CORE_READS} route as the caller. */
export class CoreReadRepository {
    constructor(private readonly _core: CoreClient) {}

    /**
     * POSTs to a Core read route and returns the whole body, not unwrapped:
     * `{ ok, data: … }` routes (e.g. teams.get → `{ ok, data: PagedData<TeamData> }`)
     * come back with their `data` envelope; flat routes as `{ ok, …fields }`.
     */
    read<T extends Record<string, unknown> = Record<string, unknown>>(route: CoreRead, body: unknown, token: string): Promise<T> {
        return this._core.post_body<T>(CORE_READS[route], body, token);
    }
}
