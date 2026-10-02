/**
 * HTTP client for Hub Core: bearer + request id on every call, Core error
 * envelopes turned into `ApiError` (errors/upstream_error.ts), unreachable /
 * non-JSON responses logged. Repositories are its only callers.
 */

import { ApiError } from '../errors/api_error.js';
import { upstream_error } from '../errors/upstream_error.js';
import { get_logger } from '../lib/log.js';
import { current_request_id } from '../lib/request_context.js';

const log = get_logger('repo.core_client');

/** Body timeout for flat control-plane calls (builder/LLM calls use `post` without one). */
const BODY_TIMEOUT_MS = 15_000;

/** Core's JSON response envelope as sent. */
export interface ApiEnvelope<T = unknown> {
    ok: boolean;
    data?: T;
    /** Object on most routes; a plain string on some Core control-plane routes. */
    error?: { code: string; message: string } | string;
    code?: string;
}

interface FetchOpts {
    token?: string;
    extra_headers?: Record<string, string>;
    timeout_ms?: number;
    accept_only?: boolean;
}

/**
 * The BFF's one HTTP client for Hub Core (BACKEND_URL, private). Repositories
 * are the only callers. Two response shapes exist on Core today:
 *  - `post` / `get`: `{ ok, data }` → returns `data` (product routes)
 *  - `post_body`: returns the whole JSON body (flat `{ ok, …fields }` control-plane routes)
 * Every request carries the caller's bearer and the request id.
 */
export class CoreClient {
    private _base_url: string;

    constructor(base_url: string) {
        this._base_url = base_url.replace(/\/+$/, '');
    }

    /** `{ ok, data }` route → `data`; throws unless `ok === true`. */
    async post<T>(path: string, body: unknown, token?: string): Promise<T> {
        const r = await this._fetch('POST', path, body, { token });
        if (!r.body || r.body.ok !== true || r.status >= 400) {
            throw upstream_error(r.status, r.body as Record<string, unknown> | null, 'POST', path);
        }
        return r.body.data as T;
    }

    /** `{ ok, data }` GET route → `data`; throws unless `ok === true`. */
    async get<T>(path: string, token?: string): Promise<T> {
        const r = await this._fetch('GET', path, undefined, { token });
        if (!r.body || r.body.ok !== true || r.status >= 400) {
            throw upstream_error(r.status, r.body as Record<string, unknown> | null, 'GET', path);
        }
        return r.body.data as T;
    }

    /** The envelope as Core sent it (errors included); throws only when there is no JSON. */
    async post_raw(path: string, body: unknown, token?: string): Promise<ApiEnvelope> {
        const r = await this._fetch('POST', path, body, { token });
        if (!r.body) throw upstream_error(r.status, null, 'POST', path);
        return r.body;
    }

    /** Whole JSON body (flat routes); throws on `ok: false` or HTTP >= 400. */
    async post_body<T extends Record<string, unknown>>(
        path: string,
        body: unknown,
        token?: string,
        extra_headers?: Record<string, string>,
    ): Promise<T> {
        const r = await this._fetch('POST', path, body ?? {}, { token, extra_headers, timeout_ms: BODY_TIMEOUT_MS });
        if (!r.body) throw upstream_error(r.status, null, 'POST', path);
        if (r.body.ok === false || r.status >= 400) {
            throw upstream_error(r.status, r.body as unknown as Record<string, unknown>, 'POST', path);
        }
        return r.body as unknown as T;
    }

    /** Unauthenticated GET (A2A agent card): raw upstream status + JSON body. */
    async get_json(path: string): Promise<{ status: number; body: unknown }> {
        const r = await this._fetch('GET', path, undefined, { accept_only: true });
        if (!r.body) throw new ApiError('parse_error', 'Core API returned non-JSON response', 502);
        return { status: r.status, body: r.body };
    }

    /**
     * Unparsed response (SSE streams, A2A send that may stream). The caller
     * pipes the body; `authorization` is forwarded as given.
     */
    async raw(
        method: 'GET' | 'POST',
        path: string,
        opts: { authorization?: string; accept?: string; body?: unknown } = {},
    ): Promise<Response> {
        const headers: Record<string, string> = {};
        if (opts.accept) headers.Accept = opts.accept;
        if (opts.authorization) headers.Authorization = opts.authorization;
        if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
        const request_id = current_request_id();
        if (request_id) headers['x-request-id'] = request_id;
        const url = `${this._base_url}${path.startsWith('/') ? path : `/${path}`}`;
        try {
            return await fetch(url, { method, headers, ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}) });
        } catch (err) {
            log.error('upstream_unreachable', { request_id: request_id ?? null, method, path, error: (err as Error).message });
            throw new ApiError('network_error', `Core API unreachable: ${(err as Error).message}`, 502);
        }
    }

    private async _fetch(
        method: string,
        path: string,
        body: unknown,
        opts: FetchOpts,
    ): Promise<{ status: number; body: ApiEnvelope | null }> {
        const url = `${this._base_url}${path.startsWith('/') ? path : `/${path}`}`;
        const headers: Record<string, string> = opts.accept_only
            ? { Accept: 'application/json' }
            : { 'Content-Type': 'application/json', ...opts.extra_headers };
        if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
        const request_id = current_request_id();
        if (request_id) headers['x-request-id'] = request_id;

        const init: RequestInit = { method, headers };
        if (body !== undefined) init.body = JSON.stringify(body);
        if (opts.timeout_ms) init.signal = AbortSignal.timeout(opts.timeout_ms);

        const started_at = Date.now();
        let res: Response;
        try {
            res = await fetch(url, init);
        } catch (err) {
            log.error('upstream_unreachable', {
                request_id: request_id ?? null, method, path,
                error: (err as Error).message, duration_ms: Date.now() - started_at,
            });
            throw new ApiError('network_error', `Core API unreachable: ${(err as Error).message}`, 502);
        }

        const status = typeof res.status === 'number' ? res.status : 200;
        let data: ApiEnvelope;
        try {
            data = await res.json() as ApiEnvelope;
        } catch {
            // Not JSON (HTML 404 from a missing route, proxy error page): the callers turn
            // `body: null` into the right ApiError via upstream_error, so continue.
            log.error('upstream_non_json', { request_id: request_id ?? null, method, path, status, duration_ms: Date.now() - started_at });
            return { status, body: null };
        }
        if (!data || typeof data !== 'object') return { status, body: null };

        if (data.ok === false || status >= 400) {
            const raw = (data as { error?: unknown }).error;
            log.warn('upstream_error', {
                request_id: request_id ?? null, method, path, status,
                code: (raw && typeof raw === 'object' ? (raw as { code?: string }).code : (data as { code?: string }).code) ?? null,
                error: (raw && typeof raw === 'object' ? (raw as { message?: string }).message : raw) ?? null,
                duration_ms: Date.now() - started_at,
            });
        }
        return { status, body: data };
    }
}
