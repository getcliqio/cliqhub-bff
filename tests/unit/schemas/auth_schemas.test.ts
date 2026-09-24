import { describe, it, expect } from 'vitest';
import {
    login_schema, signup_schema,
    new_token_schema, revoke_token_schema, rotate_token_schema,
} from '../../../src/schemas/auth_schemas.js';

describe('login_schema', () => {
    it('accepts valid input', () => {
        const result = login_schema.safeParse({ username: 'alice', password: 'pass' });
        expect(result.success).toBe(true);
    });

    it('rejects empty username', () => {
        const result = login_schema.safeParse({ username: '', password: 'pass' });
        expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
        const result = login_schema.safeParse({ username: 'alice', password: '' });
        expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
        const result = login_schema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe('signup_schema', () => {
    it('accepts valid input', () => {
        const result = signup_schema.safeParse({
            username: 'bob', email: 'bob@test.com', password: '12345678',
        });
        expect(result.success).toBe(true);
    });

    it('accepts signup without account_slug (derived from username)', () => {
        const result = signup_schema.safeParse({
            username: 'bob', email: 'bob@test.com', password: '12345678',
        });
        expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
        const result = signup_schema.safeParse({
            username: 'bob', email: 'bob@test.com', password: '1234567',
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
        const result = signup_schema.safeParse({
            username: 'bob', email: 'not-an-email', password: '12345678',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty username', () => {
        const result = signup_schema.safeParse({
            username: '', email: 'bob@test.com', password: '12345678',
        });
        expect(result.success).toBe(false);
    });

    it('rejects username over 40 chars', () => {
        const result = signup_schema.safeParse({
            username: 'a'.repeat(41), email: 'bob@test.com', password: '12345678',
        });
        expect(result.success).toBe(false);
    });
});

describe('new_token_schema', () => {
    it('accepts empty body (name is optional)', () => {
        const result = new_token_schema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('accepts valid name', () => {
        const result = new_token_schema.safeParse({ name: 'CI pipeline' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.name).toBe('CI pipeline');
    });

    it('rejects name over 100 chars', () => {
        const result = new_token_schema.safeParse({ name: 'a'.repeat(101) });
        expect(result.success).toBe(false);
    });

    it('accepts type a2a with realm_id', () => {
        const result = new_token_schema.safeParse({ type: 'a2a', realm_id: 'realm-1' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.type).toBe('a2a');
    });

    it('rejects type a2a without realm_id', () => {
        const result = new_token_schema.safeParse({ type: 'a2a' });
        expect(result.success).toBe(false);
    });
});

describe('revoke_token_schema', () => {
    it('accepts valid positive integer token_id', () => {
        const result = revoke_token_schema.safeParse({ token_id: 5 });
        expect(result.success).toBe(true);
    });

    it('rejects missing token_id', () => {
        const result = revoke_token_schema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('rejects non-integer token_id', () => {
        const result = revoke_token_schema.safeParse({ token_id: 1.5 });
        expect(result.success).toBe(false);
    });

    it('rejects zero token_id', () => {
        const result = revoke_token_schema.safeParse({ token_id: 0 });
        expect(result.success).toBe(false);
    });

    it('rejects negative token_id', () => {
        const result = revoke_token_schema.safeParse({ token_id: -1 });
        expect(result.success).toBe(false);
    });

    it('rejects daemon token type (no alias)', () => {
        const result = revoke_token_schema.safeParse({ type: 'daemon', token_id: 'abc', realm_id: 'r1' });
        expect(result.success).toBe(false);
    });

    it('accepts realm token type with string token_id', () => {
        const result = revoke_token_schema.safeParse({ type: 'realm', token_id: 'abc', realm_id: 'r1' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.type).toBe('realm');
    });
});

describe('rotate_token_schema', () => {
    it('accepts user rotate with token_id', () => {
        const result = rotate_token_schema.safeParse({ type: 'user', token_id: 5 });
        expect(result.success).toBe(true);
    });

    it('rejects user rotate without token_id', () => {
        const result = rotate_token_schema.safeParse({ type: 'user' });
        expect(result.success).toBe(false);
    });

    it('accepts type a2a with realm_id', () => {
        const result = rotate_token_schema.safeParse({ type: 'a2a', realm_id: 'realm-1' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.type).toBe('a2a');
    });

    it('rejects type a2a without realm_id', () => {
        const result = rotate_token_schema.safeParse({ type: 'a2a' });
        expect(result.success).toBe(false);
    });
});
