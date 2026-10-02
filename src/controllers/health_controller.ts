/**
 * Health — liveness of the BFF and the last Core compatibility check.
 *
 * Routes (1:1 with this controller, mounted in routes/health.ts):
 *   GET /bff-health (public)
 */

import type { Request } from 'express';
import { BaseController } from './base_controller.js';
import type { HealthService } from '../services/health_service.js';
import type { ApiOkResponse } from '../types/api_response.js';
import type { HealthData } from '../schemas/health_types.js';

/** BFF liveness and Core compatibility. */
export class HealthController extends BaseController {
    constructor(private readonly _health_service: HealthService) {
        super();
    }

    /**
     * Always 200 while the process serves; `core` says whether the running
     * Core is new enough (null until the first check finishes).
     *
     * @param _req - No body
     * @param res - `{ ok: true, data: HealthData }`
     */
    async get(_req: Request, res: ApiOkResponse<HealthData>): Promise<void> {
        this.ok(res, this._health_service.get());
    }
}
