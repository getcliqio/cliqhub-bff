/**
 * Applies the BFF route table (`routes/route_auth.ts`) to every request, once,
 * after session auth — controllers never repeat the sign-in / site-admin check.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { get_logger } from '../lib/log.js';
import { body_has, forward_token } from '../lib/request_auth.js';
import type { RouteAuth } from '../routes/route_auth.js';
import { ApiError } from '../errors/api_error.js';

const log = get_logger('mw.route_auth');

interface Pattern { key: string; method: string; re: RegExp; auth: RouteAuth }

/**
 * Compiles the route table into a lookup `(method, path) → { key, auth } | null`:
 * exact keys first, then `:param` patterns; HEAD counts as GET, a trailing slash is ignored.
 */
export function compile_route_auth(table: Record<string, RouteAuth>) {
    const exact = new Map<string, RouteAuth>();
    const patterns: Pattern[] = [];
    for (const [key, auth] of Object.entries(table)) {
        const [method, path] = key.split(' ');
        if (!path.includes(':')) { exact.set(key, auth); continue; }
        const re = new RegExp('^' + path.replace(/[.]/g, '\\.').replace(/:\w+/g, '[^/]+') + '$');
        patterns.push({ key, method, re, auth });
    }
    return (method: string, path: string): { key: string; auth: RouteAuth } | null => {
        const m = method === 'HEAD' ? 'GET' : method;
        const trimmed = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
        const key = `${m} ${trimmed}`;
        const hit = exact.get(key);
        if (hit) return { key, auth: hit };
        const p = patterns.find((x) => x.method === m && x.re.test(trimmed));
        return p ? { key: p.key, auth: p.auth } : null;
    };
}

/**
 * Middleware enforcing each route's {@link RouteAuth}: 401 without the needed
 * credential, 403 for a non-admin on a `site_admin` route; a per-body rule is
 * `public` when the body has its field, else its `otherwise` rule. Unknown routes pass through.
 */
export function create_route_auth_middleware(table: Record<string, RouteAuth>): RequestHandler {
    const lookup = compile_route_auth(table);
    return (req: Request, res: Response, next: NextFunction) => {
        const found = lookup(req.method, req.path);
        if (!found) return next(); // unknown route → the router answers (JSON 404 for /v1)
        const deny = (status: 401 | 403, reason: string) => {
            log.warn('access_denied', { route: found.key, status, reason, user_id: req.session_data?.user_id ?? null });
            next(status === 401 ? ApiError.unauthorized('Login required') : ApiError.forbidden('Admin access required'));
        };
        const auth = typeof found.auth === 'object'
            ? (body_has(req, found.auth.public_with) ? 'public' : found.auth.otherwise)
            : found.auth;
        switch (auth) {
            case 'public':
                return next();
            case 'token':
                return forward_token(req) ? next() : deny(401, 'no_token');
            case 'session':
                return req.session_data ? next() : deny(401, 'no_session');
            case 'site_admin':
                if (!req.session_data) return deny(401, 'no_session');
                return req.session_data.role === 'admin' ? next() : deny(403, 'not_site_admin');
        }
    };
}

/** Start-up check: mounted routes vs the table. `missing` = served without a line. */
export function check_route_auth(mounted: string[], table: Record<string, RouteAuth>): { missing: string[]; stale: string[] } {
    const have = new Set(Object.keys(table));
    const set = new Set(mounted);
    return {
        missing: mounted.filter((r) => !have.has(r)),
        stale: [...have].filter((k) => !set.has(k)).sort(),
    };
}
