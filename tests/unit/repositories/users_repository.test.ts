import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersRepository } from '../../../src/repositories/users_repository.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const USER_1 = hub_legacy_uuid(1);
const USER_5 = hub_legacy_uuid(5);
const ORG_1 = hub_legacy_uuid(101);
const ROLE_2 = hub_legacy_uuid(202);

describe('UsersRepository', () => {
    const mock_client = { post: vi.fn(), get: vi.fn() };
    const repo = new UsersRepository(mock_client as any);

    beforeEach(() => vi.resetAllMocks());

    describe('get', () => {
        it('calls POST /v1/users/get with params and token', async () => {
            mock_client.post.mockResolvedValue({
                users: [{ id: USER_1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const result = await repo.get({ limit: 20, offset: 0, search: 'alice' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get', { limit: 20, offset: 0, search: 'alice' }, 'jwt-abc');
            expect(result.users).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('forwards realm_id for realm invite search', async () => {
            mock_client.post.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

            await repo.get({ realm_id: 'realm-1', search: 'bob' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get', { realm_id: 'realm-1', search: 'bob' }, 'jwt-abc');
        });

        it('forwards org_id for an org member list', async () => {
            mock_client.post.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

            await repo.get({ org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get', { org_id: ORG_1 }, 'jwt-abc');
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/users/get_by_id', async () => {
            mock_client.post.mockResolvedValue({
                id: USER_1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                scope_count: 2, team_count: 3, token_count: 1, draft_count: 0, orgs: [],
            });

            const result = await repo.get_by_id({ user_id: USER_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get_by_id', { user_id: USER_1 }, 'jwt-abc');
            expect(result.username).toBe('alice');
        });
    });

    describe('new', () => {
        it('calls POST /internal/users/new', async () => {
            mock_client.post.mockResolvedValue({ user: { id: USER_5, username: 'bob' }, setup: { email_sent: true } });

            const result = await repo.new({ username: 'bob', email: 'bob@test.com' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/new', { username: 'bob', email: 'bob@test.com' }, 'jwt-abc',
            );
            expect(result.user.username).toBe('bob');
        });
    });

    describe('update', () => {
        it('calls POST /v1/users/update with user_id', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update({ user_id: USER_1, display_name: 'Alice W' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/update', { user_id: USER_1, display_name: 'Alice W' }, 'jwt-abc');
            expect(result.updated).toBe(true);
        });
    });

    describe('suspend', () => {
        it('calls POST /internal/users/suspend', async () => {
            mock_client.post.mockResolvedValue({ suspended: true });

            const result = await repo.suspend({ user_id: USER_5, reason: 'spam' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/suspend', { user_id: USER_5, reason: 'spam' }, 'jwt-abc');
            expect(result.suspended).toBe(true);
        });
    });

    describe('unsuspend', () => {
        it('calls POST /internal/users/unsuspend', async () => {
            mock_client.post.mockResolvedValue({ suspended: false });

            const result = await repo.unsuspend({ user_id: USER_5 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/unsuspend', { user_id: USER_5 }, 'jwt-abc');
            expect(result.suspended).toBe(false);
        });
    });

    describe('delete', () => {
        it('calls POST /internal/users/delete', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete({ user_id: USER_5 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/delete', { user_id: USER_5 }, 'jwt-abc');
            expect(result.deleted).toBe(true);
        });
    });

    describe('set_role', () => {
        it('calls POST /internal/users/set_role', async () => {
            mock_client.post.mockResolvedValue({ role: 'admin' });

            const result = await repo.set_role({ user_id: USER_1, role: 'admin' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/set_role', { user_id: USER_1, role: 'admin' }, 'jwt-abc');
            expect(result.role).toBe('admin');
        });
    });

    describe('reset_password', () => {
        it('calls POST /internal/users/reset_password with { user_id } as the admin', async () => {
            mock_client.post.mockResolvedValue({ reset_id: 'rst-1', email_sent: true });

            const result = await repo.reset_password({ user_id: USER_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/reset_password', { user_id: USER_1 }, 'jwt-abc');
            expect(result.reset_id).toBe('rst-1');
        });
    });

    describe('forgot_password', () => {
        it('calls the same Core route signed out with { email } only', async () => {
            mock_client.post.mockResolvedValue({ requested: true });

            const result = await repo.forgot_password({ email: 'priya@example.test' });

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/reset_password', { email: 'priya@example.test' });
            expect(result.requested).toBe(true);
        });
    });

    describe('reset_with_token', () => {
        it('calls POST /internal/users/change_password without a bearer', async () => {
            mock_client.post.mockResolvedValue({ user: { id: USER_1, username: 'alice', status: 'active' }, sessions_revoked: 0 });

            const result = await repo.reset_with_token({ reset_token: 'tok', new_password: 'newpass88' });

            expect(mock_client.post).toHaveBeenCalledWith('/internal/users/change_password', { reset_token: 'tok', new_password: 'newpass88' });
            expect(result.user.username).toBe('alice');
        });
    });

    describe('update_role', () => {
        it('calls POST /internal/users/update_role', async () => {
            mock_client.post.mockResolvedValue({
                user_id: USER_1, org_id: ORG_1, role_id: ROLE_2, role_slug: 'admin', role: 'admin',
            });

            const result = await repo.update_role({ user_id: USER_1, org_id: ORG_1, role_id: ROLE_2 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/update_role', { user_id: USER_1, org_id: ORG_1, role_id: ROLE_2 }, 'jwt-abc',
            );
            expect(result.role_id).toBe(ROLE_2);
        });
    });

    describe('update_profile', () => {
        const user = { id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com', role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01' };

        it('calls POST /v1/users/update without user_id', async () => {
            mock_client.post.mockResolvedValue({ user });

            const result = await repo.update_profile({ display_name: 'Alice W' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/update', { display_name: 'Alice W' }, 'jwt-abc');
            expect(result.user.display_name).toBe('Alice W');
        });

        it('passes email only', async () => {
            mock_client.post.mockResolvedValue({ user: { ...user, email: 'new@test.com' } });

            const result = await repo.update_profile({ email: 'new@test.com' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/update', { email: 'new@test.com' }, 'jwt-abc');
            expect(result.user.email).toBe('new@test.com');
        });

        it('passes preferences through', async () => {
            mock_client.post.mockResolvedValue({ user });

            await repo.update_profile({ preferences: { theme: 'dark' } }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/update', { preferences: { theme: 'dark' } }, 'jwt-abc');
        });
    });

    describe('change_password', () => {
        it('calls POST /internal/users/change_password', async () => {
            mock_client.post.mockResolvedValue({ user: { id: USER_1, username: 'alice', status: 'active' }, sessions_revoked: 2 });

            const result = await repo.change_password({ current_password: 'old', new_password: 'newpass88' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/change_password', { current_password: 'old', new_password: 'newpass88' }, 'jwt-abc',
            );
            expect(result.sessions_revoked).toBe(2);
        });
    });
});
