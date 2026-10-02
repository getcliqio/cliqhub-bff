/**
 * Streams — Core's server-sent-event streams, piped to the client as they arrive (never buffered).
 *
 * Routes (1:1 with this controller, mounted in routes/passthrough.ts):
 *   GET /v1/runs/stream?run_id=&after_id=                 — a run's live events
 *   GET /v1/reviews/stream_messages?review_id=&after_id=  — a review's live messages
 *
 * Route auth `token`; Core checks access to the run / review.
 * Response: `text/event-stream` (errors before the stream opens use the JSON error envelope).
 * Inbound SoT: Zod `Stream*Input` in `schemas/streams_types.ts`.
 */

import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';
import { StreamRunsInput, StreamReviewMessagesInput } from '../schemas/streams_types.js';
import { forward_token } from '../lib/request_auth.js';
import { pipe_stream } from '../lib/pipe_stream.js';

const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
} as const;

/** Core SSE streams piped to the client. */
export class StreamsController extends BaseController {
    constructor(private readonly _proxy_service: ProxyService) {
        super();
    }

    /**
     * A run's live event stream.
     *
     * @param req - Query: {@link StreamRunsInput}
     * @param res - `text/event-stream`; 422 without run_id
     */
    async runs(req: Request, res: Response): Promise<void> {
        const query = this.parse_query(StreamRunsInput, req);
        const stream = await this._proxy_service.stream_run(query, forward_token(req));
        res.writeHead(200, SSE_HEADERS);
        await pipe_stream(req, res, stream);
    }

    /**
     * A review's live message stream.
     *
     * @param req - Query: {@link StreamReviewMessagesInput}
     * @param res - `text/event-stream`
     */
    async review_messages(req: Request, res: Response): Promise<void> {
        const query = this.parse_query(StreamReviewMessagesInput, req);
        const stream = await this._proxy_service.stream_review_messages(query, forward_token(req));
        res.writeHead(200, SSE_HEADERS);
        await pipe_stream(req, res, stream);
    }
}
