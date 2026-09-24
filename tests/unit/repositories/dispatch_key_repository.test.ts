import { describe, it, expect, vi } from 'vitest';
import { DispatchKeyRepository } from '../../../src/repositories/dispatch_key_repository.js';

describe('DispatchKeyRepository', () => {
    it('maps get_public_key response with defaults', async () => {
        const client = {
            post: vi.fn().mockResolvedValue({}),
        };
        const repo = new DispatchKeyRepository(client as never);
        await expect(repo.get_public_key('realm-1', 'tok')).resolves.toEqual({
            realm_id: 'realm-1',
            public_key_pem: '',
            created_at: null,
            rotated_at: null,
        });
        expect(client.post).toHaveBeenCalledWith(
            '/v1/auth/get_dispatch_public_key',
            { realm_id: 'realm-1' },
            'tok',
        );
    });

    it('maps regenerate response fields', async () => {
        const client = {
            post: vi.fn().mockResolvedValue({
                realm_id: 'realm-2',
                public_key_pem: 'PEM',
                created_at: 1,
                rotated_at: 2,
            }),
        };
        const repo = new DispatchKeyRepository(client as never);
        await expect(repo.regenerate('realm-1', 'tok')).resolves.toEqual({
            realm_id: 'realm-2',
            public_key_pem: 'PEM',
            created_at: 1,
            rotated_at: 2,
        });
        expect(client.post).toHaveBeenCalledWith(
            '/v1/auth/rotate_dispatch_key',
            { realm_id: 'realm-1' },
            'tok',
        );
    });
});
