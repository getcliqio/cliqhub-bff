import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import {
    orgs_get_schema, orgs_get_by_id_schema,
    orgs_update_schema, orgs_leave_schema,
    orgs_add_member_schema, orgs_remove_member_schema,
    orgs_list_roles_schema, orgs_get_role_schema, orgs_create_role_schema,
    orgs_update_role_schema, orgs_delete_role_schema, users_update_role_schema,
    orgs_new_scope_schema, orgs_delete_scope_schema,
    orgs_assign_scope_member_schema, orgs_unassign_scope_member_schema,
} from '../../../src/schemas/orgs_schemas.js';

describe('orgs_get_schema', () => {
    it('accepts empty body', () => {
        expect(orgs_get_schema.safeParse({}).success).toBe(true);
    });
});

describe('orgs_get_by_id_schema', () => {
    it('accepts valid org_id', () => {
        expect(orgs_get_by_id_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects non-positive org_id', () => {
        expect(orgs_get_by_id_schema.safeParse({ org_id: 0 }).success).toBe(false);
        expect(orgs_get_by_id_schema.safeParse({ org_id: -1 }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_get_by_id_schema.safeParse({}).success).toBe(false);
    });

    it('rejects non-integer org_id', () => {
        expect(orgs_get_by_id_schema.safeParse({ org_id: 1.5 }).success).toBe(false);
    });
});

describe('orgs_update_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_update_schema.safeParse({ org_id: hub_legacy_uuid(1), display_name: 'Acme' }).success).toBe(true);
    });

    it('rejects empty display_name', () => {
        expect(orgs_update_schema.safeParse({ org_id: hub_legacy_uuid(1), display_name: '' }).success).toBe(false);
    });

    it('rejects missing display_name', () => {
        expect(orgs_update_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_update_schema.safeParse({ display_name: 'Acme' }).success).toBe(false);
    });
});

describe('orgs_leave_schema', () => {
    it('accepts valid org_id', () => {
        expect(orgs_leave_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects non-positive org_id', () => {
        expect(orgs_leave_schema.safeParse({ org_id: 0 }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_leave_schema.safeParse({}).success).toBe(false);
    });
});

describe('orgs_add_member_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_add_member_schema.safeParse({ org_id: hub_legacy_uuid(1), username: 'bob' }).success).toBe(true);
    });

    it('rejects empty username', () => {
        expect(orgs_add_member_schema.safeParse({ org_id: hub_legacy_uuid(1), username: '' }).success).toBe(false);
    });

    it('rejects missing username', () => {
        expect(orgs_add_member_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_add_member_schema.safeParse({ username: 'bob' }).success).toBe(false);
    });
});

describe('orgs_remove_member_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_remove_member_schema.safeParse({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(3) }).success).toBe(true);
    });

    it('rejects non-positive user_id', () => {
        expect(orgs_remove_member_schema.safeParse({ org_id: hub_legacy_uuid(1), user_id: 0 }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(orgs_remove_member_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_remove_member_schema.safeParse({ user_id: hub_legacy_uuid(3) }).success).toBe(false);
    });
});

describe('orgs_list_roles_schema', () => {
    it('accepts valid org_id', () => {
        expect(orgs_list_roles_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects missing org_id', () => {
        expect(orgs_list_roles_schema.safeParse({}).success).toBe(false);
    });

    it('rejects non-positive org_id', () => {
        expect(orgs_list_roles_schema.safeParse({ org_id: 0 }).success).toBe(false);
    });
});

describe('orgs_get_role_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_get_role_schema.safeParse({ org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) }).success).toBe(true);
    });

    it('rejects missing role_id', () => {
        expect(orgs_get_role_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });
});

describe('orgs_create_role_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_create_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), slug: 'custom', name: 'Custom', permissions: ['org.settings'],
        }).success).toBe(true);
    });

    it('rejects missing permissions', () => {
        expect(orgs_create_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), slug: 'custom', name: 'Custom',
        }).success).toBe(false);
    });

    it('rejects empty slug', () => {
        expect(orgs_create_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), slug: '', name: 'Custom', permissions: [],
        }).success).toBe(false);
    });
});

