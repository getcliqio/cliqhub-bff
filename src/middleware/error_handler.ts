import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../repositories/api_error.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('errors');

export function error_handler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof ApiError) {
        res.status(err.status).json({
            ok: false,
            error: { code: err.code, message: err.message },
        });
        return;
    }

    log.error('unhandled_error', {
        request_id: req.request_id ?? null,
        path: req.originalUrl || req.url,
        method: req.method,
        error: err.message,
    });

    res.status(500).json({
        ok: false,
        error: {
            code: 'internal_error',
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message,
        },
    });
}
