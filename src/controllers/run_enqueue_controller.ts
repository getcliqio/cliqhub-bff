/**
 * Queuing a run (the Run dialog, "Run again").
 *
 * Route (mounted in routes/runs.ts):
 *   POST /v1/runs/enqueue — refuses (422 `agent_settings_missing`) when an agent the team or one of
 *                           its sub-teams uses misses a required setting in the realm; otherwise
 *                           forwarded to Core unchanged, as before.
 *
 * Token route (routes/route_auth.ts); Core applies its route policy.
 */
import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';
import type { RunPreflightService } from '../services/run_preflight_service.js';

export class RunEnqueueController extends BaseController {
    constructor(
        private readonly _preflight: RunPreflightService,
        private readonly _proxy_service: ProxyService,
    ) {
        super();
    }

    /**
     * Check the realm's agent settings for the team, then forward to Core.
     *
     * @throws ApiError 422 `agent_settings_missing` with `details.agents` (nothing queued).
     */
    async enqueue(req: Request, res: Response): Promise<void> {
        const body = (req.body ?? {}) as { realm_id?: unknown; payload?: { team_id?: unknown } };
        const token = this.bearer(req);
        if (typeof body.realm_id === 'string' && typeof body.payload?.team_id === 'string') {
            await this._preflight.check(body.realm_id, body.payload.team_id, token);
        }
        const org_header = req.headers['x-org-id'];
        const org_id = Array.isArray(org_header) ? org_header[0] : org_header;
        res.json(await this._proxy_service.forward(req.path, req.body, token, org_id));
    }
}
