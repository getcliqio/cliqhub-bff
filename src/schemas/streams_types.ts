/**
 * Streams — query schemas of Core's server-sent-event streams (GET, query string).
 *
 * Routes (controllers/streams_controller.ts):
 *   GET /v1/runs/stream?run_id=&after_id=
 *   GET /v1/reviews/stream_messages?review_id=&after_id=
 */

import { z } from 'zod';

/** GET /v1/runs/stream */
export const StreamRunsInput = z.object({
    run_id: z.string().min(1, 'run_id is required')
        .describe('Run id'),
    after_id: z.string().optional()
        .describe('Resume after this event id'),
});
export type StreamRunsInput = z.infer<typeof StreamRunsInput>;

/** GET /v1/reviews/stream_messages */
export const StreamReviewMessagesInput = z.object({
    review_id: z.string().optional()
        .describe('Review id'),
    after_id: z.string().optional()
        .describe('Resume after this message id'),
});
export type StreamReviewMessagesInput = z.infer<typeof StreamReviewMessagesInput>;
