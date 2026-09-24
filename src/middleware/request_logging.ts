/**
 * HTTP request logging + `x-request-id` for BFF.
 */

import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

import { get_logger } from '../lib/log.js';
import { bff_request_als } from '../lib/request_context.js';

declare global {
    namespace Express {
        interface Request {
            request_id?: string;
        }
    }
}

const log = get_logger('http');

function resolve_request_id(req: Request): string {
    const header = req.headers['x-request-id'];
    if (typeof header === 'string' && header.trim()) return header.trim().slice(0, 128);
    if (Array.isArray(header) && typeof header[0] === 'string' && header[0].trim()) {
        return header[0].trim().slice(0, 128);
    }
    return randomUUID();
}

export function request_logging_middleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const request_id = resolve_request_id(req);
    req.request_id = request_id;
    res.setHeader('x-request-id', request_id);

    const started_at = Date.now();
    const path = req.originalUrl || req.url;

    bff_request_als.run({ request_id }, () => {
        res.on('finish', () => {
            const status = res.statusCode;
            const ctx = {
                request_id,
                method: req.method,
                path,
                status,
                duration_ms: Date.now() - started_at,
            };

            if (status >= 500) {
                log.error('request', ctx);
                return;
            }
            if (status >= 400) {
                log.warn('request', ctx);
                return;
            }
            log.debug('request', ctx);
        });

        next();
    });
}
