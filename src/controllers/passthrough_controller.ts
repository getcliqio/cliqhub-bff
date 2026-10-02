/**
 * Pass-through — the Core routes listed in routes/passthrough_paths.ts,
 * forwarded unchanged: same path, same body, Core's answer as-is (`{ ok, data }`
 * or a flat `{ ok, …fields }` body — never wrapped again).
 *
 * Route auth `token` (or `site_admin` for a few); Core applies its route policy.
 * The credential is an explicit `Authorization: Bearer …` (daemon, CLI) or
 * else the session's target_token (SPA). `x-org-id` is forwarded when sent.
 */

import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';

/** Forwards an allow-listed Core route unchanged. */
export class PassthroughController extends BaseController {
    constructor(private readonly _proxy_service: ProxyService) {
        super();
    }

    /**
     * Forwards `POST {path}` to Core.
     *
     * @param req - Any body; Core validates it
     * @param res - Core's JSON body; Core errors as the BFF error envelope
     */
    async forward(req: Request, res: Response): Promise<void> {
        const org_header = req.headers['x-org-id'];
        const org_id = Array.isArray(org_header) ? org_header[0] : org_header;
        res.json(await this._proxy_service.forward(req.path, req.body, this.bearer(req), org_id));
    }
}
