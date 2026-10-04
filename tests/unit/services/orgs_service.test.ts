import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrgsService } from '../../../src/services/orgs_service.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const ORG_1 = hub_legacy_uuid(1);
const USER_1 = hub_legacy_uuid(11);
const USER_3 = hub_legacy_uuid(13);
const ROLE_2 = hub_legacy_uuid(22);
const ROLE_10 = hub_legacy_uuid(30);
const SCOPE_10 = hub_legacy_uuid(40);
const SCOPE_11 = hub_legacy_uuid(41);

const ROLE_VO = {
    id: ROLE_2, org_id: ORG_1, slug: 'admin', name: 'Admin',
    permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
};

describe('OrgsService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_all: vi.fn(),
        new: vi.fn(),
        delete: vi.fn(),
        get_by_id: vi.fn(),
        update: vi.fn(),
        leave: vi.fn(),
        remove_member: vi.fn(),
        list_roles: vi.fn(),
        get_role: vi.fn(),
        create_role: vi.fn(),
        update_role: vi.fn(),
        delete_role: vi.fn(),
        new_scope: vi.fn(),
        update_scope: vi.fn(),
        delete_scope: vi.fn(),
        assign_scope_member: vi.fn(),
        unassign_scope_member: vi.fn(),
        get_scopes: vi.fn(),
    };

    let service: OrgsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new OrgsService(mock_repo as any);
    });

    describe('get', () => {
        it('maps the caller\'s orgs', async () => {
            mock_repo.get.mockResolvedValue({
                orgs: [{ id: ORG_1, slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 3, scope_count: 2, status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null }],
            });

            const data = await service.get({ mine: true }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ mine: true }, 'jwt');
            expect(data.orgs).toHaveLength(1);
            expect(data.orgs[0]).toEqual({ id: ORG_1, slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 3, scope_count: 2, status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null });
        });
    });

    describe('get_all', () => {
        it('maps every org with pagination (site admin)', async () => {
            mock_repo.get_all.mockResolvedValue({
                orgs: [{
                    id: ORG_1, slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01',
                    status: 'active', owner: { username: 'alice', status: 'active' }, deleted_at: null,
                }],
                total: 1, limit: 20, offset: 0,
            });

            const data = await service.get_all({ limit: 20, offset: 0 }, 'jwt');

            expect(mock_repo.get_all).toHaveBeenCalledWith({ limit: 20, offset: 0 }, 'jwt');
            expect(data.orgs).toHaveLength(1);
            expect(data.orgs[0].slug).toBe('acme');
            expect(data).toMatchObject({ total: 1, limit: 20, offset: 0 });
        });

        it('forwards the status filter and include_deleted', async () => {
            mock_repo.get_all.mockResolvedValue({ orgs: [], total: 0, limit: 20, offset: 0 });
            await service.get_all({ status: 'waiting_for_owner', include_deleted: true }, 'jwt');
            expect(mock_repo.get_all).toHaveBeenCalledWith({ status: 'waiting_for_owner', include_deleted: true }, 'jwt');
        });
    });

    describe('get_all — search and sort in Core\'s names', () => {
        const PAGE = { orgs: [], total: 0, limit: 25, offset: 0 };

        it.each([['slug', 'acme'], ['display name', 'Acme Corp']])('search by %s → Core `query`', async (_w, term) => {
            mock_repo.get_all.mockResolvedValue(PAGE);
            await service.get_all({ search: term, limit: 25, offset: 0 }, 'jwt');
            expect(mock_repo.get_all).toHaveBeenCalledWith({ query: term, limit: 25, offset: 0 }, 'jwt');
        });

        it('`query` wins over `search`; sort is held back while Core cannot sort orgs', async () => {
            mock_repo.get_all.mockResolvedValue(PAGE);
            const data = await service.get_all({ query: 'acme', search: 'other', sort_by: 'slug', sort_dir: 'asc' }, 'jwt');
            expect(mock_repo.get_all).toHaveBeenCalledWith({ query: 'acme' }, 'jwt');
            expect(data.sortable).toEqual([]);
        });
    });

    describe('get_all — sort on Core API 6', () => {
        const compat = (api_version: number) => ({ api_version: vi.fn().mockResolvedValue(api_version) }) as never;

        it('Core API 6: sort_by / sort_dir reach Core and every column is sortable', async () => {
            mock_repo.get_all.mockResolvedValue({ orgs: [], total: 0, limit: 25, offset: 0 });
            const data = await new OrgsService(mock_repo as never, compat(6)).get_all({ search: 'acme', sort_by: 'member_count', sort_dir: 'desc', limit: 25, offset: 0 }, 'jwt');
            expect(mock_repo.get_all).toHaveBeenCalledWith({ query: 'acme', limit: 25, offset: 0, sort_by: 'member_count', sort_dir: 'desc' }, 'jwt');
            expect(data.sortable).toEqual(['slug', 'display_name', 'member_count', 'scope_count', 'created_at']);
        });

        it('Core API 5: the sort is held back and nothing is offered', async () => {
            mock_repo.get_all.mockResolvedValue({ orgs: [], total: 0, limit: 25, offset: 0 });
            const data = await new OrgsService(mock_repo as never, compat(5)).get_all({ sort_by: 'slug', sort_dir: 'asc' }, 'jwt');
            expect(mock_repo.get_all).toHaveBeenCalledWith({}, 'jwt');
            expect(data.sortable).toEqual([]);
        });
    });

    describe('get_scopes — search in Core\'s names', () => {
        it('search → query', async () => {
            mock_repo.get_scopes.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 100 });
            await service.get_scopes({ user_id: USER_1, search: 'pub', limit: 100 }, 'jwt');
            expect(mock_repo.get_scopes).toHaveBeenCalledWith({ user_id: USER_1, query: 'pub', limit: 100 }, 'jwt');
        });
    });

    describe('new', () => {
        it('sends the owner object and maps the org with its owner invite', async () => {
            const vo = {
                org: {
                    id: ORG_1, slug: 'acme', display_name: 'Acme', status: 'waiting_for_owner',
                    owner: { user_id: USER_3, email: 'bob@example.test', status: 'invited' },
                    created_at: '2026-10-02T10:12:00Z', reactivated: false,
                },
                owner_invite: {
                    invite_id: 'inv-1', role: 'owner', status: 'pending',
                    expires_at: '2026-10-16T10:12:00Z', email_sent: true, invite_url: null,
                },
            };
            mock_repo.new.mockResolvedValue(vo);

            const input = { slug: 'acme', display_name: 'Acme', owner: { email: 'bob@example.test' }, reactivate: false };
            const data = await service.new(input, 'jwt');

            expect(mock_repo.new).toHaveBeenCalledWith(input, 'jwt');
            expect(data).toEqual(vo);
        });
    });

    describe('delete', () => {
        it('maps the delete result', async () => {
            mock_repo.delete.mockResolvedValue({ id: ORG_1, deleted_at: '2026-10-02T11:00:00Z' });

            const data = await service.delete({ org_id: ORG_1 }, 'jwt');

            expect(mock_repo.delete).toHaveBeenCalledWith({ org_id: ORG_1 }, 'jwt');
            expect(data).toEqual({ id: ORG_1, deleted_at: '2026-10-02T11:00:00Z' });
        });
    });

    describe('get_by_id', () => {
        it('maps detail with members, scopes, roles and permissions', async () => {
            mock_repo.get_by_id.mockResolvedValue({
                id: ORG_1, slug: 'acme', display_name: 'Acme',
                created_at: '2025-01-01', my_role: 'admin',
                members: [{ user_id: USER_1, username: 'alice', display_name: 'Alice', role: 'admin', role_id: ROLE_2 }],
                scopes: [{ id: SCOPE_10, slug: 'acme', display_name: 'Acme', visibility: 'public', member_count: 1, team_count: 0 }],
                roles: [ROLE_VO],
                available_permissions: ['org.settings'],
            });

            const data = await service.get_by_id({ org_id: ORG_1 }, 'jwt');

            expect(mock_repo.get_by_id).toHaveBeenCalledWith({ org_id: ORG_1 }, 'jwt');
            expect(data.slug).toBe('acme');
            expect(data.members).toHaveLength(1);
            expect(data.members[0].role_id).toBe(ROLE_2);
            expect(data.scopes).toHaveLength(1);
            expect(data.roles).toHaveLength(1);
            expect(data.available_permissions).toEqual(['org.settings']);
        });
    });

    describe('update', () => {
        it('maps update result', async () => {
            mock_repo.update.mockResolvedValue({ updated: true });

            const data = await service.update({ org_id: ORG_1, display_name: 'New' }, 'jwt');

            expect(mock_repo.update).toHaveBeenCalledWith({ org_id: ORG_1, display_name: 'New' }, 'jwt');
            expect(data).toEqual({ updated: true });
        });
    });

    describe('leave', () => {
        it('maps leave result', async () => {
            mock_repo.leave.mockResolvedValue({ left: true });

            const data = await service.leave({ org_id: ORG_1 }, 'jwt');

            expect(data).toEqual({ left: true });
        });
    });

    describe('remove_member', () => {
        it('maps remove member result', async () => {
            mock_repo.remove_member.mockResolvedValue({ removed: true });

            const data = await service.remove_member({ org_id: ORG_1, user_id: USER_3 }, 'jwt');

            expect(data).toEqual({ removed: true });
        });
    });

    describe('list_roles', () => {
        it('maps roles list', async () => {
            mock_repo.list_roles.mockResolvedValue({ roles: [ROLE_VO] });

            const data = await service.list_roles({ org_id: ORG_1 }, 'jwt');

            expect(data.roles).toHaveLength(1);
            expect(data.roles[0].slug).toBe('admin');
            expect(data.roles[0].permissions).toEqual(['org.settings']);
        });
    });

    describe('get_role / create_role / update_role', () => {
        it('get_role wraps the mapped role', async () => {
            mock_repo.get_role.mockResolvedValue({ role: ROLE_VO });

            const data = await service.get_role({ org_id: ORG_1, role_id: ROLE_2 }, 'jwt');

            expect(mock_repo.get_role).toHaveBeenCalledWith({ org_id: ORG_1, role_id: ROLE_2 }, 'jwt');
            expect(data.role.id).toBe(ROLE_2);
        });

        it('create_role forwards the body and wraps the role', async () => {
            mock_repo.create_role.mockResolvedValue({ role: { ...ROLE_VO, slug: 'custom', name: 'Custom' } });
            const input = { org_id: ORG_1, slug: 'custom', name: 'Custom', permissions: ['org.settings'] };

            const data = await service.create_role(input, 'jwt');

            expect(mock_repo.create_role).toHaveBeenCalledWith(input, 'jwt');
            expect(data.role.slug).toBe('custom');
        });

        it('update_role forwards the body and wraps the role', async () => {
            mock_repo.update_role.mockResolvedValue({ role: { ...ROLE_VO, name: 'Renamed' } });
            const input = { org_id: ORG_1, role_id: ROLE_2, name: 'Renamed' };

            const data = await service.update_role(input, 'jwt');

            expect(mock_repo.update_role).toHaveBeenCalledWith(input, 'jwt');
            expect(data.role.name).toBe('Renamed');
        });
    });

    describe('delete_role', () => {
        it('maps delete role result', async () => {
            mock_repo.delete_role.mockResolvedValue({ deleted: true });

            const data = await service.delete_role({ org_id: ORG_1, role_id: ROLE_10 }, 'jwt');

            expect(data).toEqual({ deleted: true });
        });
    });

    describe('new_scope', () => {
        it('maps new scope result', async () => {
            mock_repo.new_scope.mockResolvedValue({ id: SCOPE_10, slug: 'acme-labs' });

            const data = await service.new_scope({ org_id: ORG_1, slug: 'acme-labs', visibility: 'private' }, 'jwt');

            expect(mock_repo.new_scope).toHaveBeenCalledWith({ org_id: ORG_1, slug: 'acme-labs', visibility: 'private' }, 'jwt');
            expect(data).toEqual({ id: SCOPE_10, slug: 'acme-labs' });
        });
    });

    describe('update_scope', () => {
        it('maps update scope result', async () => {
            mock_repo.update_scope.mockResolvedValue({ updated: true });

            const data = await service.update_scope({ org_id: ORG_1, scope_id: SCOPE_10, visibility: 'public' }, 'jwt');

            expect(data).toEqual({ updated: true });
        });
    });

    describe('delete_scope', () => {
        it('maps delete scope result', async () => {
            mock_repo.delete_scope.mockResolvedValue({ deleted: true });

            const data = await service.delete_scope({ org_id: ORG_1, scope_id: SCOPE_11 }, 'jwt');

            expect(data).toEqual({ deleted: true });
        });
    });

    describe('assign_scope_member', () => {
        it('maps assign result', async () => {
            mock_repo.assign_scope_member.mockResolvedValue({ assigned: true });

            const data = await service.assign_scope_member({ org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt');

            expect(data).toEqual({ assigned: true });
        });
    });

    describe('unassign_scope_member', () => {
        it('maps unassign result', async () => {
            mock_repo.unassign_scope_member.mockResolvedValue({ removed: true });

            const data = await service.unassign_scope_member({ org_id: ORG_1, scope_id: SCOPE_10, user_id: USER_3 }, 'jwt');

            expect(data).toEqual({ removed: true });
        });
    });

    describe('get_scopes', () => {
        it('maps the paged scope list', async () => {
            const scope = {
                id: SCOPE_10, slug: 'acme', display_name: 'Acme', visibility: 'public', scope_type: 'org',
                owner_id: USER_1, org_id: ORG_1, created_at: '2025-01-01',
            };
            mock_repo.get_scopes.mockResolvedValue({ items: [scope], total: 1, offset: 0, limit: 20 });

            const data = await service.get_scopes({ user_id: USER_1 }, 'jwt');

            expect(mock_repo.get_scopes).toHaveBeenCalledWith({ user_id: USER_1 }, 'jwt');
            expect(data).toEqual({ items: [scope], total: 1, offset: 0, limit: 20 });
        });
    });
});
