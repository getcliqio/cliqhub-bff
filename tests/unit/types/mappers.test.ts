import { describe, it, expect } from 'vitest';
import {
    to_user_dto, to_scope_dto, to_me_response_dto, to_token_dto,
    to_team_list_item_dto, to_team_detail_dto, to_team_version_dto,
    to_team_list_response_dto, to_team_search_response_dto, to_team_download_response_dto,
    to_publish_result_dto, to_delete_team_result_dto,
    to_rename_team_result_dto, to_toggle_listed_result_dto,
    to_my_teams_list_response_dto, to_my_teams_all_response_dto,
    to_latest_version_response_dto,
    to_draft_list_item_dto, to_draft_detail_dto,
    to_builder_generate_response_dto, to_builder_generate_status_dto, to_builder_improve_role_response_dto,
    to_builder_validate_response_dto, to_builder_chat_response_dto,
    to_org_list_item_dto, to_org_list_response_dto, to_org_detail_dto,
    to_org_update_response_dto, to_org_leave_response_dto,
    to_org_add_member_response_dto, to_org_remove_member_response_dto,
    to_users_update_role_response_dto, to_org_delete_role_response_dto,
    to_org_create_scope_response_dto, to_org_delete_scope_response_dto,
    to_org_assign_scope_member_response_dto, to_org_unassign_scope_member_response_dto,
    to_update_profile_response_dto, to_change_password_response_dto,
        to_audit_log_response_dto,
    to_draft_list_response_dto, to_draft_save_response_dto, to_draft_delete_response_dto,
    to_admin_user_list_response_dto, to_admin_user_detail_dto,
    to_admin_create_user_response_dto, to_admin_update_user_response_dto,
    to_admin_suspend_user_response_dto,
    to_admin_delete_user_response_dto,
    to_admin_set_user_role_response_dto,
    to_admin_reset_user_password_response_dto,
    to_admin_team_list_response_dto,
    to_admin_set_team_listed_response_dto,
    to_admin_scope_list_response_dto,
    to_admin_create_scope_response_dto,
    to_admin_update_scope_response_dto,
    to_admin_delete_scope_response_dto,
    to_admin_org_list_response_dto,
    to_admin_create_org_response_dto,
    to_admin_delete_org_response_dto,
} from '../../../src/types/mappers.js';
import type { UserVO, ScopeVO, MeResponseVO, TokenVO, TeamListItemVO, TeamDetailVO } from '../../../src/types/vo.js';

const SAMPLE_USER: UserVO = {
    id: 1,
    username: 'alice',
    display_name: 'Alice',
    email: 'alice@test.com',
    role: 'user',
    suspended_at: null,
    suspended_reason: '',
    created_at: '2025-01-01T00:00:00Z',
};

const SAMPLE_SCOPE: ScopeVO = {
    id: 1,
    slug: 'alice',
    display_name: 'Alice',
    owner_id: 1,
    org_id: null,
    visibility: 'public',
    scope_type: 'user',
    created_at: '2025-01-01T00:00:00Z',
};

describe('to_user_dto', () => {
    it('maps user fields and excludes suspended_reason', () => {
        const dto = to_user_dto(SAMPLE_USER);
        expect(dto).toEqual({
            id: 1,
            username: 'alice',
            display_name: 'Alice',
            email: 'alice@test.com',
            role: 'user',
            suspended_at: null,
            created_at: '2025-01-01T00:00:00Z',
            preferences: {},
        });
        expect(dto).not.toHaveProperty('suspended_reason');
    });
});

describe('to_scope_dto', () => {
    it('maps scope fields and excludes created_at', () => {
        const dto = to_scope_dto(SAMPLE_SCOPE);
        expect(dto).toEqual({
            id: 1,
            slug: 'alice',
            display_name: 'Alice',
            owner_id: 1,
            org_id: null,
            visibility: 'public',
            scope_type: 'user',
        });
        expect(dto).not.toHaveProperty('created_at');
    });
});

describe('to_me_response_dto', () => {
    it('maps full me response to MeResponseDTO', () => {
        const vo: MeResponseVO = {
            user: SAMPLE_USER,
            scopes: [SAMPLE_SCOPE],
            org_slugs: ['acme'],
        };
        const dto = to_me_response_dto(vo);
        expect(dto.user.username).toBe('alice');
        expect(dto.scopes).toHaveLength(1);
        expect(dto.org_slugs).toEqual(['acme']);
    });

    it('defaults org_slugs to empty array when missing', () => {
        const vo: MeResponseVO = {
            user: SAMPLE_USER,
            scopes: [],
        };
        const dto = to_me_response_dto(vo);
        expect(dto.org_slugs).toEqual([]);
    });
});

