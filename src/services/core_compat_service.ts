/**
 * Core compatibility — reads Core's `GET /v1/health` and judges whether its
 * `api_version` is new enough for this BFF. Logs once per change of verdict
 * (`core_compatible` at info, `core_incompatible` at warn).
 */

import { get_logger } from '../lib/log.js';
import { best_effort, error_fields } from '../lib/best_effort.js';
import type { CoreCompatData } from '../schemas/health_types.js';

const log = get_logger('svc.core_compat');

/**
 * The oldest Core API contract this BFF works with. Core reports its own
 * `api_version` on `GET /v1/health` (see cliqhub-core src/lib/api_version.ts).
 * Raise this when the BFF starts relying on something new in Core.
 */
export const MIN_CORE_API_VERSION = 2;

/** Verdict on one health body: compatible, or a message saying why not (missing or too old `api_version`). */
export function judge(health: unknown, now = Date.now()): CoreCompatData {
    const h = (health ?? {}) as { version?: unknown; api_version?: unknown; started_at?: unknown };
    const api_version = typeof h.api_version === 'number' ? h.api_version : null;
    const base = {
        checked_at: now,
        reachable: true,
        version: typeof h.version === 'string' ? h.version : null,
        api_version,
        started_at: typeof h.started_at === 'number' ? h.started_at : null,
        required_api_version: MIN_CORE_API_VERSION,
    };
    if (api_version === null) {
        return { ...base, compatible: false, message: `Core doesn't report an API version, so it predates this BFF (needs ${MIN_CORE_API_VERSION}+). Restart or update Core.` };
    }
    if (api_version < MIN_CORE_API_VERSION) {
        return { ...base, compatible: false, message: `Core API ${api_version} is older than this BFF needs (${MIN_CORE_API_VERSION}+). Restart or update Core.` };
    }
    return { ...base, compatible: true, message: null };
}

/**
 * Core compatibility: checks Core's `/v1/health` at startup and then at most every `ttl_ms`.
 * `current()` never waits on the network — health probes stay fast.
 */
export class CoreCompatService {
    private _last: CoreCompatData | null = null;
    private _inflight: Promise<CoreCompatData> | null = null;
    private _warned_for: string | null = null;

    constructor(private _base_url: string, private _ttl_ms = 60_000, private _fetch: typeof fetch = (...a) => fetch(...a)) {}

    /** Last result (null before the first check); starts a background re-check when stale. */
    current(): CoreCompatData | null {
        if (!this._last || Date.now() - this._last.checked_at > this._ttl_ms) void this.check();
        return this._last;
    }

    /** The running Core's API version; waits only for the very first check after BFF start (null when unknown). */
    async api_version(): Promise<number | null> {
        return (this.current() ?? await this.check()).api_version;
    }

    /** Probes Core now (concurrent callers share one probe). Never rejects: failures become an incompatible result. */
    async check(): Promise<CoreCompatData> {
        if (this._inflight) return this._inflight;
        this._inflight = (async () => {
            let result: CoreCompatData;
            try {
                const res = await this._fetch(`${this._base_url.replace(/\/+$/, '')}/v1/health`, { signal: AbortSignal.timeout(3000) });
                // An unreadable body is reported as a failed health check below.
                const body = await best_effort(log, 'core_health_body_unreadable', res.json(), null, { status: res.status });
                result = res.ok && body ? judge(body) : { ...judge(null), reachable: false, compatible: false, message: `Core health check failed (HTTP ${res.status}).` };
            } catch (err) {
                // Unreachable Core is a verdict, not an error: health stays up and reports it (logged below).
                log.debug('core_health_fetch_failed', error_fields(err));
                result = { ...judge(null), reachable: false, compatible: false, message: `Core unreachable: ${(err as Error).message}` };
            }
            this._last = result;
            // Log only when the verdict changes, not on every TTL re-check.
            const key = result.compatible ? 'ok' : result.message;
            if (key !== this._warned_for) {
                this._warned_for = key;
                if (result.compatible) log.info('core_compatible', { version: result.version, api_version: result.api_version });
                else log.warn('core_incompatible', { message: result.message, version: result.version, api_version: result.api_version, required: MIN_CORE_API_VERSION });
            }
            return result;
        })().finally(() => { this._inflight = null; });
        return this._inflight;
    }
}
