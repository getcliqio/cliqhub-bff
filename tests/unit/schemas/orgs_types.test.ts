import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import {
    OrgsGetInput, OrgsGetAllInput, OrgsNewInput, OrgIdInput, OrgsUpdateInput,
    OrgsRemoveMemberInput, OrgRoleIdInput, OrgsCreateRoleInput,
    OrgsUpdateRoleInput, OrgsNewScopeInput, OrgsUpdateScopeInput, OrgScopeIdInput,
    OrgScopeMemberInput, OrgsGetScopesInput,
} from '../../../src/schemas/orgs_types.js';

const ORG = hub_legacy_uuid(1);
const ROLE = hub_legacy_uuid(2);
const USER = hub_legacy_uuid(3);
const SCOPE = hub_legacy_uuid(10);

describe('OrgsGetInput', () => {
    it('accepts empty body', () => {
        expect(OrgsGetInput.safeParse({}).success).toBe(true);
    });

    it('accepts mine flag', () => {
        expect(OrgsGetInput.safeParse({ mine: true }).success).toBe(true);
    });

    it('rejects non-boolean mine', () => {
        expect(OrgsGetInput.safeParse({ mine: 'yes' }).success).toBe(false);
    });
});

describe('OrgsGetAllInput', () => {
    it('accepts empty object', () => {
        expect(OrgsGetAllInput.safeParse({}).success).toBe(true);
    });

    it('accepts search with paging', () => {
        expect(OrgsGetAllInput.safeParse({ search: 'acme', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('rejects limit over 100', () => {
        expect(OrgsGetAllInput.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(OrgsGetAllInput.safeParse({ offset: -1 }).success).toBe(false);
    });

    it('accepts the status filter and include_deleted', () => {
        expect(OrgsGetAllInput.safeParse({ status: 'waiting_for_owner', include_deleted: true }).success).toBe(true);
        expect(OrgsGetAllInput.safeParse({ status: 'gone' }).success).toBe(false);
    });
});

describe('OrgsNewInput', () => {
    it('accepts an existing user as owner', () => {
        expect(OrgsNewInput.safeParse({ slug: 'acme', display_name: 'Acme', owner: { user_id: USER } }).success).toBe(true);
    });

    it('accepts an email owner with an optional display name, and reactivate', () => {
        expect(OrgsNewInput.safeParse({ slug: 'acme', owner: { email: 'sapan@example.test' } }).success).toBe(true);
        expect(OrgsNewInput.safeParse({
            slug: 'acme', owner: { email: 'sapan@example.test', display_name: 'Sapan' }, reactivate: true,
        }).success).toBe(true);
    });

    it('rejects missing slug or owner', () => {
        expect(OrgsNewInput.safeParse({ owner: { user_id: USER } }).success).toBe(false);
        expect(OrgsNewInput.safeParse({ slug: 'acme' }).success).toBe(false);
    });

    it('rejects invalid slug', () => {
        expect(OrgsNewInput.safeParse({ slug: '123abc', owner: { user_id: USER } }).success).toBe(false);
        expect(OrgsNewInput.safeParse({ slug: 'Acme', owner: { user_id: USER } }).success).toBe(false);
    });

    it('rejects an owner that mixes or lacks the two shapes', () => {
        expect(OrgsNewInput.safeParse({ slug: 'acme', owner: {} }).success).toBe(false);
        expect(OrgsNewInput.safeParse({ slug: 'acme', owner: { user_id: USER, email: 'a@example.test' } }).success).toBe(false);
        expect(OrgsNewInput.safeParse({ slug: 'acme', owner: { email: 'not-an-email' } }).success).toBe(false);
        expect(OrgsNewInput.safeParse({ slug: 'acme', owner: { user_id: 'nope' } }).success).toBe(false);
    });

    it('strips admin_* fields', () => {
        const r = OrgsNewInput.safeParse({ slug: 'acme', owner: { user_id: USER }, admin_username: 'alice', admin_password: 'x' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data).toEqual({ slug: 'acme', owner: { user_id: USER } });
    });
});

describe('OrgIdInput', () => {
    it('accepts uuid org_id', () => {
        expect(OrgIdInput.safeParse({ org_id: ORG }).success).toBe(true);
    });

    it('rejects integer org_id', () => {
        expect(OrgIdInput.safeParse({ org_id: 0 }).success).toBe(false);
        expect(OrgIdInput.safeParse({ org_id: 1 }).success).toBe(false);
    });

    it('rejects non-uuid string', () => {
        expect(OrgIdInput.safeParse({ org_id: 'acme' }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgIdInput.safeParse({}).success).toBe(false);
    });
});

describe('OrgsUpdateInput', () => {
    it('accepts valid params', () => {
        expect(OrgsUpdateInput.safeParse({ org_id: ORG, display_name: 'Acme' }).success).toBe(true);
    });

    it('rejects empty display_name', () => {
        expect(OrgsUpdateInput.safeParse({ org_id: ORG, display_name: '' }).success).toBe(false);
    });

    it('rejects missing display_name', () => {
        expect(OrgsUpdateInput.safeParse({ org_id: ORG }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgsUpdateInput.safeParse({ display_name: 'Acme' }).success).toBe(false);
    });
});

describe('OrgsRemoveMemberInput', () => {
    it('accepts valid params', () => {
        expect(OrgsRemoveMemberInput.safeParse({ org_id: ORG, user_id: USER }).success).toBe(true);
    });

    it('rejects non-uuid user_id', () => {
        expect(OrgsRemoveMemberInput.safeParse({ org_id: ORG, user_id: 0 }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(OrgsRemoveMemberInput.safeParse({ org_id: ORG }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgsRemoveMemberInput.safeParse({ user_id: USER }).success).toBe(false);
    });
});

describe('OrgRoleIdInput', () => {
    it('accepts valid params', () => {
        expect(OrgRoleIdInput.safeParse({ org_id: ORG, role_id: ROLE }).success).toBe(true);
    });

    it('rejects missing role_id', () => {
        expect(OrgRoleIdInput.safeParse({ org_id: ORG }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgRoleIdInput.safeParse({ role_id: ROLE }).success).toBe(false);
    });
});

describe('OrgsCreateRoleInput', () => {
    it('accepts valid params', () => {
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: 'custom', name: 'Custom', permissions: ['org.settings'] }).success).toBe(true);
    });

    it('accepts empty permissions', () => {
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: 'custom', name: 'Custom', permissions: [] }).success).toBe(true);
    });

    it('rejects missing permissions', () => {
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: 'custom', name: 'Custom' }).success).toBe(false);
    });

    it('rejects empty slug', () => {
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: '', name: 'Custom', permissions: [] }).success).toBe(false);
    });

    it('rejects slug over 49 and name over 100 chars', () => {
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: 'x'.repeat(50), name: 'Custom', permissions: [] }).success).toBe(false);
        expect(OrgsCreateRoleInput.safeParse({ org_id: ORG, slug: 'custom', name: 'x'.repeat(101), permissions: [] }).success).toBe(false);
    });
});

