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
import { create_rate_limiter } from './middleware/rate_limit.js';
import { CONTROL_PLANE_PASSTHROUGH_PATHS } from './lib/control_plane_routes.js';
import type { HealthDTO } from './types/dto.js';

export function create_app(container: Container): express.Express {
    const app = express();
    const {
        config, session_store, auth_controller, session_controller, teams_controller, admin_controller,
        orgs_controller, invitations_controller,
        dispatch_key_controller, account_controller, dashboard_controller,
        hub_passthrough, core_api_client, hydrate_bearer,
    } = container;

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

    app.get('/bff-health', (_req, res) => {
        const data: HealthDTO = {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
        res.json({ ok: true, data });
    });

    // Public A2A agent card (no auth) — proxied to Core API
    // Org-scoped route: /a2a/o/:org/r/:slug/.well-known/agent-card.json
    app.get('/a2a/o/:org/r/:slug/.well-known/agent-card.json', async (req, res, next) => {
        try {
            const org = encodeURIComponent(String(req.params.org ?? ''));
            const slug = encodeURIComponent(String(req.params.slug ?? ''));
            const upstream = await core_api_client.get_json(
                `/a2a/o/${org}/r/${slug}/.well-known/agent-card.json`,
            );
            res.status(upstream.status).json(upstream.body);
        } catch (err) {
            next(err);
        }
    });

    // A2A invoke (Bearer) — supports JSON and SSE (message/stream)
    // Org-scoped route: /a2a/o/:org/r/:slug/send
    app.post('/a2a/o/:org/r/:slug/send', async (req, res, next) => {
        try {
            const org = encodeURIComponent(String(req.params.org ?? ''));
            const slug = encodeURIComponent(String(req.params.slug ?? ''));
            const auth = req.headers.authorization ?? '';
            const upstream_url = `${container.config.backend_url.replace(/\/$/, '')}/a2a/o/${org}/r/${slug}/send`;
            const upstream = await fetch(upstream_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: req.headers.accept ?? 'application/json',
                    ...(auth ? { Authorization: auth } : {}),
                },
                body: JSON.stringify(req.body ?? {}),
            });

            const content_type = upstream.headers.get('content-type') ?? 'application/json';
            res.status(upstream.status);
            res.setHeader('Content-Type', content_type);

            if (content_type.includes('text/event-stream') && upstream.body) {
                res.setHeader('Cache-Control', 'no-cache, no-transform');
                res.setHeader('Connection', 'keep-alive');
                const reader = upstream.body.getReader();
                const decoder = new TextDecoder();
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(decoder.decode(value, { stream: true }));
                }
                res.end();
                return;
            }

            const text = await upstream.text();
            res.send(text);
        } catch (err) {
            next(err);
        }
    });

    /**
     * Site-admin sessions use AdminController; members use the resource controller.
     * When `skip_when` returns true, always use the member handler (e.g. My Teams
     * with mine/group_by_scope must not hit the flat admin inventory).
     */
    const prefer_admin = (
        admin_handler: express.RequestHandler,
        fallback: express.RequestHandler,
        skip_when?: (req: express.Request) => boolean,
    ): express.RequestHandler => (req, res, next) => {
        if (skip_when?.(req)) {
            fallback(req, res, next);
            return;
        }
        if (req.session_data?.role === 'admin') {
            admin_handler(req, res, next);
            return;
        }
        fallback(req, res, next);
    };

    // --- Session (dual-token PAT) + signup/tokens ---
    app.post('/v1/session/create', session_controller.create);
    app.post('/v1/session/get', session_controller.get);
    app.post('/v1/session/update', session_controller.update);
    app.post('/v1/session/delete', session_controller.delete);

    app.post('/v1/auth/signup', auth_controller.signup);

    // --- Auth tokens (session + ApiClient → Hub /v1/auth/*_token) ---
    app.post('/v1/auth/generate_token', auth_controller.new_token);
    app.post('/v1/auth/get_tokens', auth_controller.list_tokens);
    app.post('/v1/auth/revoke_token', auth_controller.revoke_token);
    app.post('/v1/auth/rotate_token', auth_controller.rotate_token);

    // --- Teams (single plane /v1/teams/* — hard cut) ---
    // Product catalog / My teams / realm|daemon inventory must use TeamsController
    // even for site admins. Admin inventory only for bare admin browser filters.
    app.post('/v1/teams/get', prefer_admin(
        admin_controller.get_teams,
        teams_controller.get,
        (req) => req.body?.mine === true
            || Boolean(req.body?.realm_id)
            || Boolean(req.body?.daemon_id)
            || Boolean(req.body?.query)
            || Boolean(req.body?.tag)
            || Boolean(req.body?.status)
            || Boolean(req.body?.group_by_scope),
    ));
    app.post('/v1/teams/get_by_id', teams_controller.get_by_id);
    app.post('/v1/teams/create', teams_controller.create);
    app.post('/v1/teams/update', teams_controller.update);
    app.post('/v1/teams/download', teams_controller.download);
    app.post('/v1/teams/publish', teams_controller.publish);
    app.post('/v1/teams/unpublish', teams_controller.unpublish);
    app.post('/v1/teams/delete', teams_controller.delete_team);
    app.post('/v1/teams/rename', teams_controller.rename);
    app.post('/v1/teams/get_versions', teams_controller.get_versions);
    app.post('/v1/teams/get_phases', teams_controller.get_phases);

    // Single build resource (action discriminator)
    const builder_rate_limit = create_rate_limiter(config);
    app.post('/v1/teams/build', builder_rate_limit, teams_controller.build);

    // --- Orgs (admin list-all vs member my-orgs) ---
    app.post('/v1/orgs/get', prefer_admin(
        admin_controller.get_orgs,
        orgs_controller.get,
        (req) => req.body?.mine === true,
    ));
    app.post('/v1/orgs/get_by_id', orgs_controller.get_by_id);
    app.post('/v1/orgs/update', orgs_controller.update);
    app.post('/v1/orgs/leave', orgs_controller.leave);
    app.post('/v1/orgs/add_member', orgs_controller.add_member);
    app.post('/v1/orgs/remove_member', orgs_controller.remove_member);
    app.post('/v1/orgs/list_roles', orgs_controller.list_roles);
    app.post('/v1/orgs/get_role', orgs_controller.get_role);
    app.post('/v1/orgs/create_role', orgs_controller.create_role);
    app.post('/v1/orgs/update_role', orgs_controller.update_role);
    app.post('/v1/orgs/delete_role', orgs_controller.delete_role);
    app.post('/v1/users/update_role', orgs_controller.update_user_role);
    app.post('/v1/orgs/new_scope', orgs_controller.new_scope);
    app.post('/v1/orgs/delete_scope', orgs_controller.delete_scope);
    app.post('/v1/orgs/assign_scope_member', orgs_controller.assign_scope_member);
    app.post('/v1/orgs/unassign_scope_member', orgs_controller.unassign_scope_member);

    // --- Invitations (all → Core /v1) ---
    app.post('/v1/invitations/create', invitations_controller.create);
    app.post('/v1/invitations/get', invitations_controller.get);
    app.post('/v1/invitations/get_by_id', invitations_controller.get_by_id);
    app.post('/v1/invitations/revoke', invitations_controller.revoke);
    app.post('/v1/invitations/get_by_token', invitations_controller.get_by_token);
    app.post('/v1/invitations/accept', invitations_controller.accept);

    app.post('/v1/orgs/new', admin_controller.new_org);
    app.post('/v1/orgs/delete', admin_controller.delete_org);

    // --- Dashboard (BFF console rollups → Core /internal) ---
    app.post('/v1/dashboard/summary', dashboard_controller.summary);
    app.post('/v1/dashboard/realms', dashboard_controller.realms);

    // ── Realm wire keys (proxied to Core; session or Bearer) ─────────
    app.post('/v1/auth/get_dispatch_public_key', dispatch_key_controller.get_public_key);
    app.post('/v1/auth/rotate_dispatch_key', dispatch_key_controller.regenerate);

    // ── Control plane (flat Hub Core API responses; Bearer or session) ─
    for (const route_path of CONTROL_PLANE_PASSTHROUGH_PATHS) {
        app.post(route_path, hub_passthrough);
    }

    // ── SSE proxy for run event streaming
    // GET /v1/runs/stream?run_id= — chunked passthrough to backend.
    // Must NOT buffer the response (SSE requires immediate delivery).
    app.get('/v1/runs/stream', async (req, res, next) => {
        try {
            const run_id = encodeURIComponent(String(req.query.run_id ?? ''));
            if (!run_id) {
                res.status(400).json({ ok: false, error: 'run_id is required' });
                return;
            }
            const after_id = req.query['after_id'] ?? '';
            const qs_parts = [`run_id=${run_id}`];
            if (after_id) qs_parts.push(`after_id=${encodeURIComponent(String(after_id))}`);
            const upstream_url = `${config.backend_url.replace(/\/$/, '')}/v1/runs/stream?${qs_parts.join('&')}`;

            const auth = req.headers.authorization
                ?? (req.session_data?.target_token ? `Bearer ${req.session_data.target_token}` : '');

            const upstream = await fetch(upstream_url, {
                method: 'GET',
                headers: {
                    Accept: 'text/event-stream',
                    ...(auth ? { Authorization: auth } : {}),
                },
            });

            if (!upstream.ok || !upstream.body) {
                res.status(upstream.status).json({ ok: false, error: 'upstream_error' });
                return;
            }

            res.writeHead(upstream.status, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });

            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();

            const pump = async (): Promise<void> => {
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(decoder.decode(value, { stream: true }));
                }
                res.end();
            };

            req.on('close', () => {
                void reader.cancel().catch(() => {});
            });

            await pump();
        } catch (err) {
            next(err);
        }
    });

    // ── SSE proxy for review chat messages ─────────────────────────
    // GET /v1/reviews/stream_messages — chunked passthrough to backend.
    app.get('/v1/reviews/stream_messages', async (req, res, next) => {
        try {
            const review_id = req.query['review_id'] ?? '';
            const after_id = req.query['after_id'] ?? '';
            const params = new URLSearchParams();
            if (review_id) params.set('review_id', String(review_id));
            if (after_id) params.set('after_id', String(after_id));
            const qs = params.toString() ? `?${params.toString()}` : '';
            const upstream_url = `${config.backend_url.replace(/\/$/, '')}/v1/reviews/stream_messages${qs}`;

            const auth = req.headers.authorization
                ?? (req.session_data?.target_token ? `Bearer ${req.session_data.target_token}` : '');

            const upstream = await fetch(upstream_url, {
                method: 'GET',
                headers: {
                    Accept: 'text/event-stream',
                    ...(auth ? { Authorization: auth } : {}),
                },
            });

            if (!upstream.ok || !upstream.body) {
                res.status(upstream.status).json({ ok: false, error: 'upstream_error' });
                return;
            }

            res.writeHead(upstream.status, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });

            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value, { stream: true }));
            }
            res.end();
        } catch (err) {
            next(err);
        }
    });

    // ── Account (self-service) ─────────────────────────────────────
    app.post('/v1/users/update_profile', account_controller.update_profile);
    app.post('/v1/users/change_password', account_controller.change_password);

    // ── Privileged ops on resource paths (no /admin namespace) ───────
    app.post('/v1/reports/audit', admin_controller.audit);
    app.post('/v1/users/get', admin_controller.get_users);
    app.post('/v1/users/get_by_id', admin_controller.get_user);
    app.post('/v1/users/new', admin_controller.new_user);
    app.post('/v1/users/update', admin_controller.update_user);
    app.post('/v1/users/suspend', admin_controller.suspend_user);
    app.post('/v1/users/unsuspend', admin_controller.unsuspend_user);
    app.post('/v1/users/delete', admin_controller.delete_user);
    app.post('/v1/users/set_role', admin_controller.set_user_role);
    app.post('/v1/users/reset_password', admin_controller.reset_user_password);
    app.post('/v1/scopes/get', admin_controller.get_scopes);
    app.post('/v1/scopes/new', admin_controller.new_scope);
    app.post('/v1/scopes/update', admin_controller.update_scope);
    app.post('/v1/scopes/delete', admin_controller.delete_scope);
    app.post('/v1/scopes/add_user', admin_controller.add_scope_user);
    app.post('/v1/scopes/remove_user', admin_controller.remove_scope_user);

    // Unknown /v1/* must return JSON — never fall through to the SPA HTML shell
    // (that produces "Unexpected token '<'" when the UI calls res.json()).
    app.use('/v1', (_req, res) => {
        res.status(404).json({
            ok: false,
            error: { code: 'not_found', message: 'Unknown API route' },
        });
    });

    app.use(error_handler);

    // Serve the Vite-built SPA in production. Express 5 dropped the bare '*'
    // wildcard pattern; use a regex catch-all that matches every path so the
    // SPA's client-side router handles unknown routes.
    const static_dir = config.static_dir;
    if (static_dir) {
        app.use(express.static(static_dir, { index: false }));
        app.get(/.*/, (req, res) => {
            if (req.path.startsWith('/v1/') || req.path.startsWith('/internal/')) {
                res.status(404).json({
                    ok: false,
                    error: { code: 'not_found', message: 'Unknown API route' },
                });
                return;
            }
            res.sendFile(path.join(static_dir, 'index.html'));
        });
    }

    return app;
}
