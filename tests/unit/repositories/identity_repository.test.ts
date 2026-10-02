import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityRepository } from '../../../src/repositories/identity_repository.js';
import { ApiError } from '../../../src/errors/api_error.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const BOB_ID = '22222222-2222-4222-8222-222222222222';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
    post_body: vi.fn(),
};

describe('IdentityRepository', () => {
    let repo: IdentityRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new IdentityRepository(mock_client as any);
    });

    describe('authenticate_user', () => {
        it('calls POST /internal/auth/authenticate_user without a bearer', async () => {
            mock_client.post.mockResolvedValue({
                user: { id: USER_ID, username: 'alice' }, token: 'cliq_tok_abc', scopes: ['alice'], org_slugs: [],
            });

            const result = await repo.authenticate_user('alice', 'password');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/auth/authenticate_user', { username: 'alice', password: 'password' });
            expect(result.token).toBe('cliq_tok_abc');
        });

        it('propagates ApiError from backend', async () => {
            mock_client.post.mockRejectedValue(new ApiError('unauthorized', 'Invalid credentials', 401));
            await expect(repo.authenticate_user('alice', 'wrong')).rejects.toThrow(ApiError);
        });
    });

    describe('signup', () => {
        it('calls POST /internal/auth/signup', async () => {
            mock_client.post.mockResolvedValue({ token: 'cliq_tok_new', user: { id: USER_ID } });

            const result = await repo.signup('bob', 'bob@test.com', 'password');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/auth/signup', { username: 'bob', email: 'bob@test.com', password: 'password' });
            expect(result.token).toBe('cliq_tok_new');
        });
    });

    describe('issue_session_token', () => {
        it('calls POST /internal/auth/issue_session_token with admin bearer', async () => {
            mock_client.post.mockResolvedValue({ user_id: BOB_ID, token: 'cliq_tok_bob' });

            const result = await repo.issue_session_token(BOB_ID, 'cliq_tok_admin');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/auth/issue_session_token', { user_id: BOB_ID }, 'cliq_tok_admin');
            expect(result.token).toBe('cliq_tok_bob');
        });
    });

    describe('revoke_session_token', () => {
        it('calls POST /internal/auth/revoke_session_token and resolves to void', async () => {
            mock_client.post.mockResolvedValue({ revoked: true });

            const result = await repo.revoke_session_token('cliq_tok_x');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/auth/revoke_session_token', { token: 'cliq_tok_x' });
            expect(result).toBeUndefined();
        });
    });

    describe('get_user_by_id', () => {
        it('calls POST /v1/users/get_by_id without preferences by default', async () => {
            mock_client.post.mockResolvedValue({ id: BOB_ID });

            await repo.get_user_by_id(BOB_ID, 'tok');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get_by_id', { user_id: BOB_ID }, 'tok');
        });
    });

    describe('list_scope_slugs', () => {
        it('calls POST /v1/orgs/get_scopes and keeps non-empty string slugs', async () => {
            mock_client.post.mockResolvedValue({ items: [{ slug: 'alice' }, { slug: '' }, { slug: 42 }, {}, { slug: 'acme' }] });

            const result = await repo.list_scope_slugs(USER_ID, 'tok');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get_scopes', { user_id: USER_ID }, 'tok');
            expect(result).toEqual(['alice', 'acme']);
        });

        it('returns [] when Core sends no items', async () => {
            mock_client.post.mockResolvedValue({});
            expect(await repo.list_scope_slugs(USER_ID, 'tok')).toEqual([]);
        });
    });

    describe('resolve_identity', () => {
        it('validates the token, then reads the user (with preferences) and scopes', async () => {
            mock_client.post
                .mockResolvedValueOnce({ valid: true, user_id: USER_ID })
                .mockResolvedValueOnce({
                    id: USER_ID,
                    username: 'alice',
                    display_name: 'Alice',
                    email: 'a@test.com',
                    role: 'user',
                    suspended_at: null,
                    created_at: '2025-01-01',
                    preferences: { theme: 'dark' },
                    orgs: [{ id: '22222222-2222-4222-8222-222222222222', slug: 'acme', display_name: 'Acme', role: 'member' }],
                })
                .mockResolvedValueOnce({ items: [{ slug: 'alice' }], total: 1, offset: 0, limit: 100 });

            const result = await repo.resolve_identity('cliq_tok_session');

            expect(mock_client.post).toHaveBeenNthCalledWith(1, '/v1/auth/validate_token', { token: 'cliq_tok_session' }, 'cliq_tok_session');
            expect(mock_client.post).toHaveBeenNthCalledWith(2, '/v1/users/get_by_id', { user_id: USER_ID, include_preferences: true }, 'cliq_tok_session');
            expect(mock_client.post).toHaveBeenNthCalledWith(3, '/v1/orgs/get_scopes', { user_id: USER_ID }, 'cliq_tok_session');
            expect(result.user).toEqual({
                id: USER_ID, username: 'alice', display_name: 'Alice', email: 'a@test.com', role: 'user',
                suspended_at: null, suspended_reason: '', created_at: '2025-01-01', preferences: { theme: 'dark' },
            });
            expect(result.org_slugs).toEqual(['acme']);
            expect(result.scopes).toEqual(['alice']);
        });

        it('defaults preferences to {}, display_name to username, and non-admin roles to user', async () => {
            mock_client.post
                .mockResolvedValueOnce({ valid: true, user_id: USER_ID })
                .mockResolvedValueOnce({
                    id: USER_ID, username: 'alice', display_name: '', email: 'a@test.com',
                    role: 'owner', suspended_at: null, created_at: '2025-01-01',
                })
                .mockResolvedValueOnce({ items: [], total: 0, offset: 0, limit: 100 });

            const result = await repo.resolve_identity('cliq_tok_session');

            expect(result.user.preferences).toEqual({});
            expect(result.user.display_name).toBe('alice');
            expect(result.user.role).toBe('user');
            expect(result.org_slugs).toEqual([]);
        });

        it('rejects numeric user_id leftovers (UUID migration)', async () => {
            mock_client.post.mockResolvedValueOnce({ valid: true, user_id: 7 });
            await expect(repo.resolve_identity('cliq_tok_session')).rejects.toMatchObject({ code: 'unauthorized' });
            expect(mock_client.post).toHaveBeenCalledTimes(1);
        });

        it('rejects valid:false tokens', async () => {
            mock_client.post.mockResolvedValueOnce({ valid: false });
            await expect(repo.resolve_identity('cliq_tok_session')).rejects.toMatchObject({ code: 'unauthorized' });
        });
    });
});
