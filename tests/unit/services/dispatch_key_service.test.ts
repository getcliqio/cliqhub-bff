import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchKeyService } from '../../../src/services/dispatch_key_service.js';

describe('DispatchKeyService', () => {
    const mock_repo = {
        get_public_key: vi.fn(),
        regenerate: vi.fn(),
    };

    const service = new DispatchKeyService(mock_repo as any);

    beforeEach(() => vi.clearAllMocks());

    it('returns public key from Core', async () => {
        mock_repo.get_public_key.mockResolvedValue({
            realm_id: 'r1',
            public_key_pem: '-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----\n',
            created_at: 1,
            rotated_at: 2,
        });

        const dto = await service.get_public_key('r1', 'jwt');

        expect(dto.public_key_pem).toContain('BEGIN PUBLIC KEY');
        expect(dto.realm_id).toBe('r1');
        expect(mock_repo.get_public_key).toHaveBeenCalledWith('r1', 'jwt');
    });

    it('rejects private key material', async () => {
        mock_repo.get_public_key.mockResolvedValue({
            realm_id: 'r1',
            public_key_pem: '-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----\n',
            created_at: 1,
            rotated_at: 2,
        });

        await expect(service.get_public_key('r1', 'jwt')).rejects.toMatchObject({
            code: 'internal',
        });
    });

    it('regenerates and returns new public key', async () => {
        mock_repo.regenerate.mockResolvedValue({
            realm_id: 'r2',
            public_key_pem: '-----BEGIN PUBLIC KEY-----\nNEW\n-----END PUBLIC KEY-----\n',
            created_at: 1,
            rotated_at: 9,
        });

        const dto = await service.regenerate('r2', 'jwt');

        expect(dto.realm_id).toBe('r2');
        expect(dto.rotated_at).toBe(9);
    });
});
