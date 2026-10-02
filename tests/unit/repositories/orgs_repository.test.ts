import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrgsRepository } from '../../../src/repositories/orgs_repository.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const ORG_1 = hub_legacy_uuid(1);
const USER_1 = hub_legacy_uuid(11);
const USER_3 = hub_legacy_uuid(13);
const ROLE_2 = hub_legacy_uuid(22);
const ROLE_10 = hub_legacy_uuid(30);
const SCOPE_10 = hub_legacy_uuid(40);
const SCOPE_11 = hub_legacy_uuid(41);

const mock_client = {
    post: vi.fn(),
    get: vi.fn(),
    post_raw: vi.fn(),
};

const ROLE_VO = {
    id: ROLE_2, org_id: ORG_1, slug: 'admin', name: 'Admin',
    permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
};

describe('OrgsRepository', () => {
    let repo: OrgsRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new OrgsRepository(mock_client as any);
    });

    describe('get', () => {
        it('calls POST /v1/orgs/get with the body and token', async () => {
            mock_client.post.mockResolvedValue({ orgs: [] });

            const result = await repo.get({}, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get', {}, 'jwt-abc');
            expect(result.orgs).toEqual([]);
        });

        it('forwards mine', async () => {
            mock_client.post.mockResolvedValue({ orgs: [] });

            await repo.get({ mine: true }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get', { mine: true }, 'jwt-abc');
        });
    });

    describe('get_all', () => {
        it('calls POST /v1/orgs/get with paging params (site admin)', async () => {
            mock_client.post.mockResolvedValue({
                orgs: [{ id: 1, slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const result = await repo.get_all({ limit: 20, offset: 0 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get', { limit: 20, offset: 0 }, 'jwt-abc');
            expect(result.orgs).toHaveLength(1);
        });
    });

    describe('new', () => {
        it('calls POST /internal/orgs/new', async () => {
            mock_client.post.mockResolvedValue({ org: { id: ORG_1, slug: 'acme' }, owner_invite: { invite_id: 'inv-1' } });

            const result = await repo.new({ slug: 'acme', owner: { user_id: USER_3 } }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/new', { slug: 'acme', owner: { user_id: USER_3 } }, 'jwt-abc');
            expect(result.org.slug).toBe('acme');
        });
    });

    describe('delete', () => {
        it('calls POST /internal/orgs/delete', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete({ org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/delete', { org_id: ORG_1 }, 'jwt-abc');
            expect(result.deleted).toBe(true);
        });
    });

    describe('get_by_id', () => {
        it('calls POST /v1/orgs/get_by_id with org_id and token', async () => {
            mock_client.post.mockResolvedValue({
                id: ORG_1, slug: 'acme', display_name: 'Acme',
                created_at: '2025-01-01', my_role: 'admin',
                members: [], scopes: [],
            });

            const result = await repo.get_by_id({ org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get_by_id', { org_id: ORG_1 }, 'jwt-abc');
            expect(result.slug).toBe('acme');
        });
    });

    describe('update', () => {
        it('calls POST /internal/orgs/update', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update({ org_id: ORG_1, display_name: 'Acme Corp' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/update', { org_id: ORG_1, display_name: 'Acme Corp' }, 'jwt-abc');
            expect(result.updated).toBe(true);
        });
    });

    describe('leave', () => {
        it('calls POST /internal/orgs/leave', async () => {
            mock_client.post.mockResolvedValue({ left: true });

            const result = await repo.leave({ org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/leave', { org_id: ORG_1 }, 'jwt-abc');
            expect(result.left).toBe(true);
        });
    });

    describe('remove_member', () => {
        it('calls POST /internal/orgs/remove_member', async () => {
            mock_client.post.mockResolvedValue({ removed: true });

            const result = await repo.remove_member({ org_id: ORG_1, user_id: USER_3 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/remove_member', { org_id: ORG_1, user_id: USER_3 }, 'jwt-abc');
            expect(result.removed).toBe(true);
        });
    });

    describe('list_roles', () => {
        it('calls POST /v1/orgs/list_roles', async () => {
            mock_client.post.mockResolvedValue({ roles: [] });

            const result = await repo.list_roles({ org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/list_roles', { org_id: ORG_1 }, 'jwt-abc');
            expect(result.roles).toEqual([]);
        });
    });

    describe('get_role', () => {
        it('calls POST /internal/orgs/get_role', async () => {
            mock_client.post.mockResolvedValue({ role: ROLE_VO });

            const result = await repo.get_role({ org_id: ORG_1, role_id: ROLE_2 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/get_role', { org_id: ORG_1, role_id: ROLE_2 }, 'jwt-abc');
            expect(result.role.id).toBe(ROLE_2);
        });
    });

    describe('create_role', () => {
        it('calls POST /internal/orgs/create_role', async () => {
            mock_client.post.mockResolvedValue({ role: ROLE_VO });
            const input = { org_id: ORG_1, slug: 'custom', name: 'Custom', permissions: ['org.settings'] };

            await repo.create_role(input, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/create_role', input, 'jwt-abc');
        });
    });

    describe('update_role', () => {
        it('calls POST /internal/orgs/update_role', async () => {
            mock_client.post.mockResolvedValue({ role: ROLE_VO });
            const input = { org_id: ORG_1, role_id: ROLE_2, permissions: ['org.settings'] };

            await repo.update_role(input, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/update_role', input, 'jwt-abc');
        });
    });

    describe('delete_role', () => {
        it('calls POST /internal/orgs/delete_role', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_role({ org_id: ORG_1, role_id: ROLE_10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/orgs/delete_role', { org_id: ORG_1, role_id: ROLE_10 }, 'jwt-abc');
            expect(result.deleted).toBe(true);
        });
    });

    describe('new_scope', () => {
        it('calls POST /v1/orgs/new_scope with the body unchanged', async () => {
            mock_client.post.mockResolvedValue({ id: SCOPE_10, slug: 'acme-labs' });

            const result = await repo.new_scope({ org_id: ORG_1, slug: 'acme-labs', visibility: 'private' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/new_scope', { org_id: ORG_1, slug: 'acme-labs', visibility: 'private' }, 'jwt-abc',
            );
            expect(result.slug).toBe('acme-labs');
        });
    });

    describe('update_scope', () => {
        it('calls POST /v1/orgs/update_scope', async () => {
            mock_client.post.mockResolvedValue({ updated: true });

            const result = await repo.update_scope({ org_id: ORG_1, scope_id: SCOPE_10, display_name: 'Labs' }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/update_scope', { org_id: ORG_1, scope_id: SCOPE_10, display_name: 'Labs' }, 'jwt-abc',
            );
            expect(result.updated).toBe(true);
        });
    });

    describe('delete_scope', () => {
        it('calls POST /v1/orgs/delete_scope', async () => {
            mock_client.post.mockResolvedValue({ deleted: true });

            const result = await repo.delete_scope({ org_id: ORG_1, scope_id: SCOPE_11 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/delete_scope', { org_id: ORG_1, scope_id: SCOPE_11 }, 'jwt-abc');
            expect(result.deleted).toBe(true);
        });
    });

    describe('assign_scope_member', () => {
        it('calls POST /v1/orgs/assign_scope_member', async () => {
            mock_client.post.mockResolvedValue({ assigned: true });

            const result = await repo.assign_scope_member({ org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/assign_scope_member', { org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt-abc',
            );
            expect(result.assigned).toBe(true);
        });
    });

    describe('unassign_scope_member', () => {
        it('calls POST /v1/orgs/unassign_scope_member', async () => {
            mock_client.post.mockResolvedValue({ removed: true });

            const result = await repo.unassign_scope_member({ org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith(
                '/v1/orgs/unassign_scope_member', { org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt-abc',
            );
            expect(result.removed).toBe(true);
        });
    });

    describe('get_scopes', () => {
        it('calls POST /v1/orgs/get_scopes', async () => {
            mock_client.post.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20 });

            const result = await repo.get_scopes({ user_id: USER_1, org_id: ORG_1 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/v1/orgs/get_scopes', { user_id: USER_1, org_id: ORG_1 }, 'jwt-abc');
            expect(result.total).toBe(0);
        });
    });
});
