import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import {
    admin_audit_schema,
    admin_get_users_schema, admin_get_user_schema,
    admin_new_user_schema, admin_update_user_schema,
    admin_suspend_user_schema, admin_unsuspend_user_schema,
    admin_delete_user_schema, admin_set_user_role_schema,
    admin_reset_user_password_schema,
    admin_get_teams_schema, admin_set_team_listed_schema,
    admin_get_scopes_schema, admin_new_scope_schema,
    admin_update_scope_schema, admin_delete_scope_schema,
    admin_get_orgs_schema, admin_new_org_schema,
    admin_delete_org_schema,
} from '../../../src/schemas/admin_schemas.js';

describe('admin_audit_schema', () => {
    it('accepts empty object', () => {
        expect(admin_audit_schema.safeParse({}).success).toBe(true);
    });

    it('accepts all filter params', () => {
        expect(admin_audit_schema.safeParse({
            action: 'user.suspend', target_type: 'user', admin_id: hub_legacy_uuid(99), limit: 10, offset: 0,
        }).success).toBe(true);
    });

    it('rejects limit over 100', () => {
        expect(admin_audit_schema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects limit of 0', () => {
        expect(admin_audit_schema.safeParse({ limit: 0 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(admin_audit_schema.safeParse({ offset: -1 }).success).toBe(false);
    });

    it('accepts offset of 0', () => {
        expect(admin_audit_schema.safeParse({ offset: 0 }).success).toBe(true);
    });

    it('rejects non-positive admin_id', () => {
        expect(admin_audit_schema.safeParse({ admin_id: 0 }).success).toBe(false);
    });

    it('accepts valid admin_id', () => {
        expect(admin_audit_schema.safeParse({ admin_id: hub_legacy_uuid(1) }).success).toBe(true);
    });
});

describe('admin_get_users_schema', () => {
    it('accepts empty object', () => {
        expect(admin_get_users_schema.safeParse({}).success).toBe(true);
    });

    it('accepts with search', () => {
        expect(admin_get_users_schema.safeParse({ search: 'alice', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('accepts realm_id for realm invite search', () => {
        const r = admin_get_users_schema.safeParse({
            realm_id: 'realm-1', search: 'alice', limit: 20,
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.realm_id).toBe('realm-1');
    });

    it('rejects empty realm_id', () => {
        expect(admin_get_users_schema.safeParse({ realm_id: '' }).success).toBe(false);
    });

    it('rejects limit over 100', () => {
        expect(admin_get_users_schema.safeParse({ limit: 101 }).success).toBe(false);
    });
});

describe('admin_get_user_schema', () => {
    it('accepts positive user_id', () => {
        expect(admin_get_user_schema.safeParse({ user_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects 0', () => {
        expect(admin_get_user_schema.safeParse({ user_id: 0 }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(admin_get_user_schema.safeParse({}).success).toBe(false);
    });
});

describe('admin_new_user_schema', () => {
    it('accepts valid input', () => {
        expect(admin_new_user_schema.safeParse({
            username: 'bob', email: 'bob@test.com', password: 'securepass',
        }).success).toBe(true);
    });

    it('rejects empty username', () => {
        expect(admin_new_user_schema.safeParse({
            username: '', email: 'bob@test.com', password: 'securepass',
        }).success).toBe(false);
    });

    it('rejects invalid slug', () => {
        expect(admin_new_user_schema.safeParse({
            username: 'INVALID USER!', email: 'bob@test.com', password: 'securepass',
        }).success).toBe(false);
    });

    it('rejects short password', () => {
        expect(admin_new_user_schema.safeParse({
            username: 'bob', email: 'bob@test.com', password: 'short',
        }).success).toBe(false);
    });

    it('rejects invalid email', () => {
        expect(admin_new_user_schema.safeParse({
            username: 'bob', email: 'not-an-email', password: 'securepass',
        }).success).toBe(false);
    });

    it('rejects missing email', () => {
        expect(admin_new_user_schema.safeParse({
            username: 'bob', password: 'securepass',
        }).success).toBe(false);
    });
});

describe('admin_update_user_schema', () => {
    it('accepts user_id + display_name', () => {
        expect(admin_update_user_schema.safeParse({
            user_id: hub_legacy_uuid(1), display_name: 'Alice W',
        }).success).toBe(true);
    });

    it('accepts user_id + email', () => {
        expect(admin_update_user_schema.safeParse({
            user_id: hub_legacy_uuid(1), email: 'alice@new.com',
        }).success).toBe(true);
    });

    it('rejects empty display_name', () => {
        expect(admin_update_user_schema.safeParse({
            user_id: hub_legacy_uuid(1), display_name: '',
        }).success).toBe(false);
    });

    it('rejects invalid email', () => {
        expect(admin_update_user_schema.safeParse({
            user_id: hub_legacy_uuid(1), email: 'bad',
        }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(admin_update_user_schema.safeParse({
            display_name: 'Alice',
        }).success).toBe(false);
    });
});

describe('admin_suspend_user_schema', () => {
    it('accepts with reason', () => {
        expect(admin_suspend_user_schema.safeParse({
            user_id: hub_legacy_uuid(5), reason: 'spam',
        }).success).toBe(true);
    });

    it('accepts without reason', () => {
        expect(admin_suspend_user_schema.safeParse({
            user_id: hub_legacy_uuid(5),
        }).success).toBe(true);
    });

    it('rejects missing user_id', () => {
        expect(admin_suspend_user_schema.safeParse({}).success).toBe(false);
    });
});

describe('admin_unsuspend_user_schema', () => {
    it('accepts valid', () => {
        expect(admin_unsuspend_user_schema.safeParse({ user_id: hub_legacy_uuid(5) }).success).toBe(true);
    });

    it('rejects missing user_id', () => {
        expect(admin_unsuspend_user_schema.safeParse({}).success).toBe(false);
    });
});

describe('admin_delete_user_schema', () => {
    it('accepts valid', () => {
        expect(admin_delete_user_schema.safeParse({ user_id: hub_legacy_uuid(5) }).success).toBe(true);
    });

    it('rejects missing user_id', () => {
        expect(admin_delete_user_schema.safeParse({}).success).toBe(false);
    });
});


describe('admin_set_user_role_schema', () => {
    it('accepts valid user_id and role=admin', () => {
        expect(admin_set_user_role_schema.safeParse({ user_id: hub_legacy_uuid(1), role: 'admin' }).success).toBe(true);
    });

    it('accepts valid user_id and role=user', () => {
        expect(admin_set_user_role_schema.safeParse({ user_id: hub_legacy_uuid(1), role: 'user' }).success).toBe(true);
    });

    it('rejects invalid role', () => {
        expect(admin_set_user_role_schema.safeParse({ user_id: hub_legacy_uuid(1), role: 'superadmin' }).success).toBe(false);
    });

    it('rejects missing role', () => {
        expect(admin_set_user_role_schema.safeParse({ user_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(admin_set_user_role_schema.safeParse({ role: 'admin' }).success).toBe(false);
    });
});


describe('admin_reset_user_password_schema', () => {
    it('accepts valid user_id and password', () => {
        expect(admin_reset_user_password_schema.safeParse({ user_id: hub_legacy_uuid(1), new_password: 'secure123' }).success).toBe(true);
    });

    it('rejects short password', () => {
        expect(admin_reset_user_password_schema.safeParse({ user_id: hub_legacy_uuid(1), new_password: 'short' }).success).toBe(false);
    });

    it('rejects missing new_password', () => {
        expect(admin_reset_user_password_schema.safeParse({ user_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(admin_reset_user_password_schema.safeParse({ new_password: 'secure123' }).success).toBe(false);
    });
});

describe('admin_get_teams_schema', () => {
    it('accepts empty object', () => {
        expect(admin_get_teams_schema.safeParse({}).success).toBe(true);
    });

    it('accepts with search/scope/listed/limit/offset', () => {
        expect(admin_get_teams_schema.safeParse({
            search: 'tdd', scope: 'cliq', listed: true, limit: 20, offset: 0,
        }).success).toBe(true);
    });

    it('maps query alias onto search', () => {
        const parsed = admin_get_teams_schema.safeParse({ query: 'identify', limit: 5 });
        expect(parsed.success).toBe(true);
        if (parsed.success) {
            expect(parsed.data.search).toBe('identify');
            expect(parsed.data.limit).toBe(5);
        }
    });

    it('rejects limit over 100', () => {
        expect(admin_get_teams_schema.safeParse({ limit: 101 }).success).toBe(false);
    });
});

describe('admin_set_team_listed_schema', () => {
    it('accepts valid team_id and listed', () => {
        expect(admin_set_team_listed_schema.safeParse({ team_id: hub_legacy_uuid(1), listed: true }).success).toBe(true);
    });

    it('rejects missing team_id', () => {
        expect(admin_set_team_listed_schema.safeParse({ listed: true }).success).toBe(false);
    });

    it('rejects missing listed', () => {
        expect(admin_set_team_listed_schema.safeParse({ team_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects non-boolean listed', () => {
        expect(admin_set_team_listed_schema.safeParse({ team_id: hub_legacy_uuid(1), listed: 'yes' }).success).toBe(false);
    });
});

describe('admin_get_scopes_schema', () => {
    it('accepts empty object', () => {
        expect(admin_get_scopes_schema.safeParse({}).success).toBe(true);
    });

    it('accepts with search', () => {
        expect(admin_get_scopes_schema.safeParse({ search: 'alice', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('rejects limit over 100', () => {
        expect(admin_get_scopes_schema.safeParse({ limit: 101 }).success).toBe(false);
    });
});

describe('admin_new_scope_schema', () => {
    it('accepts valid input', () => {
        expect(admin_new_scope_schema.safeParse({
            slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'user',
        }).success).toBe(true);
    });

    it('rejects missing slug', () => {
        expect(admin_new_scope_schema.safeParse({
            owner_username: 'alice', visibility: 'public', scope_type: 'user',
        }).success).toBe(false);
    });

    it('rejects invalid slug', () => {
        expect(admin_new_scope_schema.safeParse({
            slug: '123abc', owner_username: 'alice', visibility: 'public', scope_type: 'user',
        }).success).toBe(false);
    });

    it('accepts missing owner_username', () => {
        expect(admin_new_scope_schema.safeParse({
            slug: 'newscope', visibility: 'public', scope_type: 'user',
        }).success).toBe(true);
    });

    it('accepts missing visibility', () => {
        expect(admin_new_scope_schema.safeParse({
            slug: 'newscope', owner_username: 'alice', scope_type: 'user',
        }).success).toBe(true);
    });

    it('rejects invalid scope_type', () => {
        expect(admin_new_scope_schema.safeParse({
            slug: 'newscope', owner_username: 'alice', visibility: 'public', scope_type: 'invalid',
        }).success).toBe(false);
    });
});

describe('admin_update_scope_schema', () => {
    it('accepts scope_id + visibility', () => {
        expect(admin_update_scope_schema.safeParse({
            scope_id: hub_legacy_uuid(1), visibility: 'private',
        }).success).toBe(true);
    });

    it('accepts scope_id + display_name', () => {
        expect(admin_update_scope_schema.safeParse({
            scope_id: hub_legacy_uuid(1), display_name: 'New Name',
        }).success).toBe(true);
    });

    it('rejects missing scope_id', () => {
        expect(admin_update_scope_schema.safeParse({
            visibility: 'private',
        }).success).toBe(false);
    });

    it('rejects empty display_name', () => {
        expect(admin_update_scope_schema.safeParse({
            scope_id: hub_legacy_uuid(1), display_name: '',
        }).success).toBe(false);
    });
});

describe('admin_delete_scope_schema', () => {
    it('accepts valid scope_id', () => {
        expect(admin_delete_scope_schema.safeParse({ scope_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects missing scope_id', () => {
        expect(admin_delete_scope_schema.safeParse({}).success).toBe(false);
    });
});

describe('admin_get_orgs_schema', () => {
    it('accepts empty object', () => {
        expect(admin_get_orgs_schema.safeParse({}).success).toBe(true);
    });

    it('accepts with search', () => {
        expect(admin_get_orgs_schema.safeParse({ search: 'acme', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('rejects limit over 100', () => {
        expect(admin_get_orgs_schema.safeParse({ limit: 101 }).success).toBe(false);
    });
});

describe('admin_new_org_schema', () => {
    it('accepts valid slug and admin_username', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice',
        }).success).toBe(true);
    });

    it('rejects missing slug', () => {
        expect(admin_new_org_schema.safeParse({
            admin_username: 'alice',
        }).success).toBe(false);
    });

    it('rejects invalid slug', () => {
        expect(admin_new_org_schema.safeParse({
            slug: '123abc', admin_username: 'alice',
        }).success).toBe(false);
    });

    it('rejects missing admin_username', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme',
        }).success).toBe(false);
    });

    it('accepts with optional admin_email', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice', admin_email: 'alice@test.com',
        }).success).toBe(true);
    });

    it('accepts with optional password', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice', password: 'securepass',
        }).success).toBe(true);
    });

    it('accepts with optional display_name', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice', display_name: 'Acme Inc',
        }).success).toBe(true);
    });

    it('rejects invalid admin_email', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice', admin_email: 'not-an-email',
        }).success).toBe(false);
    });

    it('rejects short admin_password', () => {
        expect(admin_new_org_schema.safeParse({
            slug: 'acme', admin_username: 'alice', admin_password: 'short',
        }).success).toBe(false);
    });
});

describe('admin_delete_org_schema', () => {
    it('accepts valid org_id', () => {
        expect(admin_delete_org_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects missing org_id', () => {
        expect(admin_delete_org_schema.safeParse({}).success).toBe(false);
    });
});
