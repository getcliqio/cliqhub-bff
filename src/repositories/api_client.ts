import { ApiError, status_for_code } from './api_error.js';
import { get_logger } from '../lib/log.js';
import { current_request_id } from '../lib/request_context.js';

const log = get_logger('api-client');

export interface ApiEnvelope<T = unknown> {
    ok: boolean;
    data?: T;
    error?: { code: string; message: string };
}

export class ApiClient {
    private _base_url: string;

    constructor(base_url: string) {
        this._base_url = base_url.replace(/\/+$/, '');
    }

    async post<T>(path: string, body: unknown, token?: string): Promise<T> {
        const envelope = await this._fetch('POST', path, body, token);

        if (!envelope.ok) {
            const code = envelope.error?.code ?? 'unknown';
            const message = envelope.error?.message ?? 'Backend request failed';
            throw new ApiError(code, message, status_for_code(code));
        }

        return envelope.data as T;
    }

    async get<T>(path: string, token?: string): Promise<T> {
        const envelope = await this._fetch('GET', path, undefined, token);

        if (!envelope.ok) {
            const code = envelope.error?.code ?? 'unknown';
            const message = envelope.error?.message ?? 'Backend request failed';
            throw new ApiError(code, message, status_for_code(code));
        }

        return envelope.data as T;
    }

    async post_raw(
        path: string,
        body: unknown,
        token?: string,
    ): Promise<ApiEnvelope> {
        return this._fetch('POST', path, body, token);
    }

    private async _fetch(
        method: string,
        path: string,
        body: unknown,
        token?: string,
    ): Promise<ApiEnvelope> {
        const url = `${this._base_url}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Forward shared internal token when calling Hub `/internal/*`
        const internal_token = process.env.INTERNAL_API_TOKEN;
        if (internal_token && path.startsWith('/internal')) {
            headers['X-Internal-Token'] = internal_token;
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

        let data: ApiEnvelope;
        try {
            data = await res.json() as ApiEnvelope;
        } catch {
            log.error('upstream_non_json', {
                request_id: request_id ?? null,
                method,
                path,
                status: res.status,
                duration_ms: Date.now() - started_at,
            });
            throw new ApiError(
                'parse_error',
                'Backend returned non-JSON response',
                502,
            );
        }

        if (!data.ok || res.status >= 400) {
            log.warn('upstream_error', {
                request_id: request_id ?? null,
                method,
                path,
                status: res.status,
                code: data.error?.code ?? null,
                error: data.error?.message ?? null,
                duration_ms: Date.now() - started_at,
            });
        }

        return data;
    }
}
