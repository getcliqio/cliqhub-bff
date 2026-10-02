/**
 * The BFF route table (src/routes/route_auth.ts): one line per served route,
 * enforced once by enforce_route_auth, and every Core path the BFF forwards
 * or reads exists in Core's route policy table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { error_handler } from '../../../src/middleware/error_handler.js';
import request from 'supertest';
import { describe, it, expect } from 'vitest';

import { ROUTE_AUTH, OWN_ROUTE_KEYS, type RouteAuth } from '../../../src/routes/route_auth.js';
import { register_routes } from '../../../src/routes/index.js';
import { create_route_auth_middleware, check_route_auth } from '../../../src/middleware/enforce_route_auth.js';
import { PASSTHROUGH_PATHS } from '../../../src/routes/passthrough_paths.js';
import { CORE_READS } from '../../../src/repositories/core_read_repository.js';
import { create_test_app } from '../../helpers/test_container.js';

const PASSTHROUGH = Object.keys(PASSTHROUGH_PATHS);

describe('route table', () => {
    it('every mounted route has exactly one line, and every line is mounted', () => {
        const { container } = create_test_app();
        const mounted = register_routes(express(), container);
        expect(new Set(mounted).size, 'a route is mounted twice').toBe(mounted.length);
        expect(check_route_auth(mounted, ROUTE_AUTH)).toEqual({ missing: [], stale: [] });
    });

    it('own routes and Core passthrough never overlap', () => {
        const both = PASSTHROUGH.filter((p) => OWN_ROUTE_KEYS.includes(`POST ${p}`));
        expect(both, 'served by a BFF controller and listed as passthrough').toEqual([]);
    });
});

describe('enforce_route_auth', () => {
    const TABLE: Record<string, RouteAuth> = {
        'POST /p': 'public', 'POST /s': 'session', 'POST /a': 'site_admin', 'POST /t': 'token',
        'GET /x/:id/y': 'session',
        'POST /ba': { public_with: 'email', otherwise: 'site_admin' },
        'POST /bs': { public_with: 'reset_token', otherwise: 'session' },
    };
    const app_as = (who?: 'user' | 'admin') => {
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            if (who) req.session_data = { role: who, target_token: 'tok', user_id: 'u' } as never;
            next();
        });
        app.use(create_route_auth_middleware(TABLE));
        for (const k of Object.keys(TABLE)) {
            const [m, p] = k.split(' ');
            (m === 'GET' ? app.get.bind(app) : app.post.bind(app))(p, (_req, res) => { res.json({ ok: true }); });
        }
        app.post('/unlisted', (_req, res) => { res.json({ ok: true }); });
        app.use(error_handler);
        return app;
    };

    it('public passes without a credential', async () => {
        expect((await request(app_as()).post('/p')).status).toBe(200);
    });

    it('session: 401 envelope without a session; 200 with one (also for path parameters)', async () => {
        const r = await request(app_as()).post('/s');
        expect(r.status).toBe(401);
        expect(r.body).toEqual({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
        expect((await request(app_as('user')).post('/s')).status).toBe(200);
        expect((await request(app_as()).get('/x/1/y')).status).toBe(401);
        expect((await request(app_as('user')).get('/x/1/y')).status).toBe(200);
    });

    it('site_admin: 401 signed out, 403 for a member, 200 for an admin', async () => {
        expect((await request(app_as()).post('/a')).status).toBe(401);
        const r = await request(app_as('user')).post('/a');
        expect(r.status).toBe(403);
        expect(r.body.error.code).toBe('forbidden');
        expect((await request(app_as('admin')).post('/a')).status).toBe(200);
    });

    it('token: a raw bearer (daemon token) is enough; nothing → 401', async () => {
        expect((await request(app_as()).post('/t')).status).toBe(401);
        expect((await request(app_as()).post('/t').set('Authorization', 'Bearer cliq_dt_x')).status).toBe(200);
        expect((await request(app_as('user')).post('/t')).status).toBe(200);
    });

    it('per body: public when the body has the field, else the `otherwise` rule', async () => {
        expect((await request(app_as()).post('/ba').send({ email: 'a@example.test' })).status).toBe(200);
        expect((await request(app_as()).post('/ba').send({ user_id: 'u' })).status).toBe(401);
        expect((await request(app_as('user')).post('/ba').send({ user_id: 'u' })).status).toBe(403);
        expect((await request(app_as('admin')).post('/ba').send({ user_id: 'u' })).status).toBe(200);
        expect((await request(app_as()).post('/ba')).status).toBe(401);
        expect((await request(app_as()).post('/bs').send({ reset_token: 't' })).status).toBe(200);
        expect((await request(app_as()).post('/bs').send({ current_password: 'x' })).status).toBe(401);
        expect((await request(app_as('user')).post('/bs').send({ current_password: 'x' })).status).toBe(200);
    });

    it('routes outside the table are left to the router', async () => {
        expect((await request(app_as()).post('/unlisted')).status).toBe(200);
    });
});

describe('passthrough rules on the real table', () => {
    const app_as = (who?: 'user' | 'admin') => {
        const app = express();
        app.use((req, _res, next) => {
            if (who) req.session_data = { role: who, target_token: 'tok', user_id: 'u' } as never;
            next();
        });
        app.use(create_route_auth_middleware(ROUTE_AUTH));
        for (const p of PASSTHROUGH) app.post(p, (_req, res) => { res.json({ ok: true }); });
        return app;
    };

    it('the password routes are per body; add_member is gone', () => {
        expect(ROUTE_AUTH['POST /v1/users/reset_password']).toEqual({ public_with: 'email', otherwise: 'site_admin' });
        expect(ROUTE_AUTH['POST /v1/users/change_password']).toEqual({ public_with: 'reset_token', otherwise: 'session' });
        expect(ROUTE_AUTH['POST /v1/orgs/add_member']).toBeUndefined();
    });

    it('every passthrough path is `token` or `site_admin` in ROUTE_AUTH', () => {
        for (const [p, auth] of Object.entries(PASSTHROUGH_PATHS)) expect(ROUTE_AUTH[`POST ${p}`], p).toBe(auth);
    });

    it('settings writes: a bare bearer gets 401, a member 403, a site admin through', async () => {
        for (const p of ['/v1/settings/set', '/v1/settings/remove']) {
            expect(ROUTE_AUTH[`POST ${p}`]).toBe('site_admin');
            expect((await request(app_as()).post(p).set('Authorization', 'Bearer cliq_dt_x')).status, p).toBe(401);
            expect((await request(app_as('user')).post(p)).status, p).toBe(403);
            expect((await request(app_as('admin')).post(p)).status, p).toBe(200);
        }
    });

    it('a token passthrough (e.g. /v1/runs/create_rdr) accepts a bare bearer', async () => {
        expect((await request(app_as()).post('/v1/runs/create_rdr')).status).toBe(401);
        expect((await request(app_as()).post('/v1/runs/create_rdr').set('Authorization', 'Bearer cliq_dt_x')).status).toBe(200);
    });
});

describe('Core contract (needs the sibling cliqhub-core checkout)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const table = path.resolve(here, '../../../../cliqhub-core/src/auth/route_policy/table.ts');
    const has_core = fs.existsSync(table);
    const core = has_core
        ? new Set([...fs.readFileSync(table, 'utf8').matchAll(/'(?:GET|POST) (\/[^']+)'/g)].map((m) => m[1]))
        : new Set<string>();

    it.skipIf(!has_core)('every passthrough path exists in Core', () => {
        const gone = PASSTHROUGH.filter((p) => !core.has(p));
        expect(gone, `passthrough paths Core does not serve:\n${gone.join('\n')}`).toEqual([]);
    });

    it.skipIf(!has_core)('the new passthrough paths exist in Core, settings writes as site_admin', () => {
        const src = fs.readFileSync(table, 'utf8');
        for (const p of ['/v1/runs/create_rdr', '/v1/artifacts/submit', '/v1/artifacts/delete', '/v1/auth/validate_token', '/v1/settings/set', '/v1/settings/remove']) {
            expect(core.has(p), p).toBe(true);
        }
        expect(src).toMatch(/'POST \/v1\/settings\/set':\s*site_admin\(/);
        expect(src).toMatch(/'POST \/v1\/settings\/remove':\s*site_admin\(/);
    });

    it.skipIf(!has_core)('every Core read used by page composition exists in Core', () => {
        const gone = Object.values(CORE_READS).filter((p) => !core.has(p));
        expect(gone).toEqual([]);
    });
});
