/**
 * The content route (PLAN-hug-widgets §7, §11.2): hug bundle files on the content host only, with exactly §7's
 * headers; nothing else on that host; the Hub host untouched; off without both origins. Also the 6 MB JSON limit
 * for `hugs/create` (a bundle resend) against 2 MB elsewhere, and that the Hub's session cookie stays host-only.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { create_test_app } from '../helpers/test_container.js';
import { sign_in_routes, stub_core } from '../helpers/core_stub.js';

const SHA = 'a'.repeat(64);
const ORIGINS = { content_origin: 'http://content.test:8080', hub_origin: 'https://hub.test' };
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    + "font-src 'self' data:; media-src 'self' blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors https://hub.test";

/** Core's get_file over `fetch`: `files` by `<sha256>/<path>`; every call recorded. */
function stub_bundle(files: Record<string, { body: string; type: string }>): Array<Record<string, unknown>> {
    const calls: Array<Record<string, unknown>> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.pathname !== '/v1/hug_bundles/get_file') return new Response('unstubbed', { status: 599 });
        const body = JSON.parse(String(init?.body)) as { sha256: string; path: string };
        calls.push(body);
        const file = files[`${body.sha256}/${body.path}`];
        return file ? new Response(file.body, { status: 200, headers: { 'content-type': file.type } }) : new Response('{"ok":false}', { status: 404 });
    });
    return calls;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('content route', () => {
    it('serves a bundle file on the content host with exactly §7\'s headers — no cookie, no X-Frame-Options', async () => {
        const calls = stub_bundle({ [`${SHA}/assets/main.js`]: { body: 'console.log(1)', type: 'text/javascript; charset=utf-8' } });
        const { app } = create_test_app(ORIGINS);
        const res = await request(app).get(`/hb/${SHA}/assets/main.js`).set('Host', 'content.test:8080');
        expect(res.status).toBe(200);
        expect(res.text).toBe('console.log(1)');
        expect(res.headers).toMatchObject({
            'content-type': 'text/javascript; charset=utf-8',
            'content-security-policy': CSP,
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'no-referrer',
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=31536000, immutable',
        });
        expect(res.headers).not.toHaveProperty('x-frame-options');
        expect(res.headers).not.toHaveProperty('set-cookie');
        expect(calls).toEqual([{ sha256: SHA, path: 'assets/main.js' }]);
        // Cached: bundles never change.
        await request(app).get(`/hb/${SHA}/assets/main.js`).set('Host', 'content.test:8080');
        expect(calls).toHaveLength(1);
    });

    it('404 for an unknown file, a bad hash or a path with ".." — the last two before Core is asked', async () => {
        const calls = stub_bundle({});
        const { app } = create_test_app(ORIGINS);
        const get = (path: string) => request(app).get(path).set('Host', 'content.test:8080');
        expect((await get(`/hb/${SHA}/nope.js`)).status).toBe(404);
        expect((await get('/hb/not-a-hash/index.html')).status).toBe(404);
        expect((await get(`/hb/${SHA}/a%2F..%2Fhug.json`)).status).toBe(404);
        expect(calls).toEqual([{ sha256: SHA, path: 'nope.js' }]);
    });

    it('the content host serves nothing else (no API, no SPA); the Hub host never serves /hb', async () => {
        stub_core({});
        const { app } = create_test_app(ORIGINS);
        expect((await request(app).get('/bff-health').set('Host', 'content.test:8080')).status).toBe(404);
        expect((await request(app).post('/v1/session/create').set('Host', 'content.test:8080').send({})).status).toBe(404);
        const hub = await request(app).get(`/hb/${SHA}/index.html`).set('Host', 'hub.test');
        expect(hub.status).toBe(404);
        expect(hub.headers['x-frame-options']).toBe('SAMEORIGIN'); // helmet still guards the Hub
    });

    it('is off unless both CONTENT_ORIGIN and HUB_ORIGIN are set', async () => {
        const calls = stub_bundle({ [`${SHA}/index.html`]: { body: '<p>x</p>', type: 'text/html' } });
        for (const over of [{}, { content_origin: ORIGINS.content_origin }, { hub_origin: ORIGINS.hub_origin }]) {
            const { app } = create_test_app(over);
            expect((await request(app).get(`/hb/${SHA}/index.html`).set('Host', 'content.test:8080')).status).toBe(404);
        }
        expect(calls).toEqual([]);
    });
});

describe('JSON body limits', () => {
    it('hugs/create takes up to 6 MB (a bundle resend); other routes keep 2 MB', async () => {
        stub_core({ ...sign_in_routes('u-1', 'ana', 'tok'), '/v1/hugs/create': { status: 201, json: { ok: true, data: { hug_id: 'h' } } }, '/v1/hugs/respond': { json: { ok: true, data: {} } } });
        const { app } = create_test_app();
        const big = { hug_id: 'h', spec: {}, bundle: { files: { 'main.js': 'x'.repeat(4 * 1024 * 1024) } } };
        const create = await request(app).post('/v1/hugs/create').set('Authorization', 'Bearer cliq_dt_x').send(big);
        expect(create.status).not.toBe(413);
        const respond = await request(app).post('/v1/hugs/respond').set('Authorization', 'Bearer cliq_dt_x').send({ hug_id: 'h', values: { big: 'x'.repeat(3 * 1024 * 1024) } });
        expect(respond.status).toBe(413);
        expect(respond.body).toEqual({ ok: false, error: { code: 'payload_too_large', message: 'The request body is too large' } });
    });
});

describe('session cookie', () => {
    it('stays host-only: no Domain attribute, so the content subdomain never receives it (§7.1)', async () => {
        stub_core(sign_in_routes('u-1', 'ana', 'tok'));
        const { app } = create_test_app(ORIGINS);
        const res = await request(app).post('/v1/session/create').set({ 'X-Requested-With': 'XMLHttpRequest' }).send({ username: 'ana', password: 'pw' });
        const cookie = String(res.headers['set-cookie']?.[0] ?? '');
        expect(cookie).toContain('test_sid=');
        expect(cookie.toLowerCase()).not.toContain('domain=');
    });
});
