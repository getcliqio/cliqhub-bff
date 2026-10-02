import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import {
    UsersGetInput, UserIdInput, UsersNewInput, UsersUpdateInput, UsersSuspendInput,
    UsersSetRoleInput, UsersResetPasswordInput, UsersForgotPasswordInput, UsersUpdateRoleInput,
    UsersUpdateProfileInput, UsersChangePasswordInput, UsersResetWithTokenInput,
} from '../../../src/schemas/users_types.js';

const U1 = hub_legacy_uuid(1);
const U5 = hub_legacy_uuid(5);
const ORG = hub_legacy_uuid(101);
const ROLE = hub_legacy_uuid(202);

describe('UsersGetInput', () => {
    it('accepts empty object', () => {
        expect(UsersGetInput.safeParse({}).success).toBe(true);
    });

    it('accepts search with paging', () => {
        expect(UsersGetInput.safeParse({ search: 'alice', limit: 20, offset: 0 }).success).toBe(true);
    });

    it('accepts query alias', () => {
        expect(UsersGetInput.safeParse({ query: 'alice' }).success).toBe(true);
    });

    it('accepts realm_id for realm invite search', () => {
        const r = UsersGetInput.safeParse({ realm_id: 'realm-1', search: 'alice', limit: 20 });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.realm_id).toBe('realm-1');
    });

    it('rejects empty realm_id', () => {
        expect(UsersGetInput.safeParse({ realm_id: '' }).success).toBe(false);
    });

    it('accepts uuid org_id', () => {
        expect(UsersGetInput.safeParse({ org_id: ORG }).success).toBe(true);
    });

    it('rejects non-uuid org_id', () => {
        expect(UsersGetInput.safeParse({ org_id: 'acme' }).success).toBe(false);
    });

    it('rejects limit over 100 and limit 0', () => {
        expect(UsersGetInput.safeParse({ limit: 101 }).success).toBe(false);
        expect(UsersGetInput.safeParse({ limit: 0 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(UsersGetInput.safeParse({ offset: -1 }).success).toBe(false);
    });
});

describe('UserIdInput', () => {
    it('accepts uuid user_id', () => {
        expect(UserIdInput.safeParse({ user_id: U1 }).success).toBe(true);
    });

    it('rejects integer user_id', () => {
        expect(UserIdInput.safeParse({ user_id: 0 }).success).toBe(false);
    });

    it('rejects non-uuid string', () => {
        expect(UserIdInput.safeParse({ user_id: 'alice' }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(UserIdInput.safeParse({}).success).toBe(false);
    });
});

describe('UsersNewInput', () => {
    const valid = { username: 'bob', email: 'bob@test.com' };

    it('accepts valid input', () => {
        expect(UsersNewInput.safeParse(valid).success).toBe(true);
    });

    it('accepts optional display_name and role', () => {
        expect(UsersNewInput.safeParse({ ...valid, display_name: 'Bob', role: 'admin' }).success).toBe(true);
    });

    it('rejects invalid role', () => {
        expect(UsersNewInput.safeParse({ ...valid, role: 'superadmin' }).success).toBe(false);
    });

    it('rejects empty username', () => {
        expect(UsersNewInput.safeParse({ ...valid, username: '' }).success).toBe(false);
    });

    it('rejects invalid username', () => {
        expect(UsersNewInput.safeParse({ ...valid, username: 'INVALID USER!' }).success).toBe(false);
        expect(UsersNewInput.safeParse({ ...valid, username: '1bob' }).success).toBe(false);
    });

    it('accepts username with digits and hyphens', () => {
        expect(UsersNewInput.safeParse({ ...valid, username: 'bob-2' }).success).toBe(true);
    });

    it('takes no password (dropped) and an optional reactivate', () => {
        const r = UsersNewInput.safeParse({ ...valid, password: 'securepass', reactivate: true });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data).toEqual({ ...valid, reactivate: true });
    });

    it('rejects invalid email', () => {
        expect(UsersNewInput.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    });

    it('rejects missing email', () => {
        expect(UsersNewInput.safeParse({ username: 'bob' }).success).toBe(false);
    });
});

describe('UsersUpdateInput', () => {
    it('accepts user_id + display_name', () => {
        expect(UsersUpdateInput.safeParse({ user_id: U1, display_name: 'Alice W' }).success).toBe(true);
    });

    it('accepts user_id + email', () => {
        expect(UsersUpdateInput.safeParse({ user_id: U1, email: 'alice@new.com' }).success).toBe(true);
    });

    it('rejects empty display_name', () => {
        expect(UsersUpdateInput.safeParse({ user_id: U1, display_name: '' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
        expect(UsersUpdateInput.safeParse({ user_id: U1, email: 'bad' }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(UsersUpdateInput.safeParse({ display_name: 'Alice' }).success).toBe(false);
    });
});

describe('UsersSuspendInput', () => {
    it('accepts with reason', () => {
        expect(UsersSuspendInput.safeParse({ user_id: U5, reason: 'spam' }).success).toBe(true);
    });

    it('accepts without reason', () => {
        expect(UsersSuspendInput.safeParse({ user_id: U5 }).success).toBe(true);
    });

    it('rejects missing user_id', () => {
        expect(UsersSuspendInput.safeParse({}).success).toBe(false);
    });
});

describe('UsersSetRoleInput', () => {
    it('accepts role=admin and role=user', () => {
        expect(UsersSetRoleInput.safeParse({ user_id: U1, role: 'admin' }).success).toBe(true);
        expect(UsersSetRoleInput.safeParse({ user_id: U1, role: 'user' }).success).toBe(true);
    });

    it('rejects invalid role', () => {
        expect(UsersSetRoleInput.safeParse({ user_id: U1, role: 'superadmin' }).success).toBe(false);
    });

    it('rejects missing role with "role is required"', () => {
        const r = UsersSetRoleInput.safeParse({ user_id: U1 });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe('role is required');
    });

    it('rejects missing user_id', () => {
        expect(UsersSetRoleInput.safeParse({ role: 'admin' }).success).toBe(false);
    });
});

describe('UsersResetPasswordInput (site admin)', () => {
    it('accepts user_id alone', () => {
        expect(UsersResetPasswordInput.safeParse({ user_id: U1 }).success).toBe(true);
    });

    it('rejects a typed password (a reset is an email)', () => {
        expect(UsersResetPasswordInput.safeParse({ user_id: U1, new_password: 'secure123' }).success).toBe(false);
    });

    it('rejects missing user_id', () => {
        expect(UsersResetPasswordInput.safeParse({}).success).toBe(false);
    });
});

describe('UsersForgotPasswordInput (public)', () => {
    it('accepts an email', () => {
        expect(UsersForgotPasswordInput.safeParse({ email: 'priya@example.test' }).success).toBe(true);
    });

    it('rejects a bad email and any extra field', () => {
        expect(UsersForgotPasswordInput.safeParse({ email: 'nope' }).success).toBe(false);
        expect(UsersForgotPasswordInput.safeParse({ email: 'priya@example.test', user_id: U1 }).success).toBe(false);
    });
});

describe('UsersUpdateRoleInput', () => {
    it('accepts valid params', () => {
        expect(UsersUpdateRoleInput.safeParse({ user_id: U1, org_id: ORG, role_id: ROLE }).success).toBe(true);
    });

    it('rejects missing role_id', () => {
        expect(UsersUpdateRoleInput.safeParse({ user_id: U1, org_id: ORG }).success).toBe(false);
    });

    it('rejects non-uuid user_id', () => {
        expect(UsersUpdateRoleInput.safeParse({ user_id: -1, org_id: ORG, role_id: ROLE }).success).toBe(false);
    });

    it('rejects missing org_id', () => {
        expect(UsersUpdateRoleInput.safeParse({ user_id: U1, role_id: ROLE }).success).toBe(false);
    });
});

describe('UsersUpdateProfileInput', () => {
    it('accepts display_name only', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: 'Alice' }).success).toBe(true);
    });

    it('accepts email only', () => {
        expect(UsersUpdateProfileInput.safeParse({ email: 'alice@test.com' }).success).toBe(true);
    });

    it('accepts both fields', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: 'Alice', email: 'alice@test.com' }).success).toBe(true);
    });

    it('accepts preferences only', () => {
        expect(UsersUpdateProfileInput.safeParse({ preferences: { theme: 'dark' } }).success).toBe(true);
    });

    it('accepts preferences with display_name', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: 'Alice', preferences: { theme: 'dark' } }).success).toBe(true);
    });

    it('rejects empty object (nothing to update)', () => {
        const r = UsersUpdateProfileInput.safeParse({});
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toMatch(/At least one field/);
    });

    it('rejects empty display_name', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: '' }).success).toBe(false);
    });

    it('rejects display_name over 100 chars', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: 'x'.repeat(101) }).success).toBe(false);
    });

    it('accepts display_name at 100 chars', () => {
        expect(UsersUpdateProfileInput.safeParse({ display_name: 'x'.repeat(100) }).success).toBe(true);
    });

    it('rejects invalid email format', () => {
        expect(UsersUpdateProfileInput.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });

    it('rejects email without domain', () => {
        expect(UsersUpdateProfileInput.safeParse({ email: 'user@' }).success).toBe(false);
    });
});

