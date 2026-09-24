import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrgsService } from '../../../src/services/orgs_service.js';

describe('OrgsService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_by_id: vi.fn(),
        update: vi.fn(),
        leave: vi.fn(),
        add_member: vi.fn(),
        remove_member: vi.fn(),
        list_roles: vi.fn(),
        get_role: vi.fn(),
        create_role: vi.fn(),
        update_role: vi.fn(),
        delete_role: vi.fn(),
        update_user_role: vi.fn(),
        new_scope: vi.fn(),
        delete_scope: vi.fn(),
        assign_scope_member: vi.fn(),
        unassign_scope_member: vi.fn(),
    };

    let service: OrgsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new OrgsService(mock_repo as any);
    });

    describe('get', () => {
        it('maps list VO to DTO', async () => {
            mock_repo.get.mockResolvedValue({
                orgs: [{
                    id: 1, slug: 'acme', display_name: 'Acme',
                    role: 'admin', member_count: 3, scope_count: 2,
                }],
            });

            const dto = await service.get('jwt');

            expect(dto.orgs).toHaveLength(1);
            expect(dto.orgs[0].slug).toBe('acme');
        });
    });

    describe('get_by_id', () => {
        it('maps detail VO to DTO', async () => {
            mock_repo.get_by_id.mockResolvedValue({
                id: 1, slug: 'acme', display_name: 'Acme',
                created_at: '2025-01-01', my_role: 'admin',
                members: [{ user_id: 1, username: 'alice', display_name: 'Alice', role: 'admin', role_id: 2 }],
                scopes: [{ id: 10, slug: 'acme', display_name: 'Acme', visibility: 'public', member_count: 1, team_count: 0 }],
                roles: [{ id: 2, org_id: 1, slug: 'admin', name: 'Admin', permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1 }],
                available_permissions: ['org.settings'],
            });

            const dto = await service.get_by_id({ org_id: 1 }, 'jwt');

            expect(dto.slug).toBe('acme');
            expect(dto.members).toHaveLength(1);
            expect(dto.members[0].role_id).toBe(2);
            expect(dto.scopes).toHaveLength(1);
            expect(dto.roles).toHaveLength(1);
            expect(dto.available_permissions).toEqual(['org.settings']);
        });
    });

    describe('update', () => {
        it('maps update VO to DTO', async () => {
            mock_repo.update.mockResolvedValue({ updated: true });

            const dto = await service.update({ org_id: 1, display_name: 'New' }, 'jwt');

            expect(dto.updated).toBe(true);
        });
    });

    describe('leave', () => {
        it('maps leave VO to DTO', async () => {
            mock_repo.leave.mockResolvedValue({ left: true });

            const dto = await service.leave({ org_id: 1 }, 'jwt');

            expect(dto.left).toBe(true);
        });
    });

    describe('add_member', () => {
        it('maps add member VO to DTO', async () => {
            mock_repo.add_member.mockResolvedValue({
                user_id: 3, username: 'bob', role: 'member',
            });

            const dto = await service.add_member({ org_id: 1, username: 'bob' }, 'jwt');

            expect(dto.username).toBe('bob');
            expect(dto.role).toBe('member');
        });
    });

    describe('remove_member', () => {
        it('maps remove member VO to DTO', async () => {
            mock_repo.remove_member.mockResolvedValue({ removed: true });

            const dto = await service.remove_member({ org_id: 1, user_id: 3 }, 'jwt');

            expect(dto.removed).toBe(true);
        });
    });

    describe('list_roles', () => {
        it('maps roles list VO to DTO', async () => {
            mock_repo.list_roles.mockResolvedValue({
                roles: [{
                    id: 2, org_id: 1, slug: 'admin', name: 'Admin',
                    permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
                }],
            });

            const dto = await service.list_roles({ org_id: 1 }, 'jwt');

            expect(dto.roles).toHaveLength(1);
            expect(dto.roles[0].slug).toBe('admin');
        });
    });

    describe('update_user_role', () => {
        it('maps update user role VO to DTO', async () => {
            mock_repo.update_user_role.mockResolvedValue({
                user_id: 3, org_id: 1, role_id: 2, role_slug: 'admin', role: 'admin',
            });

            const dto = await service.update_user_role(
                { user_id: 3, org_id: 1, role_id: 2 }, 'jwt',
            );

            expect(dto.role_id).toBe(2);
            expect(dto.role_slug).toBe('admin');
        });
    });

    describe('delete_role', () => {
        it('maps delete role VO to DTO', async () => {
            mock_repo.delete_role.mockResolvedValue({ deleted: true });

            const dto = await service.delete_role({ org_id: 1, role_id: 10 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });

    describe('new_scope', () => {
        it('maps new scope VO to DTO', async () => {
            mock_repo.new_scope.mockResolvedValue({ id: 20, slug: 'acme-labs' });

            const dto = await service.new_scope(
                { org_id: 1, slug: 'acme-labs', visibility: 'private' }, 'jwt',
            );

            expect(dto.id).toBe(20);
            expect(dto.slug).toBe('acme-labs');
        });
    });

    describe('delete_scope', () => {
        it('maps delete scope VO to DTO', async () => {
            mock_repo.delete_scope.mockResolvedValue({ deleted: true });

            const dto = await service.delete_scope({ org_id: 1, scope_id: 11 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });

    describe('assign_scope_member', () => {
        it('maps assign VO to DTO', async () => {
            mock_repo.assign_scope_member.mockResolvedValue({ assigned: true });

            const dto = await service.assign_scope_member(
                { org_id: 1, scope_id: 10, user_id: 3 }, 'jwt',
            );

            expect(dto.assigned).toBe(true);
        });
    });

    describe('unassign_scope_member', () => {
        it('maps unassign VO to DTO', async () => {
            mock_repo.unassign_scope_member.mockResolvedValue({ removed: true });

            const dto = await service.unassign_scope_member(
                { org_id: 1, scope_id: 10, user_id: 3 }, 'jwt',
            );

            expect(dto.removed).toBe(true);
        });
    });
});
