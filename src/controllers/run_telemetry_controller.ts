import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from './base_controller.js';
import type { RunTelemetryService } from '../services/run_telemetry_service.js';

export const run_telemetry_get_schema = z.object({ run_id: z.string().min(1) });

/** `POST /v1/run_telemetry/get` → `{ ok, data: RunTelemetryDTO }` (run page Timeline / Usage / DAG). */
export class RunTelemetryController extends BaseController {
    constructor(private _service: RunTelemetryService) {
        super();
    }

    get = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        this.ok(res, await this._service.get(req.session_data.target_token, this.parse_body(run_telemetry_get_schema, req)));
    });
}
