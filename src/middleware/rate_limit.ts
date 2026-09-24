import type { Request, Response, NextFunction } from 'express';
import type { EnvConfig } from '../config/env.js';

interface WindowEntry {
    count: number;
    reset_at: number;
}

/**
 * In-memory rate limiter keyed by IP + optional user id.
 * Per-process only — good enough for single-instance BFF.
 */
export function create_rate_limiter(config: EnvConfig) {
    const buckets = new Map<string, WindowEntry>();

    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of buckets) {
            if (entry.reset_at <= now) buckets.delete(key);
        }
    }, 60_000).unref();

    return function rate_limit(
        req: Request,
        res: Response,
        next: NextFunction,
    ): void {
        const user_id = (req as any).session_data?.user_id;
        const limit = user_id
            ? config.rate_limit_builder_auth
            : config.rate_limit_builder_anon;

        const key = `${req.ip}:${user_id ?? 'anon'}:${req.path}`;
        const now = Date.now();

        let entry = buckets.get(key);
        if (!entry || entry.reset_at <= now) {
            entry = { count: 0, reset_at: now + config.rate_limit_window_ms };
            buckets.set(key, entry);
        }

        entry.count++;

        if (entry.count > limit) {
            const retry_after = Math.ceil(
                (entry.reset_at - now) / 1000,
            );
            res.set('Retry-After', String(retry_after));
            res.status(429).json({
                ok: false,
                error: {
                    code: 'rate_limited',
                    message: 'Too many requests, try again later',
                },
            });
            return;
        }

        next();
    };
}
