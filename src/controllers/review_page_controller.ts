import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from './base_controller.js';
import type { ReviewPageService } from '../services/review_page_service.js';

export const review_page_get_schema = z.object({
    review_id: z.string().min(1).max(200),
    org_id: z.string().uuid().optional(),
});

/**
 * `POST /v1/review_page/get` → `{ ok, data: { review, org_id } }`.
 * Writes stay on Core: reviews/verdict, reviews/send_message.
 */
export class ReviewPageController extends BaseController {
    constructor(private _service: ReviewPageService) {
        super();
    }

    page = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(review_page_get_schema, req);
        this.ok(res, await this._service.page(req.session_data.target_token, body));
    });
}
