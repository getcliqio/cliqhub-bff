import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../../src/repositories/api_client.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const mock_fetch = vi.fn();

describe('ApiClient', () => {
    let client: ApiClient;

    beforeEach(() => {
        vi.stubGlobal('fetch', mock_fetch);
        client = new ApiClient('http://backend:3000');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mock_fetch.mockReset();
    });

    describe('post()', () => {
        it('sends JSON body and returns data on success', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => ({
                    ok: true,
                    data: { id: 1, name: 'test' },
                }),
            });

            const result = await client.post('/v1/teams/new', { name: 'test' }, 'tok');
            expect(result).toEqual({ id: 1, name: 'test' });

            expect(mock_fetch).toHaveBeenCalledWith(
                'http://backend:3000/v1/teams/new',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer tok',
                    },
                    body: JSON.stringify({ name: 'test' }),
                },
            );
        });

        it('throws ApiError on backend error response', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => ({
                    ok: false,
                    error: { code: 'not_found', message: 'Team not found' },
                }),
            });

            await expect(
                client.post('/v1/teams/get', { name: 'nope' }),
            ).rejects.toThrow(ApiError);

            try {
                await client.post('/v1/teams/get', { name: 'nope' });
            } catch (e) {
                const err = e as ApiError;
                expect(err.code).toBe('not_found');
                expect(err.status).toBe(404);
            }
        });

        it('throws ApiError on network failure', async () => {
            mock_fetch.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(
                client.post('/v1/auth/login', { username: 'a', password: 'b' }),
            ).rejects.toThrow(ApiError);

            try {
                await client.post('/v1/auth/login', { username: 'a', password: 'b' });
            } catch (e) {
                const err = e as ApiError;
                expect(err.code).toBe('network_error');
                expect(err.status).toBe(502);
            }
        });

        it('throws ApiError on non-JSON response', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => { throw new Error('invalid JSON'); },
            });

            await expect(
                client.post('/v1/test', {}),
            ).rejects.toThrow(ApiError);

            try {
                await client.post('/v1/test', {});
            } catch (e) {
                const err = e as ApiError;
                expect(err.code).toBe('parse_error');
                expect(err.status).toBe(502);
            }
        });

        it('omits Authorization header when no token provided', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => ({ ok: true, data: {} }),
            });

            await client.post('/v1/test', {});
            const call = mock_fetch.mock.calls[0];
            expect(call[1].headers).not.toHaveProperty('Authorization');
        });
    });

    describe('get()', () => {
        it('sends GET request without body', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => ({ ok: true, data: { status: 'ok' } }),
            });

            const result = await client.get('/bff-health');
            expect(result).toEqual({ status: 'ok' });
            expect(mock_fetch.mock.calls[0][1].method).toBe('GET');
            expect(mock_fetch.mock.calls[0][1].body).toBeUndefined();
        });
    });

    describe('post_raw()', () => {
        it('returns the full envelope without throwing on error', async () => {
            mock_fetch.mockResolvedValue({
                json: async () => ({
                    ok: false,
                    error: { code: 'conflict', message: 'Already exists' },
                }),
            });

            const envelope = await client.post_raw('/v1/orgs/new', {});
            expect(envelope.ok).toBe(false);
            expect(envelope.error?.code).toBe('conflict');
        });
    });
});
