/**
 * Run telemetry — the run page's Timeline / Usage / DAG tabs and summary strip.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/run_telemetry/get — totals, phases, agent bars, per-model / per-agent usage
 *
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RunTelemetryGetInput` in `schemas/run_telemetry_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RunTelemetryService } from '../services/run_telemetry_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RunTelemetryGetInput } from '../schemas/run_telemetry_types.js';
import type { RunTelemetryData } from '../schemas/run_telemetry_types.js';

/** A run's telemetry tabs (timeline, usage, DAG). */
export class RunTelemetryController extends BaseController {
    constructor(private readonly _run_telemetry_service: RunTelemetryService) {
        super();
    }

    /**
     * One run's telemetry; usage / spans / phases / workflow are best-effort (`sections`).
     *
     * @param req - Body: {@link RunTelemetryGetInput}
     * @param res - `{ ok: true, data: RunTelemetryData }`; 404 when the run is not visible
     */
    async get(req: ApiRequest<RunTelemetryGetInput, RunTelemetryData>, res: ApiOkResponse<RunTelemetryData>): Promise<void> {
        const body = this.parse_body(RunTelemetryGetInput, req);
        this.ok(res, await this._run_telemetry_service.get(body, this.session(req).target_token));
    }
}