describe('OrgsUpdateRoleInput', () => {
    it('accepts name only', () => {
        expect(OrgsUpdateRoleInput.safeParse({ org_id: ORG, role_id: ROLE, name: 'Renamed' }).success).toBe(true);
    });

    it('accepts permissions only', () => {
        expect(OrgsUpdateRoleInput.safeParse({ org_id: ORG, role_id: ROLE, permissions: ['org.settings'] }).success).toBe(true);
    });

    it('rejects when neither name nor permissions provided', () => {
        const r = OrgsUpdateRoleInput.safeParse({ org_id: ORG, role_id: ROLE });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe('At least one of name or permissions is required');
    });
});

describe('OrgsNewScopeInput', () => {
    it('accepts valid params with visibility', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: 'acme-labs', visibility: 'private' }).success).toBe(true);
    });

    it('accepts valid params without optional fields', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: 'acme-labs' }).success).toBe(true);
    });

    it('rejects empty slug', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: '' }).success).toBe(false);
    });

    it('rejects slug starting with number', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: '123-abc' }).success).toBe(false);
    });

    it('rejects slug with uppercase', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: 'Acme-Labs' }).success).toBe(false);
    });

    it('rejects slug with underscores', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: 'acme_labs' }).success).toBe(false);
    });

    it('rejects invalid visibility', () => {
        expect(OrgsNewScopeInput.safeParse({ org_id: ORG, slug: 'acme-labs', visibility: 'internal' }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgsNewScopeInput.safeParse({ slug: 'acme-labs' }).success).toBe(false);
    });
});

describe('OrgsUpdateScopeInput', () => {
    it('accepts display_name and visibility', () => {
        expect(OrgsUpdateScopeInput.safeParse({ org_id: ORG, scope_id: SCOPE, display_name: 'Labs', visibility: 'public' }).success).toBe(true);
    });

    it('rejects invalid visibility', () => {
        expect(OrgsUpdateScopeInput.safeParse({ org_id: ORG, scope_id: SCOPE, visibility: 'internal' }).success).toBe(false);
    });

    it('rejects missing scope_id', () => {
        expect(OrgsUpdateScopeInput.safeParse({ org_id: ORG, display_name: 'Labs' }).success).toBe(false);
    });
});

describe('OrgScopeIdInput', () => {
    it('accepts valid params', () => {
        expect(OrgScopeIdInput.safeParse({ org_id: ORG, scope_id: SCOPE }).success).toBe(true);
    });

    it('rejects non-uuid scope_id', () => {
        expect(OrgScopeIdInput.safeParse({ org_id: ORG, scope_id: 0 }).success).toBe(false);
    });

    it('rejects missing scope_id', () => {
        expect(OrgScopeIdInput.safeParse({ org_id: ORG }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgScopeIdInput.safeParse({ scope_id: SCOPE }).success).toBe(false);
    });
});

describe('OrgScopeMemberInput', () => {
    it('accepts valid params', () => {
        expect(OrgScopeMemberInput.safeParse({ org_id: ORG, scope_id: SCOPE, user_id: USER }).success).toBe(true);
    });

    it('rejects non-uuid scope_id', () => {
        expect(OrgScopeMemberInput.safeParse({ org_id: ORG, scope_id: -1, user_id: USER }).success).toBe(false);
    });

    it('rejects non-uuid user_id', () => {
        expect(OrgScopeMemberInput.safeParse({ org_id: ORG, scope_id: SCOPE, user_id: 0 }).success).toBe(false);
    });

    it('rejects missing scope_id', () => {
        expect(OrgScopeMemberInput.safeParse({ org_id: ORG, user_id: USER }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(OrgScopeMemberInput.safeParse({ org_id: ORG, scope_id: SCOPE }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(OrgScopeMemberInput.safeParse({ scope_id: SCOPE, user_id: USER }).success).toBe(false);
    });
});

describe('OrgsGetScopesInput', () => {
    it('accepts user_id only', () => {
        expect(OrgsGetScopesInput.safeParse({ user_id: USER }).success).toBe(true);
    });

    it('accepts all filters', () => {
        expect(OrgsGetScopesInput.safeParse({ user_id: USER, org_id: ORG, search: 'acme', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('rejects missing user_id', () => {
        expect(OrgsGetScopesInput.safeParse({}).success).toBe(false);
    });

    it('rejects limit over 100', () => {
        expect(OrgsGetScopesInput.safeParse({ user_id: USER, limit: 101 }).success).toBe(false);
    });
});
