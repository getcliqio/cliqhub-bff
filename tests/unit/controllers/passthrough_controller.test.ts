import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { PassthroughController } from '../../../src/controllers/passthrough_controller.js';
import { ProxyService } from '../../../src/services/proxy_service.js';
import { CoreProxyRepository } from '../../../src/repositories/core_proxy_repository.js';
import { CoreClient } from '../../../src/repositories/core_client.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { error_handler } from '../../../src/middleware/error_handler.js';

function mock_res() {
    const res = {
        status_code: 200,
        body: undefined as unknown,
        status(code: number) {
            this.status_code = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };
    return res as unknown as Response & { status_code: number; body: unknown };
}

/** Controller → ProxyService → CoreProxyRepository over a stubbed client. */
function build(post_body = vi.fn().mockResolvedValue({ ok: true, realms: [] })) {
    const client = { post_body } as unknown as CoreClient;
    const controller = new PassthroughController(new ProxyService(new CoreProxyRepository(client)));
    return { controller, post_body, handler: controller.wrap(controller.forward) };
}

function req_of(fields: Record<string, unknown>): Request {
    return { headers: {}, body: {}, ...fields } as unknown as Request;
}

describe('PassthroughController.forward', () => {
    // No credential → 401 is the route table's job (tests/unit/routes/route_auth.test.ts).

    it('prefers Authorization Bearer over the session token', async () => {
        const { handler, post_body } = build();
        const res = mock_res();
        const next = vi.fn() as NextFunction;
        await handler(req_of({
            session_data: { target_token: 'session-tok' },
            headers: { authorization: 'Bearer machine-tok' },
            path: '/v1/runs/enqueue',
            body: { realm_id: 'r1', team_id: 's/t' },
        }), res, next);

        expect(post_body).toHaveBeenCalledWith('/v1/runs/enqueue', { realm_id: 'r1', team_id: 's/t' }, 'machine-tok', {});
        expect(res.body).toEqual({ ok: true, realms: [] });
        expect(next).not.toHaveBeenCalled();
    });

    it('forwards path, body and the session token, then returns Core\'s body as-is', async () => {
        const { handler, post_body } = build();
        const res = mock_res();
        const next = vi.fn() as NextFunction;
        await handler(req_of({
            session_data: { target_token: 'tok' },
            path: '/v1/realms/get',
            body: { org_id: 'o1' },
        }), res, next);

        expect(post_body).toHaveBeenCalledWith('/v1/realms/get', { org_id: 'o1' }, 'tok', {});
        expect(res.body).toEqual({ ok: true, realms: [] });
        expect(next).not.toHaveBeenCalled();
    });

    it('does not re-wrap a `{ ok, data }` body', async () => {
        const { handler } = build(vi.fn().mockResolvedValue({ ok: true, data: { items: [1] } }));
        const res = mock_res();
        await handler(req_of({ session_data: { target_token: 'tok' }, path: '/v1/runs/get' }), res, vi.fn());
        expect(res.body).toEqual({ ok: true, data: { items: [1] } });
    });

    it('sends `{}` to Core when the request has no body', async () => {
        const { handler, post_body } = build();
        await handler(req_of({ session_data: { target_token: 'tok' }, path: '/v1/realms/get', body: undefined }), mock_res(), vi.fn());
        expect(post_body).toHaveBeenCalledWith('/v1/realms/get', {}, 'tok', {});
    });

    it('forwards the X-Org-Id header to Core', async () => {
        const { handler, post_body } = build(vi.fn().mockResolvedValue({ ok: true }));
        await handler(req_of({
            session_data: { target_token: 'tok' },
            headers: { 'x-org-id': '42' },
            path: '/v1/permissions/list',
        }), mock_res(), vi.fn());

        expect(post_body).toHaveBeenCalledWith('/v1/permissions/list', {}, 'tok', { 'x-org-id': '42' });
    });

    it('uses the first X-Org-Id when the header is repeated', async () => {
        const { handler, post_body } = build(vi.fn().mockResolvedValue({ ok: true }));
        await handler(req_of({
            session_data: { target_token: 'tok' },
            headers: { 'x-org-id': ['a', 'b'] },
            path: '/v1/permissions/list',
        }), mock_res(), vi.fn());

        expect(post_body).toHaveBeenCalledWith('/v1/permissions/list', {}, 'tok', { 'x-org-id': 'a' });
    });

    it('passes Core errors (ApiError and others) to next() — never writes a response itself', async () => {
        const api_err = new ApiError('forbidden', 'nope', 403);
        const { handler, post_body } = build(vi.fn().mockRejectedValue(api_err));
        const res = mock_res();
        const next = vi.fn() as NextFunction;
        const req = req_of({ session_data: { target_token: 'tok' }, path: '/v1/realms/get' });

        await handler(req, res, next);
        expect(next).toHaveBeenCalledWith(api_err);
        expect(res.body).toBeUndefined();

        const boom = new Error('boom');
        post_body.mockRejectedValueOnce(boom);
        await handler(req, mock_res(), next);
        expect(next).toHaveBeenCalledWith(boom);
    });

    it('throws on a route mis-declared without auth (no credential at all)', async () => {
        const { handler, post_body } = build();
        const next = vi.fn() as NextFunction;
        await handler(req_of({ path: '/v1/realms/get' }), mock_res(), next);
        expect(post_body).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('PassthroughController + error handler over a real CoreClient', () => {
    afterEach(() => vi.unstubAllGlobals());

    function app_with(fetch_impl: typeof fetch) {
        vi.stubGlobal('fetch', vi.fn(fetch_impl));
        const client = new CoreClient('http://core.test');
        const c = new PassthroughController(new ProxyService(new CoreProxyRepository(client)));
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            (req as Request).session_data = { target_token: 'sess-tok' } as never;
            next();
        });
        app.post('/v1/realms/get', c.wrap(c.forward));
        app.use(error_handler);
        return app;
    }

    it('sends the bearer, x-org-id and body to Core and answers Core\'s JSON', async () => {
        const app = app_with(async () => new Response(JSON.stringify({ ok: true, realms: [{ id: 'r1' }] }), { status: 200 }));
        const res = await request(app)
            .post('/v1/realms/get')
            .set('Authorization', 'Bearer pat-1')
            .set('x-org-id', 'org-9')
            .send({ org_id: 'o1' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, realms: [{ id: 'r1' }] });
        const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe('http://core.test/v1/realms/get');
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('Bearer pat-1');
        expect(init.headers['x-org-id']).toBe('org-9');
        expect(JSON.parse(init.body)).toEqual({ org_id: 'o1' });
    });

    it('falls back to the session token without a bearer', async () => {
        const app = app_with(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
        await request(app).post('/v1/realms/get').send({});
        const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(init.headers.Authorization).toBe('Bearer sess-tok');
        expect(init.headers['x-org-id']).toBeUndefined();
    });

    it('turns a Core `{ ok:false, error:{ code, message } }` into the BFF error envelope', async () => {
        const app = app_with(async () => new Response(
            JSON.stringify({ ok: false, error: { code: 'forbidden', message: 'nope' } }), { status: 403 },
        ));
        const res = await request(app).post('/v1/realms/get').send({});
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ ok: false, error: { code: 'forbidden', message: 'nope' } });
    });

    it('turns a flat control-plane error `{ ok:false, error:"msg" }` into the envelope', async () => {
        const app = app_with(async () => new Response(JSON.stringify({ ok: false, error: 'realm not found' }), { status: 404 }));
        const res = await request(app).post('/v1/realms/get').send({});
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ ok: false, error: { code: 'not_found', message: 'realm not found' } });
    });

    it('answers 502 network_error when Core is unreachable', async () => {
        const app = app_with(async () => { throw new Error('ECONNREFUSED'); });
        const res = await request(app).post('/v1/realms/get').send({});
        expect(res.status).toBe(502);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe('network_error');
    });
});
