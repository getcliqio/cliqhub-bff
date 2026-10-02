import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokensService } from '../../../src/services/tokens_service.js';

describe('TokensService', () => {
    const mock_repo = {
        generate: vi.fn(),
        get: vi.fn(),
        revoke: vi.fn(),
        rotate: vi.fn(),
    };

    let service: TokensService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new TokensService(mock_repo as any);
    });

    describe('generate', () => {
        it('delegates to the repository and maps a user token', async () => {
            mock_repo.generate.mockResolvedValue({ token: 'cliq_tok_abc', name: 'CI', id: 9, realm_ids: [] });
            const input = { type: 'user' as const, name: 'CI', permissions: { domains: { orgs: '*' as const } } };

            const data = await service.generate(input, 'cliq_tok_session');

            expect(mock_repo.generate).toHaveBeenCalledWith(input, 'cliq_tok_session');
            expect(data).toEqual({ token: 'cliq_tok_abc', name: 'CI', id: 9, realm_ids: [] });
        });

        it('maps a2a mint response with realm_id', async () => {
            mock_repo.generate.mockResolvedValue({
                token: 'cliq_tok_a2a', bearer: 'cliq_tok_a2a', name: 'a2a', realm_id: 'realm-1',
                has_bearer: true, bearer_prefix: 'cliq_tok_',
            });

            const data = await service.generate({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');

            expect(mock_repo.generate).toHaveBeenCalledWith({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');
            expect(data).toEqual({
                token: 'cliq_tok_a2a', bearer: 'cliq_tok_a2a', name: 'a2a', realm_id: 'realm-1',
                realm_ids: ['realm-1'], has_bearer: true, bearer_prefix: 'cliq_tok_',
            });
        });

        it('maps daemon_wire with its lifetime', async () => {
            mock_repo.generate.mockResolvedValue({ token: 'cliq_dt_x', expires_in: 300 });

            const data = await service.generate({ type: 'daemon_wire', realm_id: 'realm-1', aud: 'edge-1' }, 'tok');

            expect(data).toEqual({ token: 'cliq_dt_x', name: 'daemon_wire', realm_id: 'realm-1', realm_ids: ['realm-1'], expires_in: 300 });
        });
    });

    describe('get', () => {
        it('delegates and maps the list', async () => {
            mock_repo.get.mockResolvedValue({
                tokens: [{ id: 1, name: 'CLI', created_at: '2025-01-01', last_used_at: null, secret: 'x' }],
                total: 1,
            });

            const data = await service.get({ type: 'user', limit: 50, offset: 0 }, 'cliq_tok_session');

            expect(mock_repo.get).toHaveBeenCalledWith({ type: 'user', limit: 50, offset: 0 }, 'cliq_tok_session');
            expect(data).toEqual({
                tokens: [{ id: 1, name: 'CLI', permissions: {}, created_at: '2025-01-01', last_used_at: null }],
                total: 1,
            });
        });
    });

    describe('revoke', () => {
        it('delegates and maps revoked', async () => {
            mock_repo.revoke.mockResolvedValue({ revoked: true, type: 'user' });

            const data = await service.revoke({ type: 'user', token_id: 5 }, 'cliq_tok_session');

            expect(mock_repo.revoke).toHaveBeenCalledWith({ type: 'user', token_id: 5 }, 'cliq_tok_session');
            expect(data).toEqual({ revoked: true });
        });
    });

    describe('rotate', () => {
        it('delegates and returns only the new secret for a user token', async () => {
            mock_repo.rotate.mockResolvedValue({ token: 'cliq_tok_rotated', type: 'user' });

            const data = await service.rotate({ type: 'user', token_id: 5 }, 'cliq_tok_session');

            expect(mock_repo.rotate).toHaveBeenCalledWith({ type: 'user', token_id: 5 }, 'cliq_tok_session');
            expect(data).toEqual({ token: 'cliq_tok_rotated' });
        });

        it('maps a2a rotate response with realm_id', async () => {
            mock_repo.rotate.mockResolvedValue({
                token: 'cliq_tok_a2a_new', bearer: 'cliq_tok_a2a_new', realm_id: 'realm-1',
                has_bearer: true, bearer_prefix: 'cliq_tok_',
            });

            const data = await service.rotate({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');

            expect(mock_repo.rotate).toHaveBeenCalledWith({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');
            expect(data).toEqual({
                token: 'cliq_tok_a2a_new', bearer: 'cliq_tok_a2a_new', type: 'a2a', realm_id: 'realm-1',
                has_bearer: true, bearer_prefix: 'cliq_tok_',
            });
        });
    });
});
