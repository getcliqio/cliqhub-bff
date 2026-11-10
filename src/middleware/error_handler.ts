/**
 * The last middleware: turns anything thrown or passed to `next(err)` into
 * the error envelope `{ ok: false, error: { code, message, details? } }`.
 *
 *   ApiError      → its status and code (Core errors arrive here already
 *                   translated by errors/upstream_error.ts)
 *   a body over the parser's limit → 413 `payload_too_large` (a caller resending
 *                   the same body would be refused again — cliqd's outbox stops on it)
 *   anything else → 500 `internal_error` (message hidden in production)
 *
 * Logging follows middleware/error_logging.ts.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/api_error.js';
import { log_request_error, public_error_message } from './error_logging.js';

/** Express error middleware: writes the error envelope (see file header). */
export function error_handler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof ApiError) {
        log_request_error(req, err.status, err, err.code);
        res.status(err.status).json({
            ok: false,
            error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
        });
        return;
    }

    if ((err as { type?: unknown } | null)?.type === 'entity.too.large') {
        log_request_error(req, 413, err, 'payload_too_large');
        res.status(413).json({ ok: false, error: { code: 'payload_too_large', message: 'The request body is too large' } });
        return;
    }

    log_request_error(req, 500, err);
    res.status(500).json({
        ok: false,
        error: { code: 'internal_error', message: public_error_message(err) },
    });
}