describe('orgs_update_role_schema', () => {
    it('accepts name only', () => {
        expect(orgs_update_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2), name: 'Renamed',
        }).success).toBe(true);
    });

    it('accepts permissions only', () => {
        expect(orgs_update_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2), permissions: ['org.settings'],
        }).success).toBe(true);
    });

    it('rejects when neither name nor permissions provided', () => {
        expect(orgs_update_role_schema.safeParse({
            org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2),
        }).success).toBe(false);
    });
});

describe('orgs_delete_role_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_delete_role_schema.safeParse({ org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) }).success).toBe(true);
    });

    it('rejects missing role_id', () => {
        expect(orgs_delete_role_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });
});

describe('users_update_role_schema', () => {
    it('accepts valid params', () => {
        expect(users_update_role_schema.safeParse({
            user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2),
        }).success).toBe(true);
    });

    it('rejects missing role_id', () => {
        expect(users_update_role_schema.safeParse({
            user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1),
        }).success).toBe(false);
    });

    it('rejects non-positive user_id', () => {
        expect(users_update_role_schema.safeParse({
            user_id: -1, org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2),
        }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(users_update_role_schema.safeParse({
            user_id: hub_legacy_uuid(3), role_id: hub_legacy_uuid(2),
        }).success).toBe(false);
    });
});

describe('orgs_new_scope_schema', () => {
    it('accepts valid params with visibility', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: 'acme-labs', visibility: 'private' }).success).toBe(true);
    });

    it('accepts valid params without optional fields', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: 'acme-labs' }).success).toBe(true);
    });

    it('rejects empty slug', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: '' }).success).toBe(false);
    });

    it('rejects slug starting with number', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: '123-abc' }).success).toBe(false);
    });

    it('rejects slug with uppercase', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: 'Acme-Labs' }).success).toBe(false);
    });

    it('rejects slug with underscores', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: 'acme_labs' }).success).toBe(false);
    });

    it('rejects invalid visibility', () => {
        expect(orgs_new_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), slug: 'acme-labs', visibility: 'internal' }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_new_scope_schema.safeParse({ slug: 'acme-labs' }).success).toBe(false);
    });
});

describe('orgs_delete_scope_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_delete_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10) }).success).toBe(true);
    });

    it('rejects non-positive scope_id', () => {
        expect(orgs_delete_scope_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: 0 }).success).toBe(false);
    });

    it('rejects missing scope_id', () => {
        expect(orgs_delete_scope_schema.safeParse({ org_id: hub_legacy_uuid(1) }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_delete_scope_schema.safeParse({ scope_id: hub_legacy_uuid(10) }).success).toBe(false);
    });
});

describe('orgs_assign_scope_member_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_assign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) }).success).toBe(true);
    });

    it('rejects non-positive scope_id', () => {
        expect(orgs_assign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: 0, user_id: hub_legacy_uuid(3) }).success).toBe(false);
    });

    it('rejects non-positive user_id', () => {
        expect(orgs_assign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: 0 }).success).toBe(false);
    });

    it('rejects missing scope_id', () => {
        expect(orgs_assign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(3) }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(orgs_assign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10) }).success).toBe(false);
    });
});

describe('orgs_unassign_scope_member_schema', () => {
    it('accepts valid params', () => {
        expect(orgs_unassign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) }).success).toBe(true);
    });

    it('rejects non-positive scope_id', () => {
        expect(orgs_unassign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: -1, user_id: hub_legacy_uuid(3) }).success).toBe(false);
    });

    it('rejects non-positive user_id', () => {
        expect(orgs_unassign_scope_member_schema.safeParse({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: -1 }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(orgs_unassign_scope_member_schema.safeParse({ scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) }).success).toBe(false);
    });
});
