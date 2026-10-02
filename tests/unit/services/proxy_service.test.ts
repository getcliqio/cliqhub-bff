import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ProxyService } from '../../../src/services/proxy_service.js';
import { CoreProxyRepository } from '../../../src/repositories/core_proxy_repository.js';
import { CoreClient } from '../../../src/repositories/core_client.js';
import { StreamsController } from '../../../src/controllers/streams_controller.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { error_handler } from '../../../src/middleware/error_handler.js';

function sse_body(text: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(ctrl) {
            ctrl.enqueue(new TextEncoder().encode(text));
            ctrl.close();
        },
    });
}

function service_with(stream: ReturnType<typeof vi.fn>) {
    const repo = { stream } as unknown as CoreProxyRepository;
    return new ProxyService(repo);
}

describe('ProxyService.forward', () => {
    it('adds x-org-id only when given', async () => {
        const forward = vi.fn().mockResolvedValue({ ok: true });
        const svc = new ProxyService({ forward } as unknown as CoreProxyRepository);

        await svc.forward('/v1/runs/get', { a: 1 }, 'tok');
        expect(forward).toHaveBeenLastCalledWith('/v1/runs/get', { a: 1 }, 'tok', {});

        await svc.forward('/v1/runs/get', { a: 1 }, 'tok', 'org-1');
        expect(forward).toHaveBeenLastCalledWith('/v1/runs/get', { a: 1 }, 'tok', { 'x-org-id': 'org-1' });
    });
});

describe('ProxyService streams', () => {
    it('stream_run opens GET /v1/runs/stream with run_id and after_id and returns the body', async () => {
        const body = sse_body('data: x\n\n');
        const stream = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
        const svc = service_with(stream);

        const out = await svc.stream_run({ run_id: 'run-1', after_id: 'e-5' }, 'tok');

        expect(out).toBeInstanceOf(ReadableStream);
        const [path, params, token] = stream.mock.calls[0];
        expect(path).toBe('/v1/runs/stream');
        expect((params as URLSearchParams).toString()).toBe('run_id=run-1&after_id=e-5');
        expect(token).toBe('tok');
    });

    it('drops empty query values and passes a null token through', async () => {
        const stream = vi.fn().mockResolvedValue(new Response(sse_body(''), { status: 200 }));
        const svc = service_with(stream);

        await svc.stream_review_messages({ review_id: 'rv-1', after_id: undefined }, null);

        const [path, params, token] = stream.mock.calls[0];
        expect(path).toBe('/v1/reviews/stream_messages');
        expect((params as URLSearchParams).toString()).toBe('review_id=rv-1');
        expect(token).toBeNull();
    });

    it('throws ApiError upstream_error with Core\'s status when Core refuses the stream', async () => {
        const stream = vi.fn().mockResolvedValue(new Response('{"ok":false}', { status: 403 }));
        const svc = service_with(stream);

        const err = await svc.stream_run({ run_id: 'run-1' }, 'tok').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.code).toBe('upstream_error');
        expect(err.status).toBe(403);
        expect(err.message).toContain('/v1/runs/stream');
    });

    it('throws 502 when Core answers 2xx without a body', async () => {
        const stream = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        const svc = service_with(stream);

        const err = await svc.stream_review_messages({ review_id: 'rv' }, 'tok').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(502);
    });
});

describe('CoreProxyRepository.stream', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('GETs the path with the query, SSE accept and the bearer', async () => {
        const fetch_mock = vi.fn().mockResolvedValue(new Response(sse_body(''), { status: 200 }));
        vi.stubGlobal('fetch', fetch_mock);
        const repo = new CoreProxyRepository(new CoreClient('http://core.test'));

        await repo.stream('/v1/runs/stream', new URLSearchParams({ run_id: 'r1' }), 'tok');

        const [url, init] = fetch_mock.mock.calls[0];
        expect(url).toBe('http://core.test/v1/runs/stream?run_id=r1');
        expect(init.method).toBe('GET');
        expect(init.headers.Accept).toBe('text/event-stream');
        expect(init.headers.Authorization).toBe('Bearer tok');
    });

    it('sends no Authorization without a token and no "?" without a query', async () => {
        const fetch_mock = vi.fn().mockResolvedValue(new Response(sse_body(''), { status: 200 }));
        vi.stubGlobal('fetch', fetch_mock);
        const repo = new CoreProxyRepository(new CoreClient('http://core.test'));

        await repo.stream('/v1/reviews/stream_messages', new URLSearchParams(), null);

        const [url, init] = fetch_mock.mock.calls[0];
        expect(url).toBe('http://core.test/v1/reviews/stream_messages');
        expect(init.headers.Authorization).toBeUndefined();
    });
});

describe('StreamsController over ProxyService', () => {
    function app_with(stream: ReturnType<typeof vi.fn>) {
        const c = new StreamsController(service_with(stream));
        const app = express();
        app.get('/v1/runs/stream', c.wrap(c.runs));
        app.get('/v1/reviews/stream_messages', c.wrap(c.review_messages));
        app.use(error_handler);
        return app;
    }

    it('422 invalid_params when run_id is missing (parsed before Core is called)', async () => {
        const stream = vi.fn();
        const res = await request(app_with(stream)).get('/v1/runs/stream');
        expect(res.status).toBe(422);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe('invalid_params');
        expect(res.body.error.message).toContain('run_id');
        expect(stream).not.toHaveBeenCalled();
    });

    it('answers the JSON error envelope when Core refuses the stream', async () => {
        const stream = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }));
        const res = await request(app_with(stream)).get('/v1/runs/stream?run_id=r1');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            ok: false,
            error: { code: 'upstream_error', message: 'Core refused the stream /v1/runs/stream' },
        });
    });

    it('pipes the event stream with SSE headers and the bearer', async () => {
        const stream = vi.fn().mockResolvedValue(new Response(sse_body('data: hello\n\n'), { status: 200 }));
        const res = await request(app_with(stream))
            .get('/v1/reviews/stream_messages?review_id=rv1')
            .set('Authorization', 'Bearer pat');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.text).toBe('data: hello\n\n');
        expect(stream.mock.calls[0][2]).toBe('pat');
    });
});
