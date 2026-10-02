import { describe, it, expect } from 'vitest';
import {
    to_scope_data, to_org_list_item_data, to_orgs_get_data, to_orgs_get_all_data, to_orgs_new_data,
    to_orgs_delete_data, to_org_member_data, to_org_role_data, to_org_detail_data,
    to_orgs_update_data, to_orgs_leave_data, to_orgs_remove_member_data,
    to_orgs_list_roles_data, to_orgs_role_data, to_orgs_delete_role_data, to_orgs_new_scope_data,
    to_orgs_update_scope_data, to_orgs_delete_scope_data, to_orgs_assign_scope_member_data,
    to_orgs_unassign_scope_member_data, to_orgs_get_scopes_data,
} from '../../../src/mappers/orgs_mapper.js';
import type { ScopeVO, OrgRoleVO } from '../../../src/types/core/orgs.js';

const SAMPLE_SCOPE: ScopeVO = {
    id: 'scope-uuid-1',
    slug: 'alice',
    display_name: 'Alice',
    owner_id: 'user-uuid-1',
    org_id: null,
    visibility: 'public',
    scope_type: 'user',
    created_at: '2025-01-01T00:00:00Z',
};

const ROLE: OrgRoleVO = {
    id: 'role-uuid-2', org_id: 'org-uuid-1', slug: 'admin', name: 'Admin',
    permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
};

describe('to_scope_data', () => {
    it('maps scope fields and excludes created_at', () => {
        const data = to_scope_data(SAMPLE_SCOPE);
        expect(data).toEqual({
            id: 'scope-uuid-1',
            slug: 'alice',
            display_name: 'Alice',
            owner_id: 'user-uuid-1',
            org_id: null,
            visibility: 'public',
            scope_type: 'user',
        });
        expect(data).not.toHaveProperty('created_at');
    });
});

describe('to_org_list_item_data', () => {
    it('maps all fields', () => {
        const vo = {
            id: 'org-uuid-1', slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 3, scope_count: 2,
            status: 'waiting_for_owner' as const, owner: { username: null, status: 'invited' as const }, deleted_at: null,
        };
        expect(to_org_list_item_data(vo)).toEqual(vo);
    });

    it('a missing deleted_at becomes null; no owner stays null', () => {
        const vo = { id: 'o', slug: 's', display_name: 'S', role: 'member', member_count: 1, scope_count: 0, status: 'active' as const, owner: null } as unknown as Parameters<typeof to_org_list_item_data>[0];
        expect(to_org_list_item_data(vo)).toMatchObject({ status: 'active', owner: null, deleted_at: null });
    });
});

describe('to_orgs_get_data', () => {
    it('maps list of orgs', () => {
        const data = to_orgs_get_data({
            orgs: [{ id: 'org-uuid-1', slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 3, scope_count: 2, status: 'active', owner: { username: 'sapan', status: 'active' }, deleted_at: null }],
        });
        expect(data.orgs).toHaveLength(1);
        expect(data.orgs[0].slug).toBe('acme');
    });
});

describe('to_orgs_get_all_data', () => {
    it('maps orgs and pagination', () => {
        const data = to_orgs_get_all_data({
            orgs: [{
                id: 'org-uuid-1', slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01',
                status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null,
            }],
            total: 1, limit: 20, offset: 0,
        }, ['slug']);
        expect(data.orgs).toHaveLength(1);
        expect(data.orgs[0]).toEqual({
            id: 'org-uuid-1', slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01',
            status: 'waiting_for_owner', owner: { username: null, status: 'invited' }, deleted_at: null,
        });
        expect(data.sortable).toEqual(['slug']);
        expect(data.total).toBe(1);
        expect(data.limit).toBe(20);
        expect(data.offset).toBe(0);
    });

    it('handles empty orgs', () => {
        const data = to_orgs_get_all_data({ orgs: [], total: 0, limit: 20, offset: 0 }, []);
        expect(data.orgs).toHaveLength(0);
    });

    it('keeps a deleted org with no owner', () => {
        const data = to_orgs_get_all_data({
            orgs: [{
                id: 'o', slug: 'gone', display_name: 'Gone', member_count: 0, scope_count: 0, created_at: '2025-01-01',
                status: 'deleted', owner: null, deleted_at: '2026-10-02T11:00:00Z',
            }],
            total: 1, limit: 20, offset: 0,
        }, []);
        expect(data.orgs[0]).toMatchObject({ status: 'deleted', owner: null, deleted_at: '2026-10-02T11:00:00Z' });
    });
});

