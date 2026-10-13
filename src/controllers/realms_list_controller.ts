/**
 * Realms list.
 *
 * Routes (mounted in routes/teams.ts, next to realms/add_team):
 *   POST /v1/realms/get — Core's realms page; with `with_stats` each realm with a daemon online also
 *                         carries `teams_missing_agents` (services/realms_list_service.ts).
 *
 * Token route (routes/route_auth.ts), like the passthrough it replaces; Core checks access.
 */
import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { RealmsListService } from '../services/realms_list_service.js';

export class RealmsListController extends BaseController {
    constructor(private readonly _service: RealmsListService) {
        super();
    }

    /** One page of realms (Core's envelope, as the passthrough returned it). */
    async get(req: Request, res: Response): Promise<void> {
        const org_header = req.headers['x-org-id'];
        const org_id = Array.isArray(org_header) ? org_header[0] : org_header;
        res.json(await this._service.get(req.body, this.bearer(req), org_id));
    }
}
