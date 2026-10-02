/**
 * Review page — one HUG review packet.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/review_page/get — the review plus the org that granted access
 *
 * Writes stay on Core: reviews/verdict, reviews/send_message.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `ReviewPageGetInput` in `schemas/review_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { ReviewPageService } from '../services/review_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { ReviewPageGetInput } from '../schemas/review_page_types.js';
import type { ReviewPageData } from '../schemas/review_page_types.js';

/** One HUG review packet page. */
export class ReviewPageController extends BaseController {
    constructor(private readonly _review_page_service: ReviewPageService) {
        super();
    }

    /**
     * One review packet; the BFF finds the org that grants access when none is given.
     *
     * @param req - Body: {@link ReviewPageGetInput}
     * @param res - `{ ok: true, data: ReviewPageData }`
     */
    async get(req: ApiRequest<ReviewPageGetInput, ReviewPageData>, res: ApiOkResponse<ReviewPageData>): Promise<void> {
        const body = this.parse_body(ReviewPageGetInput, req);
        this.ok(res, await this._review_page_service.get(body, this.session(req).target_token));
    }
}