describe('to_orgs_new_data', () => {
    const vo = {
        org: {
            id: 'org-uuid-1', slug: 'measureone', display_name: 'MeasureOne', status: 'waiting_for_owner' as const,
            owner: { user_id: 'user-uuid-1', email: 'sapan@example.test', status: 'invited' as const },
            created_at: '2026-10-02T10:12:00Z', reactivated: false,
        },
        owner_invite: {
            invite_id: 'inv-uuid-1', role: 'owner' as const, status: 'pending' as const,
            expires_at: '2026-10-16T10:12:00Z', email_sent: true, invite_url: null,
        },
    };

    it('maps the org, its owner and the owner invite', () => {
        expect(to_orgs_new_data(vo)).toEqual(vo);
    });

    it('carries invite_url when the email could not be sent', () => {
        const data = to_orgs_new_data({ ...vo, owner_invite: { ...vo.owner_invite, email_sent: false, invite_url: 'https://app.example.test/invite/x' } });
        expect(data.owner_invite).toMatchObject({ email_sent: false, invite_url: 'https://app.example.test/invite/x' });
    });
});

describe('to_orgs_delete_data', () => {
    it('maps the id and deleted_at', () => {
        expect(to_orgs_delete_data({ id: 'org-uuid-1', deleted_at: '2026-10-02T11:00:00Z' }))
            .toEqual({ id: 'org-uuid-1', deleted_at: '2026-10-02T11:00:00Z' });
    });
});

