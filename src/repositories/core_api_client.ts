import { ApiError, status_for_code } from './api_error.js';
import { get_logger } from '../lib/log.js';
import { current_request_id } from '../lib/request_context.js';

const log = get_logger('core-api-client');

/**
 * HTTP client for Hub Core API (BACKEND_URL / internal :4000).
 * Public clients use Hub BFF; this runs only inside the BFF process.
 * Responses are forwarded as returned by Hub Core (often flat `{ ok, …fields }`;
 * agents/notifications Controllers use `{ ok, data }`).
 */
export class CoreApiClient {
    private _base_url: string;

    constructor(base_url: string) {
        this._base_url = base_url.replace(/\/+$/, '');
    }

    async post<T extends Record<string, unknown>>(
        path: string,
        body: unknown,
        token?: string,
        extra_headers?: Record<string, string>,
    ): Promise<T> {
        const url = `${this._base_url}${path.startsWith('/') ? path : `/${path}`}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...extra_headers,
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const internal_token = process.env.INTERNAL_API_TOKEN;
        if (internal_token && path.startsWith('/internal')) {
            headers['X-Internal-Token'] = internal_token;
        }

        const request_id = current_request_id();
        if (request_id) {
            headers['x-request-id'] = request_id;
        }

        const started_at = Date.now();
        let res: Response;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body ?? {}),
                signal: AbortSignal.timeout(15_000),
            });
        } catch (err) {
            log.error('upstream_unreachable', {
                request_id: request_id ?? null,
                method: 'POST',
                path,
                error: (err as Error).message,
                duration_ms: Date.now() - started_at,
            });
            throw new ApiError(
                'network_error',
                `Core API unreachable: ${(err as Error).message}`,
                502,
            );
        }

        let data: Record<string, unknown>;
        try {
            data = await res.json() as Record<string, unknown>;
        } catch {
            log.error('upstream_non_json', {
                request_id: request_id ?? null,
                method: 'POST',
                path,
                status: res.status,
                duration_ms: Date.now() - started_at,
            });
            // Prefer upstream status (e.g. Express HTML 404) over a synthetic 502 so
            // the SPA can show a real error instead of a gateway failure.
            const status = res.status >= 400 ? res.status : 502;
            throw new ApiError(
                'parse_error',
                `Core API returned non-JSON response (${res.status})`,
                status,
            );
        }

        if (data.ok === false || res.status >= 400) {
            const raw_error = data.error;
            const err_obj = (typeof raw_error === 'object' && raw_error !== null)
                ? raw_error as { code?: string; message?: string }
                : undefined;
            const code = err_obj?.code ?? (typeof data.code === 'string' ? data.code : 'unknown');
            const message = err_obj?.message
                ?? (typeof raw_error === 'string' ? raw_error : null)
                ?? (typeof data.message === 'string' ? data.message : 'Core API request failed');
            const mapped = status_for_code(code);
            const status = mapped !== 500 ? mapped : (res.status >= 400 ? res.status : 502);
            log.warn('upstream_error', {
                request_id: request_id ?? null,
                method: 'POST',
                path,
                status: res.status,
                code,
                error: message,
                duration_ms: Date.now() - started_at,
            });
            throw new ApiError(code, message, status);
        }

        return data as T;
    }

    /** Unauthenticated GET proxy (A2A agent card). Returns raw upstream status + JSON body. */
    async get_json(
        path: string,
    ): Promise<{ status: number; body: unknown }> {
        const url = `${this._base_url}${path.startsWith('/') ? path : `/${path}`}`;
        const headers: Record<string, string> = {
            Accept: 'application/json',
        };
        const request_id = current_request_id();
        if (request_id) {
            headers['x-request-id'] = request_id;
        }

        let res: Response;
        try {
            res = await fetch(url, { method: 'GET', headers });
        } catch (err) {
            throw new ApiError(
                'network_error',
                `Core API unreachable: ${(err as Error).message}`,
                502,
            );
        }

        let body: unknown;
        try {
            body = await res.json();
        } catch {
            throw new ApiError('parse_error', 'Core API returned non-JSON response', 502);
        }

        return { status: res.status, body };
    }
}
