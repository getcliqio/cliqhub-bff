/**
 * Teams routes — catalog, versions, authoring, AI builder.
 *
 * POST /v1/teams/get
 * POST /v1/teams/get_by_id
 * POST /v1/teams/get_versions
 * POST /v1/teams/get_phases
 * POST /v1/teams/create
 * POST /v1/teams/update
 * POST /v1/teams/download
 * POST /v1/teams/publish
 * POST /v1/teams/unpublish
 * POST /v1/teams/delete
 * POST /v1/teams/rename
 * POST /v1/teams/build       (rate limited)
 * POST /v1/realms/get        (Core's page; with_stats → + teams missing agent config per realm)
 * POST /v1/realms/add_team   (one realm → Core; `realm_ids` → pre-flight, then each realm)
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';
import { create_rate_limiter } from '../middleware/rate_limit.js';

/** Mounts the teams routes listed above. */
export function register_teams_routes(r: RouteRegistrar, { config, teams_controller: c, team_install_controller: install, realms_list_controller: realms }: Container): void {
    r.post('/v1/teams/get', c.wrap(c.get));
    r.post('/v1/teams/get_by_id', c.wrap(c.get_by_id));
    r.post('/v1/teams/get_versions', c.wrap(c.get_versions));
    r.post('/v1/teams/get_phases', c.wrap(c.get_phases));
    r.post('/v1/teams/create', c.wrap(c.create));
    r.post('/v1/teams/update', c.wrap(c.update));
    r.post('/v1/teams/download', c.wrap(c.download));
    r.post('/v1/teams/publish', c.wrap(c.publish));
    r.post('/v1/teams/unpublish', c.wrap(c.unpublish));
    r.post('/v1/teams/delete', c.wrap(c.delete));
    r.post('/v1/teams/rename', c.wrap(c.rename));
    r.post('/v1/teams/build', create_rate_limiter(config), c.wrap(c.build));
    r.post('/v1/realms/add_team', install.wrap(install.add_team));
    r.post('/v1/realms/get', realms.wrap(realms.get));
}
