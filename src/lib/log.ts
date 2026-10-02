/**
 * BFF structured logger (stdout NDJSON), one per module (`get_logger('svc.users')`).
 * Level: `CLIQ_BFF_LOG_LEVEL` or `LOG_LEVEL` (default `info`).
 * Every line inside a request carries its `request_id` (see request_context.ts),
 * the same id Core logs for the calls the BFF makes.
 */

import { current_request_id } from './request_context.js';

/** Log levels, lowest first. */
export type BffLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** A module's logger: one method per level, `ctx` serialized as the line's `ctx`. */
export interface BffLogger {
    debug(msg: string, ctx?: Record<string, unknown>): void;
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn(msg: string, ctx?: Record<string, unknown>): void;
    error(msg: string, ctx?: Record<string, unknown>): void;
    /** The process cannot continue (start-up refused). Always written. */
    fatal(msg: string, ctx?: Record<string, unknown>): void;
}

const LEVEL_RANK: Record<BffLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50,
};

function normalize_level(raw: string | undefined): BffLogLevel {
    if (!raw?.trim()) return 'info';
    const lower = raw.trim().toLowerCase();
    if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error' || lower === 'fatal') {
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

/** Re-reads the level from the environment, or sets it explicitly (tests, CLI flags). */
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
    if (level !== 'fatal' && LEVEL_RANK[level] < LEVEL_RANK[process_level]) return;

    const line: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level: level.toUpperCase(),
        component,
        msg,
    };
    const request_id = current_request_id();
    if (request_id) line.request_id = request_id;
    if (ctx && Object.keys(ctx).length > 0) line.ctx = ctx;

    const serialized = JSON.stringify(line);
    if (level === 'error' || level === 'fatal') {
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

/** A logger whose lines carry `component: category`. */
export function get_logger(category: string): BffLogger {
    return {
        debug: (msg, ctx) => emit('debug', category, msg, ctx),
        info: (msg, ctx) => emit('info', category, msg, ctx),
        warn: (msg, ctx) => emit('warn', category, msg, ctx),
        error: (msg, ctx) => emit('error', category, msg, ctx),
        fatal: (msg, ctx) => emit('fatal', category, msg, ctx),
    };
}
