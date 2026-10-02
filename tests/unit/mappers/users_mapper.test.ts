import { describe, it, expect } from 'vitest';
import {
    to_user_data, to_users_get_data, to_user_detail_data, to_users_new_data, to_users_update_data,
    to_users_suspend_data, to_users_delete_data, to_users_set_role_data,
    to_users_reset_password_data, to_users_forgot_password_data, to_users_update_role_data,
    to_users_update_profile_data, to_users_change_password_data, to_password_reset_data,
} from '../../../src/mappers/users_mapper.js';
import type { CreatedSession } from '../../../src/services/session_service.js';
import type { UserVO, UserDetailVO } from '../../../src/types/core/users.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const U1 = hub_legacy_uuid(1);

const SAMPLE_USER: UserVO = {
    id: U1,
    username: 'alice',
    display_name: 'Alice',
    email: 'alice@test.com',
    role: 'user',
    suspended_at: null,
    suspended_reason: 'note',
    created_at: '2025-01-01T00:00:00Z',
    preferences: { theme: 'dark' },
};

describe('to_user_data', () => {
    it('maps user fields and excludes suspended_reason', () => {
        const data = to_user_data(SAMPLE_USER);
        expect(data).toEqual({
            id: U1,
            username: 'alice',
            display_name: 'Alice',
            email: 'alice@test.com',
            role: 'user',
            suspended_at: null,
            created_at: '2025-01-01T00:00:00Z',
            preferences: { theme: 'dark' },
        });
        expect(data).not.toHaveProperty('suspended_reason');
    });

    it('defaults missing preferences to {}', () => {
        const { preferences: _p, ...rest } = SAMPLE_USER;
        const data = to_user_data(rest as UserVO);
        expect(data.preferences).toEqual({});
    });
});

