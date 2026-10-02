/**
 * Sliding-window request limiter: at most `limit` hits per key in any
 * `window_ms` span, counted from the hits' own times (no fixed buckets).
 *
 * In memory, per BFF instance: each instance counts on its own and counts
 * reset on restart. Keys with no hit inside the window are dropped as the
 * limiter is used, so memory follows the number of recently active keys.
 */

/** The answer for one hit. */
export interface LimitResult {
    allowed: boolean;
    /** When refused: milliseconds until the oldest counted hit leaves the window; 0 when allowed. */
    retry_after_ms: number;
}

/** Counts hits per key over a sliding window. */
export class SlidingWindowLimiter {
    private readonly _hits = new Map<string, number[]>();
    private _last_sweep = 0;

    /**
     * @param _limit - Hits allowed per key in any window.
     * @param _window_ms - Window length.
     * @param _now - Clock (tests pass a fake one).
     */
    constructor(
        private readonly _limit: number,
        private readonly _window_ms: number,
        private readonly _now: () => number = Date.now,
    ) {}

    /**
     * Records a hit for `key` when it is within the limit; a refused hit is not
     * counted, so a caller who keeps trying is let in once the window frees up.
     */
    hit(key: string): LimitResult {
        const now = this._now();
        this._sweep(now);
        const since = now - this._window_ms;
        const hits = (this._hits.get(key) ?? []).filter((t) => t > since);
        if (hits.length >= this._limit) {
            this._hits.set(key, hits);
            return { allowed: false, retry_after_ms: hits[0] + this._window_ms - now };
        }
        hits.push(now);
        this._hits.set(key, hits);
        return { allowed: true, retry_after_ms: 0 };
    }

    /** Drops keys with no hit inside the window, at most once per window. */
    private _sweep(now: number): void {
        if (now - this._last_sweep < this._window_ms) return;
        this._last_sweep = now;
        const since = now - this._window_ms;
        for (const [key, hits] of this._hits) {
            if (!hits.some((t) => t > since)) this._hits.delete(key);
        }
    }

    /** Number of keys held (for tests). */
    get size(): number {
        return this._hits.size;
    }
}
