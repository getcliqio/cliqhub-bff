import { describe, it, expect, vi, afterEach } from 'vitest';
import { upstream_error, VERSION_HINT } from '../../../src/repositories/upstream_error.js';
import { ApiClient } from '../../../src/repositories/api_client.js';
import { CoreApiClient } from '../../../src/repositories/core_api_client.js';
import { ApiError } from '../../../src/repositories/api_error.js';

describe('upstream_error', () => {
    it('keeps the message from Core control-plane string errors', () => {
        const e = upstream_error(403, { ok: false, error: 'Not a member of this realm' }, 'POST', '/v1/teams/get');
        expect(e).toMatchObject({ code: 'forbidden', status: 403, message: 'Not a member of this realm' });
    });
    it('uses a top-level code when Core sends one', () => {
        const e = upstream_error(404, { ok: false, error: 'Realm not found', code: 'not_found' }, 'POST', '/v1/realms/get');
        expect(e).toMatchObject({ code: 'not_found', status: 404, message: 'Realm not found' });
    });
    it('reads object envelopes', () => {
        const e = upstream_error(409, { ok: false, error: { code: 'conflict', message: 'Exists' } }, 'POST', '/x');
        expect(e).toMatchObject({ code: 'conflict', status: 409, message: 'Exists' });
    });
    it('a 500 keeps its message and status', () => {
        const e = upstream_error(500, { ok: false, error: 'column "x" does not exist' }, 'POST', '/v1/teams/get');
        expect(e).toMatchObject({ code: 'upstream_error', status: 500, message: 'column "x" does not exist' });
    });
    it('never falls back to a generic message without saying where', () => {
        const e = upstream_error(502, { ok: false }, 'POST', '/v1/teams/get');
        expect(e.message).toContain('/v1/teams/get');
        expect(e.message).toContain('502');
    });
    it('missing route (HTML 404) → version-skew message', () => {
        const e = upstream_error(404, null, 'POST', '/v1/teams/delete_version');
        expect(e).toMatchObject({ code: 'upstream_route_missing', status: 502 });
        expect(e.message).toBe(`Core doesn't have POST /v1/teams/delete_version. ${VERSION_HINT}`);
    });
    it('unknown field (Zod unrecognized keys) → version-skew message', () => {
        const e = upstream_error(400, { ok: false, error: "Unrecognized key(s) in object: 'team_id'" }, 'POST', '/v1/runs/get');
        expect(e.code).toBe('upstream_version_mismatch');
        expect(e.status).toBe(502);
        expect(e.message).toContain("'team_id'");
        expect(e.message).toContain(VERSION_HINT);
    });
    it('Core route_not_found → version-skew message', () => {
        const e = upstream_error(404, { ok: false, error: { code: 'route_not_found', message: 'Unknown API route: POST /v1/x' } }, 'POST', '/v1/x');
        expect(e).toMatchObject({ code: 'upstream_route_missing', status: 502 });
        expect(e.message).toContain(VERSION_HINT);
    });
    it('older Cores (not_found + "Unknown API route") are treated the same', () => {
        const e = upstream_error(404, { ok: false, error: { code: 'not_found', message: 'Unknown API route' } }, 'POST', '/v1/x');
        expect(e.code).toBe('upstream_route_missing');
    });
    it('a real not-found record stays a 404', () => {
        const e = upstream_error(404, { ok: false, error: 'Realm not found', code: 'not_found' }, 'POST', '/v1/realms/get');
        expect(e).toMatchObject({ code: 'not_found', status: 404, message: 'Realm not found' });
    });
    it('other non-JSON responses say which status and path', () => {
        const e = upstream_error(503, null, 'POST', '/v1/x');
        expect(e).toMatchObject({ code: 'parse_error', status: 503 });
        expect(e.message).toContain('HTTP 503');
    });
});

describe('clients use it', () => {
    const mock_fetch = vi.fn();
    afterEach(() => { vi.unstubAllGlobals(); mock_fetch.mockReset(); });

    it('ApiClient surfaces Core string errors (was “Backend request failed”)', async () => {
        vi.stubGlobal('fetch', mock_fetch);
        mock_fetch.mockResolvedValue({ status: 403, json: async () => ({ ok: false, error: 'Not a member of this realm' }) });
        const err = await new ApiClient('http://core').post('/v1/teams/get', {}).catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ code: 'forbidden', status: 403, message: 'Not a member of this realm' });
    });
    it('ApiClient: missing route → version-skew error', async () => {
        vi.stubGlobal('fetch', mock_fetch);
        mock_fetch.mockResolvedValue({ status: 404, json: async () => { throw new SyntaxError('Unexpected token <'); } });
        const err = await new ApiClient('http://core').post('/v1/new_thing', {}).catch((e) => e);
        expect(err.code).toBe('upstream_route_missing');
    });
    it('CoreApiClient: missing route → version-skew error', async () => {
        vi.stubGlobal('fetch', mock_fetch);
        mock_fetch.mockResolvedValue({ status: 404, json: async () => { throw new SyntaxError('Unexpected token <'); } });
        const err = await new CoreApiClient('http://core').post('/v1/new_thing', {}).catch((e) => e);
        expect(err.code).toBe('upstream_route_missing');
        expect(err.status).toBe(502);
    });
});
