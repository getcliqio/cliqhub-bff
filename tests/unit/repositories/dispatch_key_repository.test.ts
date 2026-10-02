import { describe, it, expect, vi } from 'vitest';
import { DispatchKeyRepository } from '../../../src/repositories/dispatch_key_repository.js';
import { ApiError } from '../../../src/errors/api_error.js';

describe('DispatchKeyRepository', () => {
    it('get_public_key reads the flat body of POST /v1/auth/get_dispatch_public_key', async () => {
        const body = { ok: true, realm_id: 'realm-1', public_key_pem: 'PEM', created_at: 1, rotated_at: null };
        const client = { post: vi.fn(), post_body: vi.fn().mockResolvedValue(body) };
        const repo = new DispatchKeyRepository(client as never);

        await expect(repo.get_public_key({ realm_id: 'realm-1' }, 'tok')).resolves.toBe(body);
        expect(client.post_body).toHaveBeenCalledWith('/v1/auth/get_dispatch_public_key', { realm_id: 'realm-1' }, 'tok');
        expect(client.post).not.toHaveBeenCalled();
    });

    it('rotate reads the flat body of POST /v1/auth/rotate_dispatch_key', async () => {
        const body = { realm_id: 'realm-2', public_key_pem: 'PEM', created_at: 1, rotated_at: 2 };
        const client = { post_body: vi.fn().mockResolvedValue(body) };
        const repo = new DispatchKeyRepository(client as never);

        await expect(repo.rotate({ realm_id: 'realm-1' }, 'tok')).resolves.toBe(body);
        expect(client.post_body).toHaveBeenCalledWith('/v1/auth/rotate_dispatch_key', { realm_id: 'realm-1' }, 'tok');
    });

    it('propagates ApiError from Core', async () => {
        const client = { post_body: vi.fn().mockRejectedValue(ApiError.forbidden('nope')) };
        const repo = new DispatchKeyRepository(client as never);

        await expect(repo.rotate({ realm_id: 'realm-1' }, 'tok')).rejects.toThrow(ApiError);
    });
});
