import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokensRepository } from '../../../src/repositories/tokens_repository.js';
import { ApiError } from '../../../src/errors/api_error.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
    post_body: vi.fn(),
};

describe('TokensRepository', () => {
    let repo: TokensRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new TokensRepository(mock_client as any);
    });

    describe('generate', () => {
        it('calls POST /v1/auth/generate_token with the body as-is', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_abc', name: 'CI' });
            const input = { type: 'user' as const, name: 'CI', permissions: { access: { teams: ['read' as const] } } };

            const result = await repo.generate(input, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/generate_token', input, 'cliq_tok_session');
            expect(result.token).toBe('cliq_tok_abc');
        });

        it('forwards type a2a with realm_id', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_a2a', bearer: 'cliq_tok_a2a', realm_id: 'realm-1' });

            const result = await repo.generate({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/generate_token', { type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');
            expect(result.token).toBe('cliq_tok_a2a');
        });

        it('propagates ApiError from Core', async () => {
            mock_client.post.mockRejectedValue(ApiError.forbidden('nope'));
            await expect(repo.generate({ type: 'user' }, 'tok')).rejects.toThrow(ApiError);
        });
    });

    describe('get', () => {
        it('calls POST /v1/auth/get_tokens', async () => {
            mock_client.post.mockResolvedValue({ tokens: [{ id: 1, name: 'CLI', created_at: '2025-01-01', last_used_at: null }], total: 1 });

            const result = await repo.get({ type: 'user', limit: 50, offset: 0 }, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/get_tokens', { type: 'user', limit: 50, offset: 0 }, 'cliq_tok_session');
            expect(result.tokens).toHaveLength(1);
        });
    });

    describe('revoke', () => {
        it('calls POST /v1/auth/revoke_token', async () => {
            mock_client.post.mockResolvedValue({ revoked: true });

            const result = await repo.revoke({ type: 'realm', token_id: 'abc', realm_id: 'r1' }, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/revoke_token', { type: 'realm', token_id: 'abc', realm_id: 'r1' }, 'cliq_tok_session');
            expect(result.revoked).toBe(true);
        });
    });

    describe('rotate', () => {
        it('calls POST /v1/auth/rotate_token for a user token', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_rotated' });

            const result = await repo.rotate({ type: 'user', token_id: 5 }, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/rotate_token', { type: 'user', token_id: 5 }, 'cliq_tok_session');
            expect(result.token).toBe('cliq_tok_rotated');
        });

        it('calls rotate_token with type a2a and realm_id', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_a2a_new', bearer: 'cliq_tok_a2a_new', realm_id: 'realm-1' });

            const result = await repo.rotate({ type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/auth/rotate_token', { type: 'a2a', realm_id: 'realm-1' }, 'cliq_tok_session');
            expect(result.token).toBe('cliq_tok_a2a_new');
        });
    });
});
