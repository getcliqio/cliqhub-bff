import { describe, it, expect, vi } from 'vitest';
import { CoreCompatService, MIN_CORE_API_VERSION, judge } from '../../../src/services/core_compat_service.js';

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('judge', () => {
    it('compatible when Core reports api_version ≥ required', () => {
        const r = judge({ ok: true, version: '1.0.0', api_version: MIN_CORE_API_VERSION, started_at: 5 });
        expect(r).toMatchObject({ reachable: true, compatible: true, version: '1.0.0', api_version: MIN_CORE_API_VERSION, started_at: 5, message: null });
    });
    it('a Core without api_version predates this BFF', () => {
        const r = judge({ ok: true, timestamp: 1 });
        expect(r.compatible).toBe(false);
        expect(r.message).toMatch(/doesn't report an API version/);
    });
    it('an older api_version is incompatible', () => {
        const r = judge({ api_version: MIN_CORE_API_VERSION - 1 });
        expect(r.compatible).toBe(false);
        expect(r.message).toMatch(/older than this BFF needs/);
    });
});

describe('CoreCompatService', () => {
    it('checks /v1/health and caches the result', async () => {
        const f = vi.fn(async () => ok({ ok: true, version: '1.2.0', api_version: MIN_CORE_API_VERSION }));
        const c = new CoreCompatService('http://core/', 60_000, f as unknown as typeof fetch);
        expect(c.current()).toBeNull(); // kicks off a check, never waits
        const r = await c.check();
        expect(f).toHaveBeenCalledTimes(1);
        expect((f.mock.calls[0] as unknown[])[0]).toBe('http://core/v1/health');
        expect(r.compatible).toBe(true);
        expect(c.current()?.version).toBe('1.2.0');
        expect(f).toHaveBeenCalledTimes(1);
    });
    it('reports an unreachable Core', async () => {
        const f = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
        const r = await new CoreCompatService('http://core', 60_000, f as unknown as typeof fetch).check();
        expect(r).toMatchObject({ reachable: false, compatible: false });
        expect(r.message).toContain('ECONNREFUSED');
    });
    it('reports a failing health check', async () => {
        const r = await new CoreCompatService('http://core', 60_000, (async () => ok({ ok: false }, 503)) as unknown as typeof fetch).check();
        expect(r).toMatchObject({ reachable: false, compatible: false });
        expect(r.message).toContain('503');
    });
    it('re-checks after the TTL', async () => {
        const f = vi.fn(async () => ok({ api_version: MIN_CORE_API_VERSION }));
        const c = new CoreCompatService('http://core', 0, f as unknown as typeof fetch);
        await c.check();
        await new Promise((r) => setTimeout(r, 2));
        c.current();
        await c.check();
        expect(f.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});