describe('to_token_dto', () => {
    it('maps all token fields', () => {
        const vo: TokenVO = {
            id: 42,
            name: 'CI pipeline',
            created_at: '2025-03-15T10:00:00Z',
            last_used_at: '2025-03-20T14:30:00Z',
        };
        const dto = to_token_dto(vo);
        expect(dto).toEqual({
            id: 42,
            name: 'CI pipeline',
            permissions: {},
            created_at: '2025-03-15T10:00:00Z',
            last_used_at: '2025-03-20T14:30:00Z',
        });
    });

    it('preserves null last_used_at', () => {
        const vo: TokenVO = {
            id: 1,
            name: 'CLI',
            created_at: '2025-01-01T00:00:00Z',
            last_used_at: null,
        };
        const dto = to_token_dto(vo);
        expect(dto.last_used_at).toBeNull();
    });
});

const SAMPLE_TEAM_LIST_ITEM: TeamListItemVO = {
    name: 'tdd-git',
    scope: 'cliq',
    description: 'TDD workflow',
    author: 'alice',
    latest_version: '1.0.0',
    install_count: 42,
    tags: ['tdd', 'testing'],
    listed: true,
};

describe('to_team_list_item_dto', () => {
    it('maps all fields and excludes listed', () => {
        const dto = to_team_list_item_dto(SAMPLE_TEAM_LIST_ITEM);
        expect(dto.name).toBe('tdd-git');
        expect(dto.tags).toEqual(['tdd', 'testing']);
        expect(dto).not.toHaveProperty('listed');
    });
});

describe('to_team_version_dto', () => {
    it('maps version fields', () => {
        const dto = to_team_version_dto({ version: '1.0.0', changelog: 'Init', published_at: '2025-01-01' });
        expect(dto).toEqual({ version: '1.0.0', changelog: 'Init', published_at: '2025-01-01' });
    });
});

describe('to_team_detail_dto', () => {
    it('maps full detail including nested versions', () => {
        const detail: TeamDetailVO = {
            ...SAMPLE_TEAM_LIST_ITEM,
            license: 'MIT',
            visibility: 'public',
            created_at: '2025-01-01',
            updated_at: '2025-02-01',
            versions: [{ version: '1.0.0', changelog: 'Init', published_at: '2025-01-01' }],
            roles: [{ name: 'dev', content_md: '# Dev' }],
            workflow: { phases: [] },
            agents: {},
            readme: '# TDD',
            cliq_version: null,
            tools: ['git'],
        };
        const dto = to_team_detail_dto(detail);
        expect(dto.name).toBe('tdd-git');
        expect(dto.versions).toHaveLength(1);
        expect(dto.license).toBe('MIT');
        expect(dto).not.toHaveProperty('listed');
    });
});

describe('to_team_list_response_dto', () => {
    it('maps list response with pagination', () => {
        const dto = to_team_list_response_dto({
            teams: [SAMPLE_TEAM_LIST_ITEM],
            total: 1, limit: 50, offset: 0,
        });
        expect(dto.teams).toHaveLength(1);
        expect(dto.total).toBe(1);
        expect(dto.limit).toBe(50);
    });
});

describe('to_team_search_response_dto', () => {
    it('maps search response', () => {
        const dto = to_team_search_response_dto({
            teams: [SAMPLE_TEAM_LIST_ITEM], total: 1,
        });
        expect(dto.teams).toHaveLength(1);
    });
});

describe('to_team_download_response_dto', () => {
    it('maps download response', () => {
        const dto = to_team_download_response_dto({
            filename: 'tdd-1.0.0.zip', data_base64: 'abc',
        });
        expect(dto).toEqual({ filename: 'tdd-1.0.0.zip', data_base64: 'abc' });
    });
});

describe('to_publish_result_dto', () => {
    it('maps publish result fields', () => {
        const dto = to_publish_result_dto({ name: 'my-team', scope: 'alice', version: '1.0.0' });
        expect(dto).toEqual({ name: 'my-team', scope: 'alice', version: '1.0.0' });
    });
});

