/**
 * Artifact file streams (controllers/artifact_files_controller.ts) over real HTTP: the BFF app
 * in front of a fake Core. Each byte is forwarded as it arrives — a test that would deadlock if
 * the BFF buffered the whole file — plus Range, the size limit and Core's JSON errors.
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { create_test_app } from '../../helpers/test_container.js';

const TOKEN = 'cliq_dt_test';
const MB = 1024 * 1024;

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

const servers: http.Server[] = [];
afterEach(async () => {
    await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))));
});

async function listen(handler: Handler | http.RequestListener): Promise<string> {
    const server = http.createServer(handler);
    servers.push(server);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

/** The BFF app in front of `core`; returns the BFF's base URL. */
async function bff_over(core: Handler, over: { artifact_max_mb?: number } = {}): Promise<string> {
    const core_url = await listen(core);
    const { app } = create_test_app({ core_api_url: core_url, ...over });
    return listen(app);
}

/** One request with a streamed body; resolves with status, headers and the whole body. */
function call(
    url: string,
    opts: { method: string; headers?: Record<string, string | number>; body?: (req: http.ClientRequest) => void; on_chunk?: (n: number) => void },
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: opts.method, headers: { authorization: `Bearer ${TOKEN}`, ...opts.headers } }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => { chunks.push(c); opts.on_chunk?.(c.length); });
            res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) }));
            res.on('error', reject);
        });
        req.on('error', reject);
        if (opts.body) opts.body(req);
        else req.end();
    });
}

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

describe('POST /v1/artifacts/upload', () => {
    it('streams the file to Core with its query, type, size and the bearer — Core reads bytes before the client has sent them all', async () => {
        const file = randomBytes(8 * MB);
        let first_chunk!: () => void;
        const core_has_bytes = new Promise<void>((r) => { first_chunk = r; });
        const seen: { url?: string; headers?: http.IncomingHttpHeaders; sha?: string } = {};

        const bff = await bff_over((req, res) => {
            seen.url = req.url;
            seen.headers = req.headers;
            const chunks: Buffer[] = [];
            req.on('data', (c: Buffer) => { chunks.push(c); first_chunk(); });
            req.on('end', () => {
                seen.sha = sha(Buffer.concat(chunks));
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true, data: { artifact_id: 'a-1' } }));
            });
        });

        const half = file.length / 2;
        const res = await call(`${bff}/v1/artifacts/upload?run_id=r1&phase=build&name=big.bin`, {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream', 'content-length': file.length },
            body: (req) => {
                req.write(file.subarray(0, half));
                // The rest only once Core has bytes: a buffering BFF would never get here.
                void core_has_bytes.then(() => req.end(file.subarray(half)));
            },
        });

        expect(res.status).toBe(200);
        expect(JSON.parse(res.body.toString())).toEqual({ ok: true, data: { artifact_id: 'a-1' } });
        expect(seen.url).toBe('/v1/artifacts/upload?run_id=r1&phase=build&name=big.bin');
        expect(seen.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'content-type': 'application/octet-stream', 'content-length': String(file.length) });
        expect(seen.sha).toBe(sha(file));
    });

    it('a JSON file is still the raw body (express.json leaves the upload alone)', async () => {
        let got = '';
        const bff = await bff_over((req, res) => {
            req.setEncoding('utf8');
            req.on('data', (c: string) => { got += c; });
            req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true,"data":{}}'); });
        });
        const json = '{"a":1}';
        const res = await call(`${bff}/v1/artifacts/upload?run_id=r1&phase=p`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': json.length },
            body: (req) => req.end(json),
        });
        expect(res.status).toBe(200);
        expect(got).toBe(json);
    });

    it('413 before Core is called when Content-Length is over CLIQ_ARTIFACT_MAX_MB', async () => {
        let core_called = false;
        const bff = await bff_over((_req, res) => { core_called = true; res.end(); }, { artifact_max_mb: 1 });
        const res = await call(`${bff}/v1/artifacts/upload?run_id=r1&phase=p`, {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream', 'content-length': 2 * MB },
            // Only the start of the declared body: the answer comes before the rest is sent.
            body: (req) => { req.on('error', () => {}); req.write(Buffer.alloc(1024)); },
        });
        expect(res.status).toBe(413);
        expect(JSON.parse(res.body.toString()).error.code).toBe('payload_too_large');
        expect(core_called).toBe(false);
    });

    it('401 without a credential', async () => {
        const bff = await bff_over((_req, res) => res.end());
        const res = await new Promise<number>((resolve, reject) => {
            const req = http.request(`${bff}/v1/artifacts/upload?run_id=r1`, { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } }, (r) => { r.resume(); resolve(r.statusCode!); });
            req.on('error', reject);
            req.end('x');
        });
        expect(res).toBe(401);
    });
});

