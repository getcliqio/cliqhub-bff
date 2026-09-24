import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrgsRepository } from '../../../src/repositories/orgs_repository.js';

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

describe('OrgsRepository', () => {
    let repo: OrgsRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new OrgsRepository(mock_client as any);
    });

    describe('get', () => {
        it('calls POST /v1/orgs/get with token', async () => {
            mock_client.post.mockResolvedValue({ orgs: [] });

            await repo.get('jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/get', {}, 'jwt-abc',
            );
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/orgs/get_by_id with org_id and token', async () => {
            mock_client.post.mockResolvedValue({
                id: 1, slug: 'acme', display_name: 'Acme',
                created_at: '2025-01-01', my_role: 'admin',
                members: [], scopes: [],
            });

            const result = await repo.get_by_id({ org_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/get_by_id', { org_id: 1 }, 'jwt-abc',
            );
            expect(result.slug).toBe('acme');
        });
    });

    describe('update', () => {
        it('calls POST /internal/orgs/update with params and token', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update(
                { org_id: 1, display_name: 'Acme Corp' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/update', { org_id: 1, display_name: 'Acme Corp' }, 'jwt-abc',
            );
            expect(result.updated).toBe(true);
        });
    });

    describe('leave', () => {
        it('calls POST /internal/orgs/leave with org_id and token', async () => {
            mock_client.post.mockResolvedValue({ left: true });

            const result = await repo.leave({ org_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/leave', { org_id: 1 }, 'jwt-abc',
            );
            expect(result.left).toBe(true);
        });
    });

    describe('add_member', () => {
        it('calls POST /internal/orgs/add_member with params and token', async () => {
            mock_client.post.mockResolvedValue({ user_id: 3, username: 'bob', role: 'member' });

            const result = await repo.add_member({ org_id: 1, username: 'bob' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/add_member', { org_id: 1, username: 'bob' }, 'jwt-abc',
            );
            expect(result.username).toBe('bob');
        });
    });

    describe('remove_member', () => {
        it('calls POST /internal/orgs/remove_member with params and token', async () => {
            mock_client.post.mockResolvedValue({ removed: true });

            const result = await repo.remove_member({ org_id: 1, user_id: 3 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/remove_member', { org_id: 1, user_id: 3 }, 'jwt-abc',
            );
            expect(result.removed).toBe(true);
        });
    });

    describe('list_roles', () => {
        it('calls POST /v1/orgs/list_roles with params and token', async () => {
            mock_client.post.mockResolvedValue({ roles: [] });

            const result = await repo.list_roles({ org_id: 1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/list_roles', { org_id: 1 }, 'jwt-abc',
            );
            expect(result.roles).toEqual([]);
        });
    });

    describe('update_user_role', () => {
        it('calls POST /internal/users/update_role with params and token', async () => {
            mock_client.post.mockResolvedValue({
                user_id: 3, org_id: 1, role_id: 2, role_slug: 'admin', role: 'admin',
            });

            const result = await repo.update_user_role(
                { user_id: 3, org_id: 1, role_id: 2 }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/users/update_role', { user_id: 3, org_id: 1, role_id: 2 }, 'jwt-abc',
            );
            expect(result.role_id).toBe(2);
        });
    });

    describe('delete_role', () => {
        it('calls POST /internal/orgs/delete_role with params and token', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_role({ org_id: 1, role_id: 10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/internal/orgs/delete_role', { org_id: 1, role_id: 10 }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });

    describe('new_scope', () => {
        it('calls POST /v1/scopes/new with org scope params', async () => {
            mock_client.post.mockResolvedValue({ id: 20, slug: 'acme-labs' });

            const result = await repo.new_scope(
                { org_id: 1, slug: 'acme-labs', visibility: 'private' }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/new',
                {
                    slug: 'acme-labs',
                    display_name: undefined,
                    visibility: 'private',
                    scope_type: 'org',
                    org_id: 1,
                },
                'jwt-abc',
            );
            expect(result.slug).toBe('acme-labs');
        });
    });

    describe('delete_scope', () => {
        it('calls POST /v1/scopes/delete with scope_id', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_scope({ org_id: 1, scope_id: 11 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/delete', { scope_id: 11 }, 'jwt-abc',
            );
            expect(result.deleted).toBe(true);
        });
    });

    describe('assign_scope_member', () => {
        it('calls POST /v1/scopes/add_user', async () => {
            mock_client.post.mockResolvedValue({ assigned: true });

            const result = await repo.assign_scope_member(
                { org_id: 1, scope_id: 10, user_id: 3 }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/add_user',
                { scope_id: 10, user_id: 3 },
                'jwt-abc',
            );
            expect(result.assigned).toBe(true);
        });
    });

    describe('unassign_scope_member', () => {
        it('calls POST /v1/scopes/remove_user', async () => {
            mock_client.post.mockResolvedValue({ removed: true });

            const result = await repo.unassign_scope_member(
                { org_id: 1, scope_id: 10, user_id: 3 }, 'jwt-abc',
            );

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/scopes/remove_user',
                { scope_id: 10, user_id: 3 },
                'jwt-abc',
            );
            expect(result.removed).toBe(true);
        });
    });
});