describe('to_users_get_data', () => {
    it('maps users and pagination', () => {
        const row = { id: U1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01T00:00:00.000Z', status: 'active' as const, deleted_at: null };
        const data = to_users_get_data({ users: [row], total: 1, limit: 20, offset: 0 });
        expect(data.users).toHaveLength(1);
        expect(data.users[0]).toEqual(row);
        expect(data.users[0]).not.toBe(row);
        expect(data).toMatchObject({ total: 1, limit: 20, offset: 0 });
    });

    it('keeps status, deleted_at, a null username (invited by email) and the org role of member lists', () => {
        const invited = { id: U1, username: null, display_name: 'Priya', email: 'priya@test.com', role: 'user', suspended_at: null, created_at: '2026-10-02T10:00:00.000Z', status: 'invited' as const, deleted_at: null, org_role: 'admin' };
        const deleted = { ...invited, username: 'bob', status: 'deleted' as const, deleted_at: '2026-09-01T00:00:00.000Z', org_role: undefined };
        const data = to_users_get_data({ users: [invited, deleted], total: 2, limit: 50, offset: 0 });
        expect(data.users[0]).toMatchObject({ username: null, status: 'invited', deleted_at: null, org_role: 'admin' });
        expect(data.users[1]).toMatchObject({ status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z' });
    });

    it('handles empty users', () => {
        const data = to_users_get_data({ users: [], total: 0, limit: 20, offset: 0 });
        expect(data.users).toHaveLength(0);
    });
});

describe('to_user_detail_data', () => {
    const detail: UserDetailVO = {
        id: U1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
        role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01T00:00:00.000Z', status: 'active', deleted_at: null,
        scope_count: 2, team_count: 3, token_count: 1, draft_count: 0,
        orgs: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'acme', display_name: 'Acme', role: 'admin' }],
    };

    it('maps all detail fields including orgs', () => {
        const data = to_user_detail_data(detail);
        expect(data).toMatchObject({ username: 'alice', status: 'active', deleted_at: null });
        expect(data.scope_count).toBe(2);
        expect(data.orgs).toHaveLength(1);
        expect(data.orgs[0].slug).toBe('acme');
        expect(data.orgs[0]).not.toBe(detail.orgs[0]);
    });

    it('handles null suspended_at', () => {
        const data = to_user_detail_data({ ...detail, orgs: [] });
        expect(data.suspended_at).toBeNull();
        expect(data.orgs).toEqual([]);
    });
});

describe('to_users_new_data', () => {
    it('maps the invited user and the setup link state', () => {
        const vo = {
            user: { id: U1, username: 'bob', email: 'bob@example.test', status: 'invited' as const },
            setup: { expires_at: '2026-10-09T10:00:00Z', email_sent: true, setup_url: null },
        };
        expect(to_users_new_data(vo)).toEqual(vo);
    });

    it('carries setup_url when the email could not be sent', () => {
        const data = to_users_new_data({
            user: { id: U1, username: 'bob', email: 'bob@example.test', status: 'invited' },
            setup: { expires_at: '2026-10-09T10:00:00Z', email_sent: false, setup_url: 'https://app.example.test/reset/x' },
        });
        expect(data.setup).toEqual({ expires_at: '2026-10-09T10:00:00Z', email_sent: false, setup_url: 'https://app.example.test/reset/x' });
    });
});

describe('flag mappers', () => {
    it('to_users_update_data maps updated', () => {
        expect(to_users_update_data({ updated: true })).toEqual({ updated: true });
    });

    it('to_users_suspend_data maps suspended (suspend and unsuspend)', () => {
        expect(to_users_suspend_data({ suspended: true })).toEqual({ suspended: true });
        expect(to_users_suspend_data({ suspended: false })).toEqual({ suspended: false });
    });

    it('to_users_delete_data maps deleted', () => {
        expect(to_users_delete_data({ deleted: true })).toEqual({ deleted: true });
    });

    it('to_users_set_role_data maps role', () => {
        expect(to_users_set_role_data({ role: 'admin' })).toEqual({ role: 'admin' });
    });

    it('to_users_reset_password_data maps the reset link state', () => {
        const vo = { reset_id: 'rst-1', expires_at: '2026-10-03T10:20:00Z', email_sent: true, reset_url: null };
        expect(to_users_reset_password_data(vo)).toEqual(vo);
    });

    it('to_users_forgot_password_data is always { requested: true }', () => {
        expect(to_users_forgot_password_data({ requested: true })).toEqual({ requested: true });
    });
});

describe('to_users_update_role_data', () => {
    it('maps user role assignment fields', () => {
        const vo = { user_id: 'user-uuid-3', org_id: 'org-uuid-1', role_id: 'role-uuid-2', role_slug: 'admin', role: 'admin' };
        expect(to_users_update_role_data(vo)).toEqual(vo);
    });
});

describe('to_users_update_profile_data', () => {
    it('maps user and strips suspended fields', () => {
        const data = to_users_update_profile_data({
            user: {
                id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com',
                role: 'user', suspended_at: '2025-06-01', suspended_reason: 'spam', created_at: '2025-01-01',
            },
        });
        expect(data.user).toEqual({
            id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com', role: 'user', created_at: '2025-01-01',
        });
        expect(data.user).not.toHaveProperty('suspended_at');
        expect(data.user).not.toHaveProperty('suspended_reason');
    });

    it('handles null suspended_at', () => {
        const data = to_users_update_profile_data({
            user: {
                id: 1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
            },
        });
        expect(data.user).not.toHaveProperty('suspended_at');
    });
});

describe('to_users_change_password_data', () => {
    it('maps the user and sessions_revoked', () => {
        const vo = { user: { id: U1, username: 'alice', status: 'active' as const }, sessions_revoked: 2 };
        expect(to_users_change_password_data(vo)).toEqual(vo);
    });
});

describe('to_password_reset_data', () => {
    const data = { user: { id: U1, username: 'alice', status: 'active' as const }, sessions_revoked: 1 };
    const session = {
        session_id: 'sid', target_token: 'cliq_tok_fake',
        login: {
            user: { ...SAMPLE_USER }, scopes: [{ slug: 'alice' }], org_slugs: [], enroll_token: null, orgs: [],
            default_realm_id: null, default_realm_slug: null, default_realm_qualified: null,
        },
    } as unknown as CreatedSession;

    it('without a session: the change result only', () => {
        expect(to_password_reset_data({ data, session: null }, false)).toEqual(data);
    });

    it('browser: the sign-in data under session, no token', () => {
        const out = to_password_reset_data({ data, session }, false);
        expect(out.session).toEqual(session.login);
        expect(JSON.stringify(out)).not.toContain('cliq_tok_fake');
    });

    it('CLI: scope slugs and the bearer token under session', () => {
        const out = to_password_reset_data({ data, session }, true);
        expect(out.session).toMatchObject({ token: 'cliq_tok_fake', scopes: ['alice'] });
    });
});
