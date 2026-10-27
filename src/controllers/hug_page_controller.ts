/**
 * Hug page — one request for input, as the person answering it sees it.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/hug_page/get — the Hug plus the org that granted access
 *
 * Writes stay on Core: hugs/respond (files through artifacts/upload).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `HugPageGetInput` in `schemas/hug_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { HugPageService } from '../services/hug_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { HugPageGetInput, type HugPageData } from '../schemas/hug_page_types.js';

/** One Hug page. */
export class HugPageController extends BaseController {
    constructor(private readonly _hug_page_service: HugPageService) {
        super();
    }

    /**
     * One Hug; the BFF finds the org that grants access when none is given.
     *
     * @param req - Body: {@link HugPageGetInput}
     * @param res - `{ ok: true, data: HugPageData }`
     */
    async get(req: ApiRequest<HugPageGetInput, HugPageData>, res: ApiOkResponse<HugPageData>): Promise<void> {
        const body = this.parse_body(HugPageGetInput, req);
        this.ok(res, await this._hug_page_service.get(body, this.session(req).target_token));
    }
}
