/**
 * The Core credential for a request: the explicit Bearer (PAT / daemon token)
 * or the cookie session's `target_token`. Controllers pass it to services.
 * Also the body test behind per-body route rules (routes/route_auth.ts).
 */

import type { Request } from 'express';
import { ApiError } from '../errors/api_error.js';

/**
 * The credential forwarded to Core: an explicit `Authorization: Bearer …`
 * (user PAT, daemon token) wins over the cookie session's `target_token`.
 */
export function forward_token(req: Request): string | null {
    const header = req.headers.authorization ?? '';
    if (header.startsWith('Bearer ')) {
        const bearer = header.slice(7).trim();
        if (bearer) return bearer;
    }
    return req.session_data?.target_token ?? null;
}

/**
 * Token of a route whose auth (`session` / `site_admin` / `token`) the route table already checked.
 *
 * @throws ApiError `internal` (500) when there is none — the route is mis-declared in routes/route_auth.ts.
 */
export function checked_token(req: Request): string {
    const token = forward_token(req);
    if (!token) throw ApiError.internal('route auth not applied: no credential on a protected route');
    return token;
}

/**
 * True when the JSON body carries `field` (any value but `undefined`). The
 * route table and the controller of a per-body route both use this test, so
 * they always agree on which body (and rule) a request has.
 */
export function body_has(req: Request, field: string): boolean {
    const body: unknown = req.body;
    return typeof body === 'object' && body !== null && (body as Record<string, unknown>)[field] !== undefined;
}