describe('UsersChangePasswordInput', () => {
    it('accepts valid params', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: 'old', new_password: 'newpass88' }).success).toBe(true);
    });

    it('rejects empty current_password', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: '', new_password: 'newpass88' }).success).toBe(false);
    });

    it('rejects short new_password (< 8 chars)', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: 'old', new_password: 'short' }).success).toBe(false);
    });

    it('accepts new_password at exactly 8 chars', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: 'old', new_password: '12345678' }).success).toBe(true);
    });

    it('rejects missing current_password', () => {
        expect(UsersChangePasswordInput.safeParse({ new_password: 'newpass88' }).success).toBe(false);
    });

    it('rejects missing new_password', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: 'old' }).success).toBe(false);
    });

    it('rejects a reset_token next to current_password', () => {
        expect(UsersChangePasswordInput.safeParse({ current_password: 'old', new_password: 'newpass88', reset_token: 't' }).success).toBe(false);
    });
});

describe('UsersResetWithTokenInput (public)', () => {
    it('accepts reset_token + new_password', () => {
        expect(UsersResetWithTokenInput.safeParse({ reset_token: 'tok', new_password: 'newpass88' }).success).toBe(true);
    });

    it('applies the password rule and rejects extra fields', () => {
        expect(UsersResetWithTokenInput.safeParse({ reset_token: 'tok', new_password: 'short' }).success).toBe(false);
        expect(UsersResetWithTokenInput.safeParse({ reset_token: '', new_password: 'newpass88' }).success).toBe(false);
        expect(UsersResetWithTokenInput.safeParse({ reset_token: 'tok', new_password: 'newpass88', current_password: 'x' }).success).toBe(false);
    });
});
