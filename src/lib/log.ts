/**
 * BFF structured logger (stdout NDJSON).
 * Level: `CLIQ_BFF_LOG_LEVEL` or `LOG_LEVEL` (default `info`).
 */

export type BffLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BffLogger {
    debug(msg: string, ctx?: Record<string, unknown>): void;
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn(msg: string, ctx?: Record<string, unknown>): void;
    error(msg: string, ctx?: Record<string, unknown>): void;
}

const LEVEL_RANK: Record<BffLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function normalize_level(raw: string | undefined): BffLogLevel {
    if (!raw?.trim()) return 'info';
    const lower = raw.trim().toLowerCase();
    if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error') {
        return lower;
    }
    if (lower === 'warning') return 'warn';
    return 'info';
}

function resolve_process_level(): BffLogLevel {
    if (process.env.VITEST) return 'error';
    return normalize_level(
        process.env.CLIQ_BFF_LOG_LEVEL ?? process.env.LOG_LEVEL,
    );
}

let process_level = resolve_process_level();

export function configure_bff_logging(level?: string): void {
    process_level = level !== undefined
        ? normalize_level(level)
        : resolve_process_level();
}

function emit(
    level: BffLogLevel,
    component: string,
    msg: string,
    ctx?: Record<string, unknown>,
): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[process_level]) return;

    const line: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level: level.toUpperCase(),
        component,
        msg,
    };
    if (ctx && Object.keys(ctx).length > 0) line.ctx = ctx;

    const serialized = JSON.stringify(line);
    if (level === 'error') {
        console.error(serialized);
        return;
    }
    if (level === 'warn') {
        console.warn(serialized);
        return;
    }
    if (level === 'debug') {
        console.debug(serialized);
        return;
    }
    console.info(serialized);
}

export function get_logger(category: string): BffLogger {
    return {
        debug: (msg, ctx) => emit('debug', category, msg, ctx),
        info: (msg, ctx) => emit('info', category, msg, ctx),
        warn: (msg, ctx) => emit('warn', category, msg, ctx),
        error: (msg, ctx) => emit('error', category, msg, ctx),
    };
}