describe('to_delete_team_result_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_delete_team_result_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_rename_team_result_dto', () => {
    it('maps name and scope', () => {
        const dto = to_rename_team_result_dto({ name: 'new-name', scope: 'alice' });
        expect(dto).toEqual({ name: 'new-name', scope: 'alice' });
    });
});

describe('to_toggle_listed_result_dto', () => {
    it('maps listed flag', () => {
        const dto = to_toggle_listed_result_dto({ listed: false });
        expect(dto).toEqual({ listed: false });
    });
});

describe('to_my_teams_list_response_dto', () => {
    it('maps teams and strips listed', () => {
        const dto = to_my_teams_list_response_dto({ teams: [SAMPLE_TEAM_LIST_ITEM] });
        expect(dto.teams).toHaveLength(1);
        expect(dto.teams[0]).not.toHaveProperty('listed');
    });
});

describe('to_my_teams_all_response_dto', () => {
    it('maps grouped scopes and strips listed from teams', () => {
        const dto = to_my_teams_all_response_dto({
            scopes: [{
                slug: 'alice', display_name: 'Alice', scope_type: 'user', visibility: 'public',
                teams: [SAMPLE_TEAM_LIST_ITEM],
            }],
        });
        expect(dto.scopes).toHaveLength(1);
        expect(dto.scopes[0].slug).toBe('alice');
        expect(dto.scopes[0].teams[0]).not.toHaveProperty('listed');
    });
});