describe('to_org_member_data', () => {
    const MEMBER = {
        user_id: 'u', username: 'alice', display_name: 'Alice', email: 'alice@example.test', role: 'member', role_id: null,
        status: 'active' as const, invited_at: null, joined_at: '2026-01-01T00:00:00.000Z', deleted_at: null,
    };

    it('maps an active member', () => {
        expect(to_org_member_data(MEMBER)).toEqual(MEMBER);
    });

    it('email is null when Core leaves it out (a plain member\'s view)', () => {
        const { email: _email, ...plain } = MEMBER;
        expect(to_org_member_data(plain)).toEqual({ ...MEMBER, email: null });
    });

    it('maps a pending member invited by email (no username yet) and a former member', () => {
        expect(to_org_member_data({
            ...MEMBER, username: null, display_name: 'Priya', email: 'priya@example.test', role: 'admin', role_id: 'role-owner',
            status: 'pending', invited_at: '2026-10-02T10:20:00.000Z', joined_at: null,
        })).toMatchObject({ username: null, role_id: 'role-owner', status: 'pending', invited_at: '2026-10-02T10:20:00.000Z', joined_at: null });
        expect(to_org_member_data({
            ...MEMBER, username: 'bob', status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z',
        })).toMatchObject({ status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z' });
    });
});

describe('to_org_role_data', () => {
    it('defaults missing permissions to []', () => {
        const data = to_org_role_data({ ...ROLE, permissions: undefined as unknown as string[] });
        expect(data.permissions).toEqual([]);
    });
});

describe('to_org_detail_data', () => {
    const DETAIL = {
        id: 'org-uuid-1', slug: 'acme', display_name: 'Acme', created_at: '2025-01-01T00:00:00.000Z', my_role: 'admin',
        status: 'active' as const, owner: { user_id: 'user-uuid-1', username: 'alice', status: 'active' as const }, deleted_at: null,
        pending_owner_invite: null,
        members: [{
            user_id: 'user-uuid-1', username: 'alice', display_name: 'Alice', email: 'alice@example.test', role: 'admin', role_id: 'role-uuid-2',
            status: 'active' as const, invited_at: null, joined_at: '2025-01-01T00:00:00.000Z', deleted_at: null,
        }],
        scopes: [{ id: 'scope-uuid-10', slug: 'acme', display_name: 'Acme', visibility: 'public', member_count: 1, team_count: 0 }],
        roles: [ROLE],
        available_permissions: ['org.settings', 'org.members.manage'],
        owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
    };

    it('maps org detail with members, scopes, roles and the permission catalog', () => {
        const data = to_org_detail_data(DETAIL);
        expect(data.my_role).toBe('admin');
        expect(data.status).toBe('active');
        expect(data.owner).toEqual({ user_id: 'user-uuid-1', username: 'alice', status: 'active' });
        expect(data.deleted_at).toBeNull();
        expect(data.pending_owner_invite).toBeNull();
        expect(data.members).toHaveLength(1);
        expect(data.members[0]).toMatchObject({ username: 'alice', status: 'active', role_id: 'role-uuid-2' });
        expect(data.scopes).toHaveLength(1);
        expect(data.roles).toHaveLength(1);
        expect(data.available_permissions).toEqual(['org.settings', 'org.members.manage']);
        expect(data.owner_only_permissions).toEqual(['org.delete', 'org.transfer', 'rules.manage']);
    });

    it('waiting for an owner invited by email: owner without username, the pending owner invite', () => {
        const pending_owner_invite = { invite_id: 'inv-1', email: 'priya@example.test', expires_at: '2026-10-16T10:12:00.000Z' };
        const data = to_org_detail_data({
            ...DETAIL, status: 'waiting_for_owner', owner: { user_id: 'user-uuid-9', username: null, status: 'invited' }, pending_owner_invite,
        });
        expect(data).toMatchObject({ status: 'waiting_for_owner', owner: { user_id: 'user-uuid-9', username: null, status: 'invited' }, pending_owner_invite });
    });
});

describe('flag and small mappers', () => {
    it('to_orgs_update_data', () => {
        expect(to_orgs_update_data({ updated: true })).toEqual({ updated: true });
    });

    it('to_orgs_leave_data', () => {
        expect(to_orgs_leave_data({ left: true })).toEqual({ left: true });
    });

    it('to_orgs_remove_member_data', () => {
        expect(to_orgs_remove_member_data({ removed: true })).toEqual({ removed: true });
    });

    it('to_orgs_delete_role_data', () => {
        expect(to_orgs_delete_role_data({ deleted: true })).toEqual({ deleted: true });
    });

    it('to_orgs_new_scope_data maps id and slug', () => {
        expect(to_orgs_new_scope_data({ id: 'scope-uuid-20', slug: 'acme-labs' })).toEqual({ id: 'scope-uuid-20', slug: 'acme-labs' });
    });

    it('to_orgs_update_scope_data', () => {
        expect(to_orgs_update_scope_data({ updated: true })).toEqual({ updated: true });
    });

    it('to_orgs_delete_scope_data', () => {
        expect(to_orgs_delete_scope_data({ deleted: true })).toEqual({ deleted: true });
    });

    it('to_orgs_assign_scope_member_data', () => {
        expect(to_orgs_assign_scope_member_data({ assigned: true })).toEqual({ assigned: true });
    });

    it('to_orgs_unassign_scope_member_data', () => {
        expect(to_orgs_unassign_scope_member_data({ removed: true })).toEqual({ removed: true });
    });
});

describe('to_orgs_list_roles_data / to_orgs_role_data', () => {
    it('maps roles', () => {
        const data = to_orgs_list_roles_data({ roles: [ROLE] });
        expect(data.roles).toHaveLength(1);
        expect(data.roles[0].slug).toBe('admin');
    });

    it('defaults missing roles to []', () => {
        expect(to_orgs_list_roles_data({} as any)).toEqual({ roles: [] });
    });

    it('wraps one role', () => {
        expect(to_orgs_role_data({ role: ROLE }).role).toEqual({ ...ROLE, created_at: undefined });
    });
});

describe('to_orgs_get_scopes_data', () => {
    it('maps the paged list', () => {
        const item = {
            id: 's', slug: 'acme', display_name: null, visibility: 'public' as const, scope_type: 'org' as const,
            owner_id: 'u', org_id: 'o', created_at: '2025-01-01',
        };
        const data = to_orgs_get_scopes_data({ items: [item], total: 1, offset: 0, limit: 20 });
        expect(data).toEqual({ items: [item], total: 1, offset: 0, limit: 20 });
        expect(data.items[0]).not.toBe(item);
    });
});
