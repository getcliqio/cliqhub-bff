/**
 * Installing a team into realms.
 *
 * Routes (mounted in routes/teams.ts):
 *   POST /v1/realms/add_team — with `realm_ids`: pre-flight every realm, then install into each
 *                              (signed-in user; `{ ok: true, data: { installed } }`).
 *                              With `realm_id`: forwarded to Core unchanged (CLI, tokens).
 *
 * Token route (routes/route_auth.ts); Core applies its route policy on every install.
 */
import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';
import type { TeamInstallService } from '../services/team_install_service.js';
import { TeamInstallInput } from '../schemas/team_install_types.js';

export class TeamInstallController extends BaseController {
    constructor(
        private readonly _install_service: TeamInstallService,
        private readonly _proxy_service: ProxyService,
    ) {
        super();
    }

    /**
     * Install one team into one realm (Core, unchanged) or into several (pre-flight, then each).
     *
     * @throws ApiError 403 `install_blocked` (nothing installed) or `install_incomplete` (some realms
     *   refused by Core) with `details` naming each realm; 401 for `realm_ids` without a signed-in user.
     */
    async add_team(req: Request, res: Response): Promise<void> {
        const body = req.body as Record<string, unknown> | undefined;
        if (!body || !('realm_ids' in body)) {
            const org_header = req.headers['x-org-id'];
            const org_id = Array.isArray(org_header) ? org_header[0] : org_header;
            res.json(await this._proxy_service.forward(req.path, req.body, this.bearer(req), org_id));
            return;
        }
        const input = this.parse_body(TeamInstallInput, req);
        const session = this.session(req);
        const viewer = { user_id: session.act_as_user_id || session.user_id, site_admin: session.role === 'admin' };
        this.ok(res, await this._install_service.install(input, session.target_token, viewer));
    }
}