describe('GET|POST /v1/artifacts/download', () => {
    it('streams the file out with its headers — the client reads bytes before Core has sent them all', async () => {
        const file = randomBytes(8 * MB);
        let client_has_bytes!: () => void;
        const got_bytes = new Promise<void>((r) => { client_has_bytes = r; });
        let seen_body = '';

        const bff = await bff_over((req, res) => {
            req.setEncoding('utf8');
            req.on('data', (c: string) => { seen_body += c; });
            req.on('end', () => {
                res.writeHead(200, {
                    'content-type': 'application/octet-stream',
                    'content-length': file.length,
                    'content-disposition': 'attachment; filename="big.bin"',
                    'accept-ranges': 'bytes',
                    'x-internal': 'not copied',
                });
                const half = file.length / 2;
                res.write(file.subarray(0, half));
                // The rest only once the client has bytes: a buffering BFF would never get here.
                void got_bytes.then(() => res.end(file.subarray(half)));
            });
        });

        const res = await call(`${bff}/v1/artifacts/download`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: (req) => req.end(JSON.stringify({ artifact_id: 'a-1' })),
            on_chunk: () => client_has_bytes(),
        });

        expect(res.status).toBe(200);
        expect(JSON.parse(seen_body)).toEqual({ artifact_id: 'a-1' });
        expect(res.headers).toMatchObject({
            'content-type': 'application/octet-stream',
            'content-length': String(file.length),
            'content-disposition': 'attachment; filename="big.bin"',
            'accept-ranges': 'bytes',
        });
        expect(res.headers['x-internal']).toBeUndefined();
        expect(sha(res.body)).toBe(sha(file));
    });

    it('GET passes the query and Range through and answers 206 with Content-Range', async () => {
        const seen: { url?: string; range?: string } = {};
        const bff = await bff_over((req, res) => {
            seen.url = req.url;
            seen.range = req.headers.range;
            res.writeHead(206, { 'content-type': 'text/plain', 'content-length': 4, 'content-range': 'bytes 2-5/10', 'accept-ranges': 'bytes' });
            res.end('2345');
        });
        const res = await call(`${bff}/v1/artifacts/download?artifact_id=a-1`, { method: 'GET', headers: { range: 'bytes=2-5' } });
        expect(seen).toEqual({ url: '/v1/artifacts/download?artifact_id=a-1', range: 'bytes=2-5' });
        expect(res.status).toBe(206);
        expect(res.headers['content-range']).toBe('bytes 2-5/10');
        expect(res.body.toString()).toBe('2345');
    });

    it('Core\'s JSON error comes back as-is', async () => {
        const error = { ok: false, error: { code: 'not_found', message: 'Artifact not found' } };
        const bff = await bff_over((_req, res) => {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify(error));
        });
        const res = await call(`${bff}/v1/artifacts/download?artifact_id=nope`, { method: 'GET' });
        expect(res.status).toBe(404);
        expect(JSON.parse(res.body.toString())).toEqual(error);
    });
});
