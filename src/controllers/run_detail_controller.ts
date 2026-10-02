/**
 * Run detail — one run with its phases, realm and pending reviews (BFF composition).
 *
 * Routes (1:1 with this controller, mounted in routes/):
 *   POST /v1/run_detail/get — the run, phases, labels, realm and pending reviews
 *
 * Session route (routes/route_auth.ts); Core gates the run by realm membership.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `RunDetailGetInput` in `schemas/run_detail_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RunDetailService } from '../services/run_detail_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { RunDetailGetInput } from '../schemas/run_detail_types.js';
import type { RunDetailData } from '../schemas/run_detail_types.js';

/** One run's detail page. */
export class RunDetailController extends BaseController {
    constructor(private readonly _run_detail_service: RunDetailService) {
        super();
    }

    /**
     * One run's detail, polled by the run page.
     *
     * @param req - Body: {@link RunDetailGetInput}
     * @param res - `{ ok: true, data: RunDetailData }`; 404 when Core has no such run
     */
    async get(req: ApiRequest<RunDetailGetInput, RunDetailData>, res: ApiOkResponse<RunDetailData>): Promise<void> {
        const body = this.parse_body(RunDetailGetInput, req);
        this.ok(res, await this._run_detail_service.get(body, this.session(req).target_token));
    }
}
