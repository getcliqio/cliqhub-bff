import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchKeyService } from '../../../src/services/dispatch_key_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const PUBLIC_PEM = '-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----\n';

describe('DispatchKeyService', () => {
    const mock_repo = {
        get_public_key: vi.fn(),
        rotate: vi.fn(),
    };

    const service = new DispatchKeyService(mock_repo as any);

    beforeEach(() => vi.resetAllMocks());

    it('returns the public key from Core', async () => {
        mock_repo.get_public_key.mockResolvedValue({ ok: true, realm_id: 'r1', public_key_pem: PUBLIC_PEM, created_at: 1, rotated_at: 2 });

        const data = await service.get_public_key({ realm_id: 'r1' }, 'jwt');

        expect(mock_repo.get_public_key).toHaveBeenCalledWith({ realm_id: 'r1' }, 'jwt');
        expect(data).toEqual({ realm_id: 'r1', public_key_pem: PUBLIC_PEM, created_at: 1, rotated_at: 2 });
        expect(data).not.toHaveProperty('ok');
    });

    it('rejects private key material', async () => {
        mock_repo.get_public_key.mockResolvedValue({
            realm_id: 'r1', public_key_pem: '-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----\n',
        });

        await expect(service.get_public_key({ realm_id: 'r1' }, 'jwt')).rejects.toMatchObject({ code: 'internal', status: 502 });
    });

    it('rejects an empty key', async () => {
        mock_repo.get_public_key.mockResolvedValue({ ok: true });

        await expect(service.get_public_key({ realm_id: 'r1' }, 'jwt')).rejects.toThrow(ApiError);
    });

    it('rotates and returns the new public key', async () => {
        mock_repo.rotate.mockResolvedValue({
            realm_id: 'r2', public_key_pem: '-----BEGIN PUBLIC KEY-----\nNEW\n-----END PUBLIC KEY-----\n', created_at: 1, rotated_at: 9,
        });

        const data = await service.rotate({ realm_id: 'r2' }, 'jwt');

        expect(mock_repo.rotate).toHaveBeenCalledWith({ realm_id: 'r2' }, 'jwt');
        expect(data.realm_id).toBe('r2');
        expect(data.rotated_at).toBe(9);
    });

    it('falls back to the requested realm_id and null timestamps', async () => {
        mock_repo.rotate.mockResolvedValue({ public_key_pem: PUBLIC_PEM });

        const data = await service.rotate({ realm_id: 'r3' }, 'jwt');

        expect(data).toEqual({ realm_id: 'r3', public_key_pem: PUBLIC_PEM, created_at: null, rotated_at: null });
    });
});
