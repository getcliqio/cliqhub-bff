import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminRepository } from '../../../src/repositories/admin_repository.js';

describe('AdminRepository', () => {
    const mock_client = { post: vi.fn(), get: vi.fn() };
    const repo = new AdminRepository(mock_client as any);

    beforeEach(() => vi.clearAllMocks());

    describe('audit', () => {
        it('calls POST /internal/reports/audit with params and token', async () => {
            mock_client.post.mockResolvedValue({
                entries: [{ id: 1, admin_id: 99, admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' }],
                total: 1, limit: 50, offset: 0,
            });

            const result = await repo.audit({ action: 'user.suspend', limit: 10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/reports/audit', { action: 'user.suspend', limit: 10 }, 'jwt-abc',
            );
            expect(result.entries).toHaveLength(1);
        });

        it('passes empty params when no filters', async () => {
            mock_client.post.mockResolvedValue({ entries: [], total: 0, limit: 50, offset: 0 });

            await repo.audit({}, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/reports/audit', {}, 'jwt-abc');
        });
    });

    describe('get_users', () => {
        it('calls POST /v1/users/get with params and token', async () => {
            mock_client.post.mockResolvedValue({
                users: [{ id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01' }],
                total: 1,
            });

            const result = await repo.get_users({ limit: 20, offset: 0, search: 'alice' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/users/get', { limit: 20, offset: 0, search: 'alice' }, 'jwt-abc',
            );
            expect(result.users).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('forwards realm_id for realm invite search', async () => {
            mock_client.post.mockResolvedValue({ users: [], total: 0 });

            await repo.get_users({ realm_id: 'realm-1', search: 'bob' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/users/get', { realm_id: 'realm-1', search: 'bob' }, 'jwt-abc',
            );
        });
    });

    describe('get_user', () => {
        it('calls POST /v1/users/get_by_id with user_id and token', async () => {
            mock_client.post.mockResolvedValue({
                id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                scope_count: 2, team_count: 3, token_count: 1, draft_count: 0, orgs: [],
            });

            const result = await repo.get_user({ user_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/users/get_by_id', { user_id: 1 }, 'jwt-abc');
            expect(result.username).toBe('alice');
        });
    });

    describe('new_user', () => {
        it('calls POST hub users/create with params and token', async () => {
            mock_client.post.mockResolvedValue({
                id: 10, username: 'bob',
            });

            const result = await repo.new_user(
                { username: 'bob', email: 'bob@test.com', password: 'securepass' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/new',
                { username: 'bob', email: 'bob@test.com', password: 'securepass' },
                'jwt-abc',
            );
            expect(result.username).toBe('bob');
        });
    });

    describe('update_user', () => {
        it('calls POST hub users/update with params and token', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update_user({ user_id: 1, display_name: 'Alice W' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/users/update', { user_id: 1, display_name: 'Alice W' }, 'jwt-abc',
            );
            expect(result.updated).toBe(true);
        });
    });

    describe('suspend_user', () => {
        it('calls POST hub users/suspend with params and token', async () => {
            mock_client.post.mockResolvedValue({ suspended: true });

            const result = await repo.suspend_user({ user_id: 5, reason: 'spam' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/suspend', { user_id: 5, reason: 'spam' }, 'jwt-abc',
            );
            expect(result.suspended).toBe(true);
        });
    });

    describe('unsuspend_user', () => {
        it('calls POST hub users/unsuspend with params and token', async () => {
            mock_client.post.mockResolvedValue({ suspended: false });

            const result = await repo.unsuspend_user({ user_id: 5 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/unsuspend', { user_id: 5 }, 'jwt-abc',
            );
            expect(result.suspended).toBe(false);
        });
    });

    describe('delete_user', () => {
        it('calls POST hub users/delete with params and token', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_user({ user_id: 5 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/delete', { user_id: 5 }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });

    describe('set_user_role', () => {
        it('calls POST hub users/set-role with params and token', async () => {
            mock_client.post.mockResolvedValue({ role: 'admin' });

            const result = await repo.set_user_role({ user_id: 1, role: 'admin' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/set_role', { user_id: 1, role: 'admin' }, 'jwt-abc',
            );
            expect(result.role).toBe('admin');
        });
    });

    describe('reset_user_password', () => {
        it('calls POST /internal/users/reset_password with params and token', async () => {
            mock_client.post.mockResolvedValue({ reset: true });

            const result = await repo.reset_user_password({ user_id: 1, new_password: 'newpass123' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/reset_password', { user_id: 1, new_password: 'newpass123' }, 'jwt-abc',
            );
            expect(result.reset).toBe(true);
        });
    });

    describe('get_teams', () => {
        it('calls POST hub teams with params and token', async () => {
            mock_client.post.mockResolvedValue({
                teams: [{ id: 1, name: 'tdd-git', scope: 'cliq', listed: true }],
                total: 1, limit: 20, offset: 0,
            });

            const result = await repo.get_teams({ limit: 20, offset: 0 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/get', { limit: 20, offset: 0 }, 'jwt-abc',
            );
            expect(result.teams).toHaveLength(1);
        });
    });

    describe('set_team_listed', () => {
        it('calls POST hub teams/set-listed with params and token', async () => {
            mock_client.post.mockResolvedValue({ listed: true });

            const result = await repo.set_team_listed({ team_id: '00000000-0000-4000-8000-000000000001', listed: true }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/teams/publish',
                { team_id: '00000000-0000-4000-8000-000000000001', visibility: 'public' }, 'jwt-abc',
            );
            expect(result.listed).toBe(true);
        });
    });

    describe('get_scopes', () => {
        it('calls POST hub scopes with params and token', async () => {
            mock_client.post.mockResolvedValue({
                scopes: [{ id: 1, slug: 'alice', display_name: 'Alice', owner_id: 1, owner_username: 'alice', visibility: 'public', scope_type: 'user', team_count: 3, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const result = await repo.get_scopes({ limit: 20, offset: 0 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/get', { limit: 20, offset: 0 }, 'jwt-abc',
            );
            expect(result.scopes).toHaveLength(1);
        });
    });

    describe('new_scope', () => {
        it('calls POST hub scopes/new with params and token', async () => {
            mock_client.post.mockResolvedValue({ id: 10, slug: 'newscope' });

            const result = await repo.new_scope(
                { slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/new',
                { slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user' },
                'jwt-abc',
            );
            expect(result.slug).toBe('newscope');
        });
    });

    describe('update_scope', () => {
        it('calls POST hub scopes/update with params and token', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update_scope({ scope_id: 1, visibility: 'private' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/update', { scope_id: 1, visibility: 'private' }, 'jwt-abc',
            );
            expect(result.updated).toBe(true);
        });
    });

    describe('delete_scope', () => {
        it('calls POST hub scopes/delete with params and token', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_scope({ scope_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/delete', { scope_id: 1 }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });

    describe('get_orgs', () => {
        it('calls POST hub orgs with params and token', async () => {
            mock_client.post.mockResolvedValue({
                orgs: [{ id: 1, slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const result = await repo.get_orgs({ limit: 20, offset: 0 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/get', { limit: 20, offset: 0 }, 'jwt-abc',
            );
            expect(result.orgs).toHaveLength(1);
        });
    });

    describe('new_org', () => {
        it('calls POST hub orgs/create with params and token', async () => {
            mock_client.post.mockResolvedValue({ id: 5, slug: 'acme' });

            const result = await repo.new_org(
                { slug: 'acme', admin_username: 'alice' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/new',
                { slug: 'acme', admin_username: 'alice' },
                'jwt-abc',
            );
            expect(result.slug).toBe('acme');
        });
    });

    describe('delete_org', () => {
        it('calls POST hub orgs/delete with params and token', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_org({ org_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/delete', { org_id: 1 }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });
});
