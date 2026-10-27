/**
 * Hug page — request schema (Zod, SoT for the inbound body) and response data.
 *
 * Routes (controllers/hug_page_controller.ts):
 *   POST /v1/hug_page/get — one Hug (prompt, context, requested inputs, responses)
 *
 * Core: hugs/get_by_id (runs.view on the Hug's realm).
 * Answers go to Core directly (`/v1/hugs/respond`, files through `/v1/artifacts/upload`).
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/hug_page/get */
export const HugPageGetInput = z.object({
    hug_id: z.string().min(1).max(200)
        .describe('Hug id'),
});
export type HugPageGetInput = z.infer<typeof HugPageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** `hug_page/get` */
export interface HugPageData {
    /** Core `hugs/get_by_id` data as sent. */
    hug: Record<string, unknown>;
}
