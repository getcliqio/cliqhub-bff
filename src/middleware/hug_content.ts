/**
 * The content route (PLAN-hug-widgets §7, §11.2): `GET /hb/<sha256>/<path>` on the content host — and nothing else
 * there. Mounted first, before helmet, parsing, sessions and CSRF: it reads no cookie and sends §7's headers only
 * (helmet's `X-Frame-Options` would stop the Hub framing a hug). A request for any other host passes through.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { HugContentService } from '../services/hug_content_service.js';
import type { SlidingWindowLimiter } from '../lib/sliding_window_limiter.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('mw.hug_content');

/** The content route, gated on the request's Host. */
export function create_hug_content_middleware(content: HugContentService, limiter: SlidingWindowLimiter): RequestHandler {
    const host = content.content_host;
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!host || (req.headers.host ?? '').toLowerCase() !== host) {
            next();
            return;
        }
        void serve(content, limiter, req, res);
    };
}

async function serve(content: HugContentService, limiter: SlidingWindowLimiter, req: Request, res: Response): Promise<void> {
    const not_found = (): void => { res.status(404).type('text/plain').send('Not found'); };
    const match = /^\/hb\/([^/]+)\/(.+)$/.exec(req.path);
    if (!match || (req.method !== 'GET' && req.method !== 'HEAD')) { not_found(); return; }
    const limit = limiter.hit(req.ip ?? 'unknown');
    if (!limit.allowed) {
        res.status(429).set('Retry-After', String(Math.ceil(limit.retry_after_ms / 1000))).type('text/plain').send('Too many requests');
        return;
    }
    let path: string;
    try { path = decodeURIComponent(match[2]!); } catch { not_found(); return; }
    try {
        const file = await content.file(match[1]!, path);
        if (!file) { not_found(); return; }
        res.status(200).set(content.headers()).set('Content-Type', file.content_type);
        if (req.method === 'HEAD') res.set('Content-Length', String(file.body.length)).end();
        else res.send(file.body);
    } catch (err) {
        log.error('hug_content_failed', { path: req.path, error: err instanceof Error ? err.message : String(err) });
        res.status(502).type('text/plain').send('Bad gateway');
    }
}
