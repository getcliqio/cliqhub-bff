/**
 * Review page (HUG packet) — request schema (Zod, SoT for the inbound body) and response data.
 *
 * Routes (controllers/review_page_controller.ts):
 *   POST /v1/review_page/get — one review packet plus the org that granted access
 *
 * BFF composition over Core: reviews/get_by_id (without an org, then per caller org), orgs/get { mine }.
 */

import { z } from 'zod';
import type { RunDetailPhaseOutputData } from './run_detail_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/review_page/get */
export const ReviewPageGetInput = z.object({
    review_id: z.string().min(1).max(200)
        .describe('Review id'),
    org_id: z.string().uuid().optional()
        .describe('Org to read it through (reviews.view); found automatically when omitted'),
});
export type ReviewPageGetInput = z.infer<typeof ReviewPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** `review_page/get` */
export interface ReviewPageData {
    /** Core `reviews/get_by_id` data as sent. */
    review: Record<string, unknown>;
    /** The org the review was read through; null when the caller is a reviewer. */
    org_id: string | null;
    /** Earlier phases' outputs in the packet, read for display (as on the run page). */
    phase_outputs: RunDetailPhaseOutputData[];
}
