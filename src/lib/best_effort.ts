/**
 * Best-effort reads for composed pages: one optional Core call failing must
 * not fail the whole page. The failure is never silent — it is logged at
 * `warn` (with the request id) and the caller gets `fallback`, which the page
 * should surface (e.g. a `partial` flag or a `null` section) where the UI
 * needs to know.
 *
 * Use only for optional parts of a read. Required calls (the realm gate,
 * the record the page is about) must throw.
 */

import type { BffLogger } from './log.js';

/**
 * Awaits `work`; on failure logs `${event}` at warn and returns `fallback`.
 *
 * @param log - The calling module's logger.
 * @param event - Snake-case event name, e.g. `'admin_home_orgs_failed'`.
 * @param work - The optional call.
 * @param fallback - What the page shows instead.
 * @param ctx - Extra log fields (ids, never tokens).
 */
export async function best_effort<T, F>(
    log: BffLogger,
    event: string,
    work: Promise<T>,
    fallback: F,
    ctx: Record<string, unknown> = {},
): Promise<T | F> {
    try {
        return await work;
    } catch (err) {
        log.warn(event, { ...ctx, ...error_fields(err) });
        return fallback;
    }
}

/** `{ error, code?, status? }` for a log line — an ApiError's code/status when it has them. */
export function error_fields(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
        const e = err as Error & { code?: unknown; status?: unknown };
        return {
            error: e.message,
            ...(typeof e.code === 'string' ? { code: e.code } : {}),
            ...(typeof e.status === 'number' ? { status: e.status } : {}),
        };
    }
    return { error: String(err) };
}

/**
 * Logs one `warn` per rejected read of a composed page (`section: <key>`), so a
 * section the page shows as failed is never silent. Ids only in `ctx`.
 */
export function warn_rejected(
    log: BffLogger,
    event: string,
    results: Record<string, PromiseSettledResult<unknown>>,
    ctx: Record<string, unknown> = {},
): void {
    for (const [key, r] of Object.entries(results)) {
        if (r.status === 'rejected') log.warn(event, { ...ctx, section: key, ...error_fields(r.reason) });
    }
}
