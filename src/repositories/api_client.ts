import { ApiError } from './api_error.js';
import { upstream_error } from './upstream_error.js';
import { get_logger } from '../lib/log.js';
import { current_request_id } from '../lib/request_context.js';

const log = get_logger('api-client');

export interface ApiEnvelope<T = unknown> {
    ok: boolean;
    data?: T;
    /** Object on most routes; a plain string on Core control-plane routes. */
    error?: { code: string; message: string } | string;
    code?: string;
}

export class ApiClient {
    private _base_url: string;

    constructor(base_url: string) {
        this._base_url = base_url.replace(/\/+$/, '');
    }

    async post<T>(path: string, body: unknown, token?: string): Promise<T> {
        const r = await this._fetch('POST', path, body, token);
        if (!r.body || r.body.ok !== true || r.status >= 400) {
            throw upstream_error(r.status, r.body as Record<string, unknown> | null, 'POST', path);
        }
        return r.body.data as T;
    }

    async get<T>(path: string, token?: string): Promise<T> {
        const r = await this._fetch('GET', path, undefined, token);
        if (!r.body || r.body.ok !== true || r.status >= 400) {
            throw upstream_error(r.status, r.body as Record<string, unknown> | null, 'GET', path);
        }
        return r.body.data as T;
    }

    /** The envelope as Core sent it (errors included); throws only when there is no JSON. */
    async post_raw(
        path: string,
        body: unknown,
        token?: string,
    ): Promise<ApiEnvelope> {
        const r = await this._fetch('POST', path, body, token);
        if (!r.body) throw upstream_error(r.status, null, 'POST', path);
        return r.body;
    }

    private async _fetch(
        method: string,
        path: string,
        body: unknown,
        token?: string,
    ): Promise<{ status: number; body: ApiEnvelope | null }> {
        const url = `${this._base_url}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const request_id = current_request_id();
        if (request_id) {
            headers['x-request-id'] = request_id;
        }

        const options: RequestInit = { method, headers };
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const started_at = Date.now();
        let res: Response;
        try {
            res = await fetch(url, options);
        } catch (err) {
            log.error('upstream_unreachable', {
                request_id: request_id ?? null,
                method,
                path,
                error: (err as Error).message,
                duration_ms: Date.now() - started_at,
            });
            throw new ApiError(
                'network_error',
                `Backend unreachable: ${(err as Error).message}`,
                502,
            );
        }

        const status = typeof res.status === 'number' ? res.status : 200;
        let data: ApiEnvelope;
        try {
            data = await res.json() as ApiEnvelope;
        } catch {
            log.error('upstream_non_json', {
                request_id: request_id ?? null,
                method,
                path,
                status,
                duration_ms: Date.now() - started_at,
            });
            return { status, body: null };
        }

        if (!data || typeof data !== 'object') {
            return { status, body: null };
        }

        if (!data.ok || status >= 400) {
            const raw = (data as { error?: unknown }).error;
            log.warn('upstream_error', {
                request_id: request_id ?? null,
                method,
                path,
                status,
                code: (raw && typeof raw === 'object' ? (raw as { code?: string }).code : (data as { code?: string }).code) ?? null,
                error: (raw && typeof raw === 'object' ? (raw as { message?: string }).message : raw) ?? null,
                duration_ms: Date.now() - started_at,
            });
        }

        return { status, body: data };
    }
}
