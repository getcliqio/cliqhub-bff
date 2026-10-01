import { get_logger } from './log.js';

const log = get_logger('core-compat');

/**
 * The oldest Core API contract this BFF works with. Core reports its own
 * `api_version` on `GET /v1/health` (see cliqhub-core src/lib/api_version.ts).
 * Raise this when the BFF starts relying on something new in Core.
 */
export const MIN_CORE_API_VERSION = 2;

export interface Core_compat {
    checked_at: number;
    reachable: boolean;
    version: string | null;
    api_version: number | null;
    started_at: number | null;
    required_api_version: number;
    compatible: boolean;
    /** Human-readable reason when not compatible. */
    message: string | null;
}

export function judge(health: unknown, now = Date.now()): Core_compat {
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
 * Checks Core's `/v1/health` at startup and then at most every `ttl_ms`.
 * `current()` never waits on the network — health probes stay fast.
 */
export class Core_compat_checker {
    private _last: Core_compat | null = null;
    private _inflight: Promise<Core_compat> | null = null;
    private _warned_for: string | null = null;

    constructor(private _base_url: string, private _ttl_ms = 60_000, private _fetch: typeof fetch = (...a) => fetch(...a)) {}

    current(): Core_compat | null {
        if (!this._last || Date.now() - this._last.checked_at > this._ttl_ms) void this.check();
        return this._last;
    }

    async check(): Promise<Core_compat> {
        if (this._inflight) return this._inflight;
        this._inflight = (async () => {
            let result: Core_compat;
            try {
                const res = await this._fetch(`${this._base_url.replace(/\/+$/, '')}/v1/health`, { signal: AbortSignal.timeout(3000) });
                const body = await res.json().catch(() => null);
                result = res.ok && body ? judge(body) : { ...judge(null), reachable: false, compatible: false, message: `Core health check failed (HTTP ${res.status}).` };
            } catch (err) {
                result = { ...judge(null), reachable: false, compatible: false, message: `Core unreachable: ${(err as Error).message}` };
            }
            this._last = result;
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
