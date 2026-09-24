import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../../src/services/admin_service.js';

describe('AdminService', () => {
    const mock_repo = {
        audit: vi.fn(),
        get_users: vi.fn(),
        get_user: vi.fn(),
        new_user: vi.fn(),
        update_user: vi.fn(),
        suspend_user: vi.fn(),
        unsuspend_user: vi.fn(),
        delete_user: vi.fn(),
        set_user_role: vi.fn(),
        reset_user_password: vi.fn(),
        get_teams: vi.fn(),
        set_team_listed: vi.fn(),
        get_scopes: vi.fn(),
        new_scope: vi.fn(),
        update_scope: vi.fn(),
        delete_scope: vi.fn(),
        get_orgs: vi.fn(),
        new_org: vi.fn(),
        delete_org: vi.fn(),
    };

    const service = new AdminService(mock_repo as any);

    beforeEach(() => vi.clearAllMocks());

    describe('audit', () => {
        it('maps VO to DTO with entries', async () => {
            mock_repo.audit.mockResolvedValue({
                entries: [
                    { id: 1, admin_id: 99, admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' },
                ],
                total: 1, limit: 50, offset: 0,
            });

            const dto = await service.audit({}, 'jwt');

            expect(dto.entries).toHaveLength(1);
            expect(dto.entries[0].action).toBe('user.suspend');
            expect(dto.total).toBe(1);
        });
    });

    describe('get_users', () => {
        it('returns mapped user list', async () => {
            mock_repo.get_users.mockResolvedValue({
                users: [{ id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01' }],
                total: 1,
            });

            const dto = await service.get_users({ limit: 20, offset: 0 }, 'jwt');

            expect(dto.users).toHaveLength(1);
            expect(dto.total).toBe(1);
        });
    });

    describe('get_user', () => {
        it('returns mapped user detail', async () => {
            mock_repo.get_user.mockResolvedValue({
                id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                scope_count: 2, team_count: 3, token_count: 1, draft_count: 0, orgs: [],
            });

            const dto = await service.get_user({ user_id: 1 }, 'jwt');

            expect(dto.username).toBe('alice');
            expect(dto.scope_count).toBe(2);
        });
    });

    describe('new_user', () => {
        it('returns mapped created user', async () => {
            mock_repo.new_user.mockResolvedValue({
                id: 10, username: 'bob', display_name: 'Bob', email: 'bob@test.com',
                role: 'user', suspended_at: null, created_at: '2025-06-01',
            });

            const dto = await service.new_user(
                { username: 'bob', email: 'bob@test.com', password: 'securepass' }, 'jwt',
            );

            expect(dto.username).toBe('bob');
        });
    });

    describe('update_user', () => {
        it('returns mapped update result', async () => {
            mock_repo.update_user.mockResolvedValue({ updated: true });

            const dto = await service.update_user({ user_id: 1, display_name: 'Alice W' }, 'jwt');

            expect(dto.updated).toBe(true);
        });
    });

    describe('suspend_user', () => {
        it('returns mapped suspend result', async () => {
            mock_repo.suspend_user.mockResolvedValue({ suspended: true });

            const dto = await service.suspend_user({ user_id: 5, reason: 'spam' }, 'jwt');

            expect(dto.suspended).toBe(true);
        });
    });

    describe('unsuspend_user', () => {
        it('returns mapped unsuspend result', async () => {
            mock_repo.unsuspend_user.mockResolvedValue({ suspended: false });

            const dto = await service.unsuspend_user({ user_id: 5 }, 'jwt');

            expect(dto.suspended).toBe(false);
        });
    });

    describe('delete_user', () => {
        it('returns mapped delete result', async () => {
            mock_repo.delete_user.mockResolvedValue({ deleted: true });

            const dto = await service.delete_user({ user_id: 5 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });

    describe('set_user_role', () => {
        it('returns mapped role result', async () => {
            mock_repo.set_user_role.mockResolvedValue({ role: 'admin' });

            const dto = await service.set_user_role({ user_id: 1, role: 'admin' }, 'jwt');

            expect(dto.role).toBe('admin');
        });
    });

    describe('reset_user_password', () => {
        it('returns mapped reset result', async () => {
            mock_repo.reset_user_password.mockResolvedValue({ reset: true });

            const dto = await service.reset_user_password({ user_id: 1, new_password: 'newpass123' }, 'jwt');

            expect(dto.reset).toBe(true);
        });
    });

    describe('get_teams', () => {
        it('returns mapped team list', async () => {
            mock_repo.get_teams.mockResolvedValue({
                teams: [{ id: 1, name: 'tdd-git', scope: 'cliq', listed: true }],
                total: 1, limit: 20, offset: 0,
            });

            const dto = await service.get_teams({ limit: 20, offset: 0 }, 'jwt');

            expect(dto.teams).toHaveLength(1);
            expect(dto.total).toBe(1);
        });
    });

    describe('set_team_listed', () => {
        it('returns mapped listed result', async () => {
            mock_repo.set_team_listed.mockResolvedValue({ listed: true });

            const dto = await service.set_team_listed({ team_id: 1, listed: true }, 'jwt');

            expect(dto.listed).toBe(true);
        });
    });

    describe('get_scopes', () => {
        it('returns mapped scope list', async () => {
            mock_repo.get_scopes.mockResolvedValue({
                scopes: [{ id: 1, slug: 'alice', display_name: 'Alice', owner_id: 1, owner_username: 'alice', visibility: 'public', scope_type: 'user', team_count: 3, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const dto = await service.get_scopes({ limit: 20, offset: 0 }, 'jwt');

            expect(dto.scopes).toHaveLength(1);
            expect(dto.total).toBe(1);
        });
    });

    describe('new_scope', () => {
        it('returns mapped created scope', async () => {
            mock_repo.new_scope.mockResolvedValue({ id: 10, slug: 'newscope' });

            const dto = await service.new_scope(
                { slug: 'newscope', owner_id: 1, visibility: 'public', scope_type: 'user' }, 'jwt',
            );

            expect(dto.slug).toBe('newscope');
        });
    });

    describe('update_scope', () => {
        it('returns mapped update result', async () => {
            mock_repo.update_scope.mockResolvedValue({ updated: true });

            const dto = await service.update_scope({ scope_id: 1, visibility: 'private' }, 'jwt');

            expect(dto.updated).toBe(true);
        });
    });

    describe('delete_scope', () => {
        it('returns mapped delete result', async () => {
            mock_repo.delete_scope.mockResolvedValue({ deleted: true });

            const dto = await service.delete_scope({ scope_id: 1 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });

    describe('get_orgs', () => {
        it('returns mapped org list', async () => {
            mock_repo.get_orgs.mockResolvedValue({
                orgs: [{ id: 1, slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01' }],
                total: 1, limit: 20, offset: 0,
            });

            const dto = await service.get_orgs({ limit: 20, offset: 0 }, 'jwt');

            expect(dto.orgs).toHaveLength(1);
            expect(dto.total).toBe(1);
        });
    });

    describe('new_org', () => {
        it('returns mapped created org', async () => {
            mock_repo.new_org.mockResolvedValue({ id: 5, slug: 'acme' });

            const dto = await service.new_org(
                { slug: 'acme', admin_username: 'alice' }, 'jwt',
            );

            expect(dto.slug).toBe('acme');
        });
    });

    describe('delete_org', () => {
        it('returns mapped delete result', async () => {
            mock_repo.delete_org.mockResolvedValue({ deleted: true });

            const dto = await service.delete_org({ org_id: 1 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });
});
