import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountRepository } from '../../../src/repositories/account_repository.js';

describe('AccountRepository', () => {
    const mock_client = { post: vi.fn(), get: vi.fn() };
    const repo = new AccountRepository(mock_client as any);

    beforeEach(() => vi.clearAllMocks());

    describe('update_profile', () => {
        it('calls POST /v1/users/update with params and token', async () => {
            mock_client.post.mockResolvedValue({
                user: { id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com', role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01' },
            });

            const result = await repo.update_profile({ display_name: 'Alice W' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/users/update', { display_name: 'Alice W' }, 'jwt-abc',
            );
            expect(result.user.display_name).toBe('Alice W');
        });

        it('passes email only', async () => {
            mock_client.post.mockResolvedValue({
                user: { id: 1, username: 'alice', display_name: 'Alice', email: 'new@test.com', role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01' },
            });

            const result = await repo.update_profile({ email: 'new@test.com' }, 'jwt-abc');

            expect(result.user.email).toBe('new@test.com');
        });
    });

    describe('change_password', () => {
        it('calls POST /internal/users/change_password with params and token', async () => {
            mock_client.post.mockResolvedValue({ message: 'Password changed' });

            const result = await repo.change_password(
                { current_password: 'old', new_password: 'newpass88' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/change_password',
                { current_password: 'old', new_password: 'newpass88' },
                'jwt-abc',
            );
            expect(result.message).toBe('Password changed');
        });
    });

    describe('update_profile preferences', () => {
        it('passes preferences through to /v1/users/update', async () => {
            mock_client.post.mockResolvedValue({
                user: { id: 1, username: 'alice', display_name: 'Alice', email: 'a@test.com', role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01' },
            });

            await repo.update_profile({ preferences: { theme: 'dark' } }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/users/update', { preferences: { theme: 'dark' } }, 'jwt-abc',
            );
        });
    });
});
