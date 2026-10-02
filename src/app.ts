/**
 * Express app assembly: security / parsing / logging middleware, CSRF,
 * session auth, route-auth enforcement, the route table, the SPA fallback
 * and the error handler — in that order.
 */

import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';

import type { Container } from './container.js';
import { error_handler } from './middleware/error_handler.js';
import { request_logging_middleware } from './middleware/request_logging.js';
import { csrf_guard } from './middleware/csrf_guard.js';
import { create_session_auth } from './middleware/session_auth.js';
import { create_route_auth_middleware, check_route_auth } from './middleware/enforce_route_auth.js';
import { ROUTE_AUTH } from './routes/route_auth.js';
import { register_routes } from './routes/index.js';
import { get_logger } from './lib/log.js';
import { ApiError } from './errors/api_error.js';

const log = get_logger('app');

/**
 * Builds the Express app from the container.
 *
 * @throws Error when a mounted route has no line in routes/route_auth.ts (start-up fault).
 */
export function create_app(container: Container): express.Express {
    const app = express();
    const { config, session_store, hydrate_bearer } = container;
    // Which proxies may set req.ip through X-Forwarded-For (TRUST_PROXY; off by default).
    app.set('trust proxy', config.trust_proxy);

    app.use(helmet({ contentSecurityPolicy: false }));

    if (config.cors_origins.length > 0) {
        app.use(cors({
            origin: config.cors_origins,
            credentials: true,
        }));
    }

    app.use(express.json({ limit: '2mb' }));
    app.use(cookieParser());
    app.use(request_logging_middleware);
    app.use(csrf_guard);
    // Cookie session OR Authorization Bearer (same Hub JWT / user PAT).
    app.use(create_session_auth(session_store, config.cookie_name, hydrate_bearer));
    // Every route's credential rule, once (routes/route_auth.ts) — controllers never repeat it.
    app.use(create_route_auth_middleware(ROUTE_AUTH));

    const mounted = register_routes(app, container);
    const { missing, stale } = check_route_auth(mounted, ROUTE_AUTH);
    if (missing.length > 0) {
        log.fatal('route_without_auth_rule', { missing });
        throw new Error(`Routes without a line in routes/route_auth.ts: ${missing.join(', ')}`);
    }
    if (stale.length > 0) log.warn('auth_rule_without_route', { stale });

    // Unknown /v1/* must return JSON — never fall through to the SPA HTML shell
    // (that produces "Unexpected token '<'" when the UI calls res.json()).
    app.use('/v1', (_req, _res, next) => next(ApiError.not_found('Unknown API route')));

    // Serve the Vite-built SPA in production. Express 5 dropped the bare '*'
    // wildcard pattern; use a regex catch-all that matches every path so the
    // SPA's client-side router handles unknown routes.
    const static_dir = config.static_dir;
    if (static_dir) {
        app.use(express.static(static_dir, { index: false }));
        app.get(/.*/, (req, res, next) => {
            if (req.path.startsWith('/v1/') || req.path.startsWith('/internal/')) {
                next(ApiError.not_found('Unknown API route'));
                return;
            }
            res.sendFile(path.join(static_dir, 'index.html'));
        });
    }

    // Last: every error (ApiError or not) becomes `{ ok: false, error: { code, message } }`.
    app.use(error_handler);

    return app;
}
