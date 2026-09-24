import { describe, it, expect, vi } from 'vitest';
import { create_rate_limiter } from '../../../src/middleware/rate_limit.js';
import type { EnvConfig } from '../../../src/config/env.js';

function config(): EnvConfig {
    return {
        port: 3000,
        backend_url: 'http://hub',
        core_api_url: 'http://core',
        session_secret: 's',
        session_ttl_seconds: 1000,
        session_idle_seconds: 1000,
        database_url: 'postgres://x',
        cookie_name: 'sid',
        cors_origins: [],
        node_env: 'test',
        rate_limit_builder_anon: 2,
        rate_limit_builder_auth: 3,
        rate_limit_window_ms: 60_000,
        static_dir: '',
    };
}

function mock_res() {
    const res: any = {
        headers: {} as Record<string, string>,
        status_code: 200,
        body: null,
        set(k: string, v: string) {
            this.headers[k] = v;
            return this;
        },
        status(code: number) {
            this.status_code = code;
            return this;
        },
        json(body: unknown) {
            this.body = body;
            return this;
        },
    };
    return res;
}

describe('create_rate_limiter', () => {
    it('allows requests under the anon limit then returns 429', () => {
        const limiter = create_rate_limiter(config());
        const req = { ip: '1.2.3.4', path: '/v1/teams/build', session_data: undefined } as any;
        const next = vi.fn();

        limiter(req, mock_res(), next);
        limiter(req, mock_res(), next);
        expect(next).toHaveBeenCalledTimes(2);

        const res = mock_res();
        limiter(req, res, next);
        expect(res.status_code).toBe(429);
        expect(res.headers['Retry-After']).toBeTruthy();
        expect(res.body.error.code).toBe('rate_limited');
        expect(next).toHaveBeenCalledTimes(2);
    });

    it('uses the authenticated limit when session user is present', () => {
        const limiter = create_rate_limiter(config());
        const req = {
            ip: '1.2.3.4',
            path: '/v1/teams/build',
            session_data: { user_id: 9 },
        } as any;
        const next = vi.fn();

        limiter(req, mock_res(), next);
        limiter(req, mock_res(), next);
        limiter(req, mock_res(), next);
        expect(next).toHaveBeenCalledTimes(3);

        const res = mock_res();
        limiter(req, res, next);
        expect(res.status_code).toBe(429);
    });
});
