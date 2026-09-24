import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepository } from '../../../src/repositories/auth_repository.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

describe('AuthRepository', () => {
    let repo: AuthRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new AuthRepository(mock_client as any);
    });

    describe('authenticate_user', () => {
        it('calls POST /internal/auth/authenticate_user', async () => {
            mock_client.post.mockResolvedValue({
                user: { id: 1, username: 'alice' },
                token: 'cliq_tok_abc',
                scopes: ['alice'],
                org_slugs: [],
            });

            const result = await repo.authenticate_user('alice', 'password');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/auth/authenticate_user',
                { username: 'alice', password: 'password' },
            );
            expect(result.token).toBe('cliq_tok_abc');
        });

        it('propagates ApiError from backend', async () => {
            mock_client.post.mockRejectedValue(
                new ApiError('unauthorized', 'Invalid credentials', 401),
            );
            await expect(repo.authenticate_user('alice', 'wrong'))
                .rejects.toThrow(ApiError);
        });
    });

    describe('signup', () => {
        it('calls POST /internal/auth/signup', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_new', user: { id: 1 } });
            const result = await repo.signup('bob', 'bob@test.com', 'password');
            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/auth/signup',
                { username: 'bob', email: 'bob@test.com', password: 'password' },
            );
            expect(result.token).toBe('cliq_tok_new');
        });
    });

    describe('issue_session_token', () => {
        it('calls POST /internal/auth/issue_session_token with admin bearer', async () => {
            mock_client.post.mockResolvedValue({ user_id: 2, token: 'cliq_tok_bob' });
            const result = await repo.issue_session_token(2, 'cliq_tok_admin');
            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/auth/issue_session_token',
                { user_id: 2 },
                'cliq_tok_admin',
            );
            expect(result.token).toBe('cliq_tok_bob');
        });
    });

    describe('revoke_session_token', () => {
        it('calls POST /internal/auth/revoke_session_token', async () => {
            mock_client.post.mockResolvedValue({ ok: true });
            const result = await repo.revoke_session_token('cliq_tok_x');
            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/auth/revoke_session_token',
                { token: 'cliq_tok_x' },
            );
            expect(result.ok).toBe(true);
        });
    });

    describe('new_token', () => {
        it('calls POST /v1/auth/generate_token', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_abc', name: 'CI' });
            const result = await repo.new_token(
                { type: 'user', name: 'CI', permissions: { scope: 'acme' } },
                'cliq_tok_session',
            );
            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/auth/generate_token',
                {
                    type: 'user',
                    name: 'CI',
                    realm_ids: undefined,
                    realm_id: undefined,
                    permissions: { scope: 'acme' },
                },
                'cliq_tok_session',
            );
            expect(result.token).toBe('cliq_tok_abc');
        });

        it('calls generate_token with type a2a and realm_id', async () => {
            mock_client.post.mockResolvedValue({
                token: 'cliq_tok_a2a', bearer: 'cliq_tok_a2a', realm_id: 'realm-1',
            });
            const result = await repo.new_token(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/auth/generate_token',
                {
                    type: 'a2a',
                    name: undefined,
                    realm_ids: undefined,
                    realm_id: 'realm-1',
                    permissions: undefined,
                },
                'cliq_tok_session',
            );
            expect(result.token).toBe('cliq_tok_a2a');
        });
    });

    describe('rotate_token', () => {
        it('calls POST /v1/auth/rotate_token with opts object', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_rotated' });
            const result = await repo.rotate_token(
                { type: 'user', token_id: 5 },
                'cliq_tok_session',
            );
            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/auth/rotate_token',
                { type: 'user', token_id: 5, realm_id: undefined },
                'cliq_tok_session',
            );
            expect(result.token).toBe('cliq_tok_rotated');
        });

        it('calls rotate_token with type a2a and realm_id', async () => {
            mock_client.post.mockResolvedValue({
                token: 'cliq_tok_a2a_new', bearer: 'cliq_tok_a2a_new', realm_id: 'realm-1',
            });
            const result = await repo.rotate_token(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/auth/rotate_token',
                { type: 'a2a', token_id: undefined, realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(result.token).toBe('cliq_tok_a2a_new');
        });
    });

    describe('list_tokens', () => {
        it('calls POST /v1/auth/get_tokens', async () => {
            mock_client.post.mockResolvedValue({
                tokens: [{ id: 1, name: 'CLI', created_at: '2025-01-01', last_used_at: null }],
            });
            const result = await repo.list_tokens(
                { type: 'user', limit: 50, offset: 0 },
                'cliq_tok_session',
            );
            expect(result.tokens).toHaveLength(1);
        });
    });

    describe('resolve_identity', () => {
        const user_uuid = '11111111-1111-4111-8111-111111111111';

        it('calls get_by_id with include_preferences and maps preferences', async () => {
            mock_client.post
                .mockResolvedValueOnce({ valid: true, user_id: user_uuid })
                .mockResolvedValueOnce({
                    id: user_uuid,
                    username: 'alice',
                    display_name: 'Alice',
                    email: 'a@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                    preferences: { theme: 'dark' },
                    orgs: [{ id: '22222222-2222-4222-8222-222222222222', slug: 'acme', display_name: 'Acme', role: 'member' }],
                })
                .mockResolvedValueOnce({ scopes: [{ slug: 'alice' }] });

            const result = await repo.resolve_identity('cliq_tok_session');

            expect(mock_client.post).toHaveBeenNthCalledWith(
                2,
                '/v1/users/get_by_id',
                { user_id: user_uuid, include_preferences: true },
                'cliq_tok_session',
            );
            expect(result.user.preferences).toEqual({ theme: 'dark' });
            expect(result.org_slugs).toEqual(['acme']);
            expect(result.scopes).toEqual(['alice']);
        });

        it('defaults preferences to {} when absent', async () => {
            mock_client.post
                .mockResolvedValueOnce({ valid: true, user_id: user_uuid })
                .mockResolvedValueOnce({
                    id: user_uuid,
                    username: 'alice',
                    display_name: 'Alice',
                    email: 'a@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                })
                .mockResolvedValueOnce({ scopes: [] });

            const result = await repo.resolve_identity('cliq_tok_session');
            expect(result.user.preferences).toEqual({});
        });

        it('rejects numeric user_id leftovers (UUID migration)', async () => {
            mock_client.post.mockResolvedValueOnce({ valid: true, user_id: 7 });
            await expect(repo.resolve_identity('cliq_tok_session')).rejects.toMatchObject({
                code: 'unauthorized',
            });
        });

        it('rejects valid:false tokens', async () => {
            mock_client.post.mockResolvedValueOnce({ valid: false });
            await expect(repo.resolve_identity('cliq_tok_session')).rejects.toMatchObject({
                code: 'unauthorized',
            });
        });
    });
});
