import { describe, it, expect, afterEach, vi } from 'vitest';
import { CoreClient } from '../../../src/repositories/core_client.js';
import { ApiError } from '../../../src/errors/api_error.js';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('CoreClient.post_body (flat control-plane routes)', () => {
    it('posts json with bearer auth and returns ok payload', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            expect(url).toBe('https://api.test/v1/realms/list');
            expect(init?.method).toBe('POST');
            expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
            return {
                ok: true,
                status: 200,
                json: async () => ({ ok: true, realms: [] }),
            };
        }));

        const client = new CoreClient('https://api.test/');
        await expect(client.post_body('/v1/realms/list', { a: 1 }, 'tok'))
            .resolves.toEqual({ ok: true, realms: [] });
    });

    it('wraps network failures', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('offline');
        }));
        const client = new CoreClient('https://api.test');
        await expect(client.post_body('v1/x', {}, 'tok')).rejects.toMatchObject({
            code: 'network_error',
            status: 502,
        });
    });

    it('wraps non-json responses', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => {
                throw new Error('bad json');
            },
        })));
        const client = new CoreClient('https://api.test');
        await expect(client.post_body('/v1/x', {}, 'tok')).rejects.toBeInstanceOf(ApiError);
        await expect(client.post_body('/v1/x', {}, 'tok')).rejects.toMatchObject({
            code: 'parse_error',
            status: 502,
        });
    });

    it('maps ok:false error envelopes', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            status: 403,
            json: async () => ({
                ok: false,
                error: { code: 'forbidden', message: 'denied' },
            }),
        })));
        const client = new CoreClient('https://api.test');
        await expect(client.post_body('/v1/x', null, 'tok')).rejects.toMatchObject({
            code: 'forbidden',
            message: 'denied',
            status: 403,
        });
    });
});
