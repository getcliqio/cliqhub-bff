/**
 * Hug content — the files of hug frontends, served from the content origin (PLAN-hug-widgets §7, §11.2).
 *
 * A hug's bundle is fetched from Core (`hug_bundles/get_file`, public: built code named by its sha256, no Hug data)
 * and served at `<CONTENT_ORIGIN>/hb/<sha256>/<path>` with a CSP that leaves a frame no network, no navigation and
 * no one but the Hub to frame it. Bundles never change, so files are cached here (bounded) and by browsers.
 */

import type { CoreProxyRepository } from '../repositories/core_proxy_repository.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('svc.hug_content');

/** Largest total of cached file bytes. */
const CACHE_BYTES = 64 * 1024 * 1024;
/** Longest bundle path served. */
const MAX_PATH = 300;

/** One bundle file. */
export interface HugContentFile {
    body: Buffer;
    content_type: string;
}

/** Whether `sha256` names a bundle (64 lowercase hex). */
export function is_bundle_hash(sha256: string): boolean {
    return /^[0-9a-f]{64}$/.test(sha256);
}

/** A bundle path Core can hold: relative, no `..` / `.` / empty segments, no backslashes. */
export function is_bundle_file_path(path: string): boolean {
    return path.length > 0 && path.length <= MAX_PATH && !path.startsWith('/') && !path.includes('\\')
        && !path.split('/').some((s) => s === '' || s === '.' || s === '..');
}

/** Hug frontend files and their URLs. */
export class HugContentService {
    private readonly _cache = new Map<string, HugContentFile>();
    private _cached_bytes = 0;

    constructor(
        private readonly _core: CoreProxyRepository,
        private readonly _content_origin: string | null,
        private readonly _hub_origin: string | null,
    ) {}

    /** Whether hug frames can be served (both origins configured). */
    get enabled(): boolean {
        return Boolean(this._content_origin && this._hub_origin);
    }

    /** The content origin's `host[:port]` (what a request's Host must be), or null when off. */
    get content_host(): string | null {
        return this.enabled ? new URL(this._content_origin!).host.toLowerCase() : null;
    }

    /** The headers every content response carries (§7). */
    headers(): Record<string, string> {
        return {
            'Content-Security-Policy': [
                "default-src 'none'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
                "font-src 'self' data:", "media-src 'self' blob:", "connect-src 'none'", "form-action 'none'", "base-uri 'none'",
                `frame-ancestors ${this._hub_origin ?? "'none'"}`,
            ].join('; '),
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000, immutable',
        };
    }

    /**
     * One file of a bundle, or null (a bad hash or path, or Core has no such bundle or file).
     *
     * @throws when Core can't be reached or answers an error other than 404 (the route answers 502)
     */
    async file(sha256: string, path: string): Promise<HugContentFile | null> {
        if (!is_bundle_hash(sha256) || !is_bundle_file_path(path)) return null;
        const key = `${sha256}/${path}`;
        const hit = this._cache.get(key);
        if (hit) {
            this._cache.delete(key);
            this._cache.set(key, hit); // most recently used last
            return hit;
        }
        const res = await this._core.hug_bundle_file(sha256, path);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Core hug_bundles/get_file answered HTTP ${res.status}`);
        const file = { body: Buffer.from(await res.arrayBuffer()), content_type: res.headers.get('content-type') ?? 'text/plain; charset=utf-8' };
        this._remember(key, file);
        return file;
    }

    /**
     * Where the Hub frames a Hug's hug: the bundle's entry page on the content origin. Null when hug frames are off,
     * the Hug has no hug (opened before hugs), or its bundle is gone — the page then shows its fallback view.
     */
    async content_url(hug: unknown): Promise<string | null> {
        if (!this.enabled || !hug || typeof hug !== 'object') return null;
        const sha256 = (hug as { sha256?: unknown }).sha256;
        if (typeof sha256 !== 'string' || !is_bundle_hash(sha256)) return null;
        let entry = 'index.html';
        try {
            const manifest = await this.file(sha256, 'hug.json');
            if (!manifest) return null;
            const named = (JSON.parse(manifest.body.toString('utf8')) as { entry?: unknown }).entry;
            if (typeof named === 'string' && is_bundle_file_path(named)) entry = named;
        } catch (err) {
            log.warn('hug_manifest_unreadable', { sha256, error: err instanceof Error ? err.message : String(err) });
            return null;
        }
        return `${this._content_origin}/hb/${sha256}/${entry.split('/').map(encodeURIComponent).join('/')}`;
    }

    private _remember(key: string, file: HugContentFile): void {
        if (file.body.length > CACHE_BYTES / 4) return;
        this._cache.set(key, file);
        this._cached_bytes += file.body.length;
        for (const [old, f] of this._cache) {
            if (this._cached_bytes <= CACHE_BYTES) break;
            this._cache.delete(old);
            this._cached_bytes -= f.body.length;
        }
    }
}
