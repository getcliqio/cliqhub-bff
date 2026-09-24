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
}

export function load_env(): EnvConfig {
    const required = (key: string): string => {
        const val = process.env[key];
        if (!val) throw new Error(`Missing required env var: ${key}`);
        return val;
    };

    const backend_url = required('BACKEND_URL');

    return {
        port: parseInt(process.env.PORT || '3001', 10),
        backend_url,
        // Hub Core API for control-plane passthrough. Must be BACKEND_URL (or
        // CORE_API_URL for split-stack debug) — never CLIQ_API_URL. That env is
        // the public BFF base used by CLI/daemon; pointing CoreApiClient there
        // makes the BFF call itself and deadlocks.
        core_api_url: process.env.CORE_API_URL || backend_url,
        session_secret: required('SESSION_SECRET'),
        database_url: required('DATABASE_URL'),
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
    };
}
