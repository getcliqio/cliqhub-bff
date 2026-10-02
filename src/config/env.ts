/**
 * BFF configuration from environment variables, read once at start-up.
 * A missing required variable stops the process (start-up fault).
 */

/** Typed BFF configuration (see {@link load_env} for the variables and defaults). */
export interface EnvConfig {
    port: number;
    backend_url: string;
    core_api_url: string;
    session_secret: string;
    session_ttl_seconds: number;
    session_idle_seconds: number;
    database_url: string;
    cookie_name: string;
    cors_origins: string[];
    node_env: string;
    rate_limit_builder_anon: number;
    rate_limit_builder_auth: number;
    rate_limit_window_ms: number;
    static_dir: string;
    /**
     * Express `trust proxy` (TRUST_PROXY): which proxies' `X-Forwarded-For`
     * may set `req.ip`. `false` (default) uses the socket address, so behind a
     * proxy every client shares the proxy's address in per-address limits.
     */
    trust_proxy: TrustProxy;
}

/** Express `trust proxy` value: off/on, a hop count, or addresses / subnets / presets. */
export type TrustProxy = boolean | number | string;

/**
 * Parses TRUST_PROXY for Express `trust proxy`.
 *   unset, empty or `false` → false (socket address; safe without a proxy)
 *   `true`                  → trust every hop (only when nothing reaches the BFF except through the proxy)
 *   a whole number          → trust that many hops from the BFF
 *   anything else           → addresses, subnets or presets as Express takes them
 *                             (e.g. `loopback`, `10.0.0.0/8,fd00::/8`)
 */
export function parse_trust_proxy(value: string | undefined): TrustProxy {
    const v = (value ?? '').trim();
    if (!v || v.toLowerCase() === 'false') return false;
    if (v.toLowerCase() === 'true') return true;
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    return v;
}

/**
 * The session database must belong to this BFF. A Railway *public proxy*
 * host (`*.proxy.rlwy.net`) is how a machine outside Railway reaches a cloud
 * database — i.e. a local BFF pointed at a shared environment, where every
 * restart or deploy of another BFF affects the same `bff.sessions`. Deployed
 * BFFs use the private `*.railway.internal` host and are not affected.
 * Set BFF_ALLOW_SHARED_SESSION_DB=1 to opt in deliberately.
 *
 * @throws Error when DATABASE_URL points at a shared cloud database from outside it.
 */
export function assert_own_session_db(database_url: string, env: NodeJS.ProcessEnv = process.env): void {
    if (env.BFF_ALLOW_SHARED_SESSION_DB === '1') return;
    let host = '';
    try {
        host = new URL(database_url).hostname.toLowerCase();
    } catch {
        return; // not a URL (socket path etc.) — nothing to judge
    }
    if (host.endsWith('.proxy.rlwy.net')) {
        throw new Error(
            `DATABASE_URL points at a shared Railway database (${host}) from outside Railway. `
            + 'Use a local Postgres for local development (e.g. postgresql://…@localhost:5432/cliqhub), '
            + 'or set BFF_ALLOW_SHARED_SESSION_DB=1 to do this on purpose.',
        );
    }
}

/**
 * Reads the configuration from `process.env`.
 *
 * @throws Error when BACKEND_URL, SESSION_SECRET or DATABASE_URL is missing,
 *   or DATABASE_URL is a shared cloud database (see {@link assert_own_session_db}).
 */
export function load_env(): EnvConfig {
    const required = (key: string): string => {
        const val = process.env[key];
        if (!val) throw new Error(`Missing required env var: ${key}`);
        return val;
    };

    const backend_url = required('BACKEND_URL');
    const database_url = required('DATABASE_URL');
    assert_own_session_db(database_url);

    return {
        port: parseInt(process.env.PORT || '3001', 10),
        backend_url,
        // Hub Core API for control-plane passthrough. Must be BACKEND_URL (or
        // CORE_API_URL for split-stack debug) — never CLIQ_API_URL. That env is
        // the public BFF base used by CLI/daemon; pointing CoreClient there
        // makes the BFF call itself and deadlocks.
        core_api_url: process.env.CORE_API_URL || backend_url,
        session_secret: required('SESSION_SECRET'),
        database_url,
        session_ttl_seconds: parseInt(
            process.env.SESSION_TTL_SECONDS || '2592000', 10),
        session_idle_seconds: parseInt(
            process.env.SESSION_IDLE_SECONDS || '7200', 10),
        cookie_name: process.env.SESSION_COOKIE_NAME || 'cliqhub_sid',
        cors_origins: (process.env.CORS_ORIGINS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        node_env: process.env.NODE_ENV || 'development',
        rate_limit_builder_anon: parseInt(
            process.env.RATE_LIMIT_BUILDER_ANON || '5', 10),
        rate_limit_builder_auth: parseInt(
            process.env.RATE_LIMIT_BUILDER_AUTH || '30', 10),
        rate_limit_window_ms: parseInt(
            process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        static_dir: process.env.STATIC_DIR || '',
        trust_proxy: parse_trust_proxy(process.env.TRUST_PROXY),
    };
}