describe('to_latest_version_response_dto', () => {
    it('maps all fields', () => {
        const dto = to_latest_version_response_dto({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' });
        expect(dto).toEqual({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' });
    });

    it('preserves null version', () => {
        const dto = to_latest_version_response_dto({ name: 'new-team', scope: null, version: null });
        expect(dto.version).toBeNull();
    });
});


describe('to_draft_list_item_dto', () => {
    it('maps list item fields', () => {
        const dto = to_draft_list_item_dto({ id: 1, title: 'Draft', updated_at: '2025-01-01' });
        expect(dto).toEqual({ id: 1, title: 'Draft', updated_at: '2025-01-01' });
    });
});

describe('to_draft_detail_dto', () => {
    it('maps detail fields and strips user_id', () => {
        const dto = to_draft_detail_dto({
            id: 1, user_id: 42, title: 'Draft',
            team_json: '{}', created_at: '2025-01-01', updated_at: '2025-01-01',
        });
        expect(dto.id).toBe(1);
        expect(dto.title).toBe('Draft');
        expect(dto).not.toHaveProperty('user_id');
    });
});

describe('to_draft_list_response_dto', () => {
    it('maps list with items', () => {
        const dto = to_draft_list_response_dto({
            drafts: [{ id: 1, title: 'D', updated_at: '2025-01-01' }],
        });
        expect(dto.drafts).toHaveLength(1);
    });
});

describe('to_draft_save_response_dto', () => {
    it('maps id', () => {
        const dto = to_draft_save_response_dto({ id: 42 });
        expect(dto).toEqual({ id: 42 });
    });
});

describe('to_draft_delete_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_draft_delete_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_builder_generate_response_dto', () => {
    it('maps the async job handle (job_id/status/stage)', () => {
        // generate is now async: the response is a handle, not the
        // terminal team payload. Terminal team/validation stripping
        // moved to to_builder_generate_status_dto (below).
        const dto = to_builder_generate_response_dto({
            job_id: 'job-1',
            status: 'pending',
            stage: 'queued',
        } as never);
        expect(dto.job_id).toBe('job-1');
        expect(dto.status).toBe('pending');
        expect(dto.stage).toBe('queued');
    });
});

describe('to_builder_generate_status_dto', () => {
    it('maps team + validation and strips usage', () => {
        const dto = to_builder_generate_status_dto({
            job_id: 'job-1',
            status: 'complete',
            stage: 'done',
            team: { name: 'test' },
            validation: { valid: true, errors: [], warnings: [] },
            usage: { tokens: 100 },
        } as never);
        expect(dto.team).toEqual({ name: 'test' });
        expect(dto.validation).toEqual({ valid: true, errors: [], warnings: [] });
        expect(dto).not.toHaveProperty('usage');
    });
});

describe('to_builder_improve_role_response_dto', () => {
    it('maps all four fields', () => {
        const dto = to_builder_improve_role_response_dto({
            name: 'dev',
            original_content: '# Dev',
            improved_content: '# Better Dev',
            changes_summary: 'Improved',
        });
        expect(dto.improved_content).toBe('# Better Dev');
        expect(dto.name).toBe('dev');
    });
});

describe('to_builder_validate_response_dto', () => {
    it('maps valid, errors, warnings', () => {
        const dto = to_builder_validate_response_dto({
            valid: false,
            errors: ['No root phase'],
            warnings: ['Unused role'],
        });
        expect(dto.valid).toBe(false);
        expect(dto.errors).toEqual(['No root phase']);
        expect(dto.warnings).toEqual(['Unused role']);
    });
});

describe('to_builder_chat_response_dto', () => {
    it('maps reply and actions, strips usage', () => {
        const dto = to_builder_chat_response_dto({
            reply: 'Done.',
            actions: [{ type: 'ADD_PHASE' }],
            usage: { tokens: 200 },
        });
        expect(dto.reply).toBe('Done.');
        expect(dto.actions).toHaveLength(1);
        expect(dto).not.toHaveProperty('usage');
    });
});

describe('to_org_list_item_dto', () => {
    it('maps all fields', () => {
        const dto = to_org_list_item_dto({
            id: 1, slug: 'acme', display_name: 'Acme',
            role: 'admin', member_count: 3, scope_count: 2,
        });
        expect(dto.slug).toBe('acme');
        expect(dto.member_count).toBe(3);
    });
});

describe('to_org_list_response_dto', () => {
    it('maps list of orgs', () => {
        const dto = to_org_list_response_dto({
            orgs: [{ id: 1, slug: 'acme', display_name: 'Acme', role: 'admin', member_count: 3, scope_count: 2 }],
        });
        expect(dto.orgs).toHaveLength(1);
    });
});

describe('to_org_detail_dto', () => {
    it('maps org detail with members, scopes, roles, and available_permissions', () => {
        const dto = to_org_detail_dto({
            id: 1, slug: 'acme', display_name: 'Acme',
            created_at: '2025-01-01', my_role: 'admin',
            members: [{ user_id: 1, username: 'alice', display_name: 'Alice', role: 'admin', role_id: 2 }],
            scopes: [{ id: 10, slug: 'acme', display_name: 'Acme', visibility: 'public', member_count: 1, team_count: 0 }],
            roles: [{
                id: 2, org_id: 1, slug: 'admin', name: 'Admin',
                permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
            }],
            available_permissions: ['org.settings', 'org.members.manage'],
        });
        expect(dto.my_role).toBe('admin');
        expect(dto.members).toHaveLength(1);
        expect(dto.members[0].username).toBe('alice');
        expect(dto.members[0].role_id).toBe(2);
        expect(dto.scopes).toHaveLength(1);
        expect(dto.roles).toHaveLength(1);
        expect(dto.available_permissions).toEqual(['org.settings', 'org.members.manage']);
    });
});

describe('to_org_update_response_dto', () => {
    it('maps updated flag', () => {
        const dto = to_org_update_response_dto({ updated: true });
        expect(dto).toEqual({ updated: true });
    });
});

describe('to_org_leave_response_dto', () => {
    it('maps left flag', () => {
        const dto = to_org_leave_response_dto({ left: true });
        expect(dto).toEqual({ left: true });
    });
});

describe('to_org_add_member_response_dto', () => {
    it('maps user_id, username, and role', () => {
        const dto = to_org_add_member_response_dto({ user_id: 3, username: 'bob', role: 'member' });
        expect(dto).toEqual({ user_id: 3, username: 'bob', role: 'member' });
    });
});

describe('to_org_remove_member_response_dto', () => {
    it('maps removed flag', () => {
        const dto = to_org_remove_member_response_dto({ removed: true });
        expect(dto).toEqual({ removed: true });
    });
});

describe('to_users_update_role_response_dto', () => {
    it('maps user role assignment fields', () => {
        const dto = to_users_update_role_response_dto({
            user_id: 3, org_id: 1, role_id: 2, role_slug: 'admin', role: 'admin',
        });
        expect(dto).toEqual({
            user_id: 3, org_id: 1, role_id: 2, role_slug: 'admin', role: 'admin',
        });
    });
});

describe('to_org_delete_role_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_org_delete_role_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_org_create_scope_response_dto', () => {
    it('maps id and slug', () => {
        const dto = to_org_create_scope_response_dto({ id: 20, slug: 'acme-labs' });
        expect(dto).toEqual({ id: 20, slug: 'acme-labs' });
    });
});

describe('to_org_delete_scope_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_org_delete_scope_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_org_assign_scope_member_response_dto', () => {
    it('maps assigned flag', () => {
        const dto = to_org_assign_scope_member_response_dto({ assigned: true });
        expect(dto).toEqual({ assigned: true });
    });
});

describe('to_org_unassign_scope_member_response_dto', () => {
    it('maps removed flag', () => {
        const dto = to_org_unassign_scope_member_response_dto({ removed: true });
        expect(dto).toEqual({ removed: true });
    });
});

describe('to_update_profile_response_dto', () => {
    it('maps user and strips suspended fields', () => {
        const dto = to_update_profile_response_dto({
            user: {
                id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com',
                role: 'user', suspended_at: '2025-06-01', suspended_reason: 'spam', created_at: '2025-01-01',
            },
        });
        expect(dto.user.display_name).toBe('Alice W');
        expect(dto.user).not.toHaveProperty('suspended_at');
        expect(dto.user).not.toHaveProperty('suspended_reason');
    });

    it('handles null suspended_at', () => {
        const dto = to_update_profile_response_dto({
            user: {
                id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
            },
        });
        expect(dto.user).not.toHaveProperty('suspended_at');
    });
});

describe('to_change_password_response_dto', () => {
    it('maps message', () => {
        const dto = to_change_password_response_dto({ message: 'Password changed' });
        expect(dto).toEqual({ message: 'Password changed' });
    });
});


describe('to_audit_log_response_dto', () => {
    it('maps entries and pagination', () => {
        const vo = {
            entries: [
                { id: 1, admin_id: 99, admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' },
            ],
            total: 1, limit: 50, offset: 0,
        };
        const dto = to_audit_log_response_dto(vo);
        expect(dto.entries).toHaveLength(1);
        expect(dto.entries[0].action).toBe('user.suspend');
        expect(dto.total).toBe(1);
    });

    it('handles empty entries', () => {
        const dto = to_audit_log_response_dto({ entries: [], total: 0, limit: 50, offset: 0 });
        expect(dto.entries).toHaveLength(0);
    });
});

describe('to_admin_user_list_response_dto', () => {
    it('maps users and total', () => {
        const dto = to_admin_user_list_response_dto({
            users: [
                { id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01' },
            ],
            total: 1,
        });
        expect(dto.users).toHaveLength(1);
        expect(dto.users[0].username).toBe('alice');
        expect(dto.total).toBe(1);
    });

    it('handles empty users', () => {
        const dto = to_admin_user_list_response_dto({ users: [], total: 0 });
        expect(dto.users).toHaveLength(0);
    });
});

describe('to_admin_user_detail_dto', () => {
    it('maps all detail fields including orgs', () => {
        const dto = to_admin_user_detail_dto({
            id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
            role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
            scope_count: 2, team_count: 3, token_count: 1, draft_count: 0,
            orgs: [{ id: 10, slug: 'acme', display_name: 'Acme', role: 'admin' }],
        });
        expect(dto.username).toBe('alice');
        expect(dto.scope_count).toBe(2);
        expect(dto.orgs).toHaveLength(1);
        expect(dto.orgs[0].slug).toBe('acme');
    });

    it('handles null suspended_at', () => {
        const dto = to_admin_user_detail_dto({
            id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
            role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
            scope_count: 0, team_count: 0, token_count: 0, draft_count: 0, orgs: [],
        });
        expect(dto.suspended_at).toBeNull();
    });
});

describe('to_admin_create_user_response_dto', () => {
    it('maps created user fields', () => {
        const dto = to_admin_create_user_response_dto({
            id: 10, username: 'bob', display_name: 'Bob', email: 'bob@test.com',
            role: 'user', suspended_at: null, created_at: '2025-06-01',
        });
        expect(dto.id).toBe(10);
        expect(dto.username).toBe('bob');
    });
});

describe('to_admin_update_user_response_dto', () => {
    it('maps updated flag', () => {
        const dto = to_admin_update_user_response_dto({ updated: true });
        expect(dto).toEqual({ updated: true });
    });
});

describe('to_admin_suspend_user_response_dto', () => {
    it('maps suspended flag', () => {
        const dto = to_admin_suspend_user_response_dto({ suspended: true });
        expect(dto).toEqual({ suspended: true });
    });
});

describe('to_admin_suspend_user_response_dto (unsuspend)', () => {
    it('maps suspended: false for unsuspend', () => {
        const dto = to_admin_suspend_user_response_dto({ suspended: false });
        expect(dto).toEqual({ suspended: false });
    });
});

describe('to_admin_delete_user_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_admin_delete_user_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_admin_set_user_role_response_dto', () => {
    it('maps role', () => {
        const dto = to_admin_set_user_role_response_dto({ role: 'admin' });
        expect(dto).toEqual({ role: 'admin' });
    });
});

describe('to_admin_reset_user_password_response_dto', () => {
    it('maps reset flag', () => {
        const dto = to_admin_reset_user_password_response_dto({ reset: true });
        expect(dto).toEqual({ reset: true });
    });
});

describe('to_admin_team_list_response_dto', () => {
    it('maps teams and pagination', () => {
        const dto = to_admin_team_list_response_dto({
            teams: [{ id: 1, name: 'tdd-git', scope: 'cliq', listed: true }],
            total: 1, limit: 20, offset: 0,
        });
        expect(dto.teams).toHaveLength(1);
        expect(dto.total).toBe(1);
        expect(dto.limit).toBe(20);
    });

    it('handles empty teams', () => {
        const dto = to_admin_team_list_response_dto({ teams: [], total: 0, limit: 20, offset: 0 });
        expect(dto.teams).toHaveLength(0);
    });
});

describe('to_admin_set_team_listed_response_dto', () => {
    it('maps listed flag', () => {
        const dto = to_admin_set_team_listed_response_dto({ listed: true });
        expect(dto).toEqual({ listed: true });
    });

    it('maps listed false', () => {
        const dto = to_admin_set_team_listed_response_dto({ listed: false });
        expect(dto).toEqual({ listed: false });
    });
});

describe('to_admin_scope_list_response_dto', () => {
    it('maps scopes and pagination', () => {
        const dto = to_admin_scope_list_response_dto({
            scopes: [{ id: 1, slug: 'alice', display_name: 'Alice', owner_id: 1, owner_username: 'alice', visibility: 'public', scope_type: 'user', team_count: 3, created_at: '2025-01-01' }],
            total: 1, limit: 20, offset: 0,
        });
        expect(dto.scopes).toHaveLength(1);
        expect(dto.scopes[0].slug).toBe('alice');
        expect(dto.total).toBe(1);
        expect(dto.limit).toBe(20);
    });

    it('handles empty scopes', () => {
        const dto = to_admin_scope_list_response_dto({ scopes: [], total: 0, limit: 20, offset: 0 });
        expect(dto.scopes).toHaveLength(0);
    });
});

describe('to_admin_create_scope_response_dto', () => {
    it('maps id and slug', () => {
        const dto = to_admin_create_scope_response_dto({ id: 10, slug: 'newscope' });
        expect(dto).toEqual({ id: 10, slug: 'newscope' });
    });
});

describe('to_admin_update_scope_response_dto', () => {
    it('maps updated flag', () => {
        const dto = to_admin_update_scope_response_dto({ updated: true });
        expect(dto).toEqual({ updated: true });
    });
});

describe('to_admin_delete_scope_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_admin_delete_scope_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});

describe('to_admin_org_list_response_dto', () => {
    it('maps orgs and pagination', () => {
        const dto = to_admin_org_list_response_dto({
            orgs: [{ id: 1, slug: 'acme', display_name: 'Acme', member_count: 3, scope_count: 2, created_at: '2025-01-01' }],
            total: 1, limit: 20, offset: 0,
        });
        expect(dto.orgs).toHaveLength(1);
        expect(dto.orgs[0].slug).toBe('acme');
        expect(dto.total).toBe(1);
        expect(dto.limit).toBe(20);
    });

    it('handles empty orgs', () => {
        const dto = to_admin_org_list_response_dto({ orgs: [], total: 0, limit: 20, offset: 0 });
        expect(dto.orgs).toHaveLength(0);
    });
});

describe('to_admin_create_org_response_dto', () => {
    it('maps id and slug', () => {
        const dto = to_admin_create_org_response_dto({ id: 5, slug: 'acme' });
        expect(dto).toEqual({ id: 5, slug: 'acme' });
    });
});

describe('to_admin_delete_org_response_dto', () => {
    it('maps deleted flag', () => {
        const dto = to_admin_delete_org_response_dto({ deleted: true });
        expect(dto).toEqual({ deleted: true });
    });
});
