import { describe, it, expect } from 'vitest';
import { update_profile_schema, change_password_schema } from '../../../src/schemas/account_schemas.js';

describe('update_profile_schema', () => {
    it('accepts display_name only', () => {
        expect(update_profile_schema.safeParse({ display_name: 'Alice' }).success).toBe(true);
    });

    it('accepts email only', () => {
        expect(update_profile_schema.safeParse({ email: 'alice@test.com' }).success).toBe(true);
    });

    it('accepts both fields', () => {
        expect(update_profile_schema.safeParse({ display_name: 'Alice', email: 'alice@test.com' }).success).toBe(true);
    });

    it('accepts preferences only', () => {
        expect(update_profile_schema.safeParse({ preferences: { theme: 'dark' } }).success).toBe(true);
    });

    it('accepts preferences with display_name', () => {
        expect(update_profile_schema.safeParse({ display_name: 'Alice', preferences: { theme: 'dark' } }).success).toBe(true);
    });

    it('rejects empty object (nothing to update)', () => {
        expect(update_profile_schema.safeParse({}).success).toBe(false);
    });

    it('rejects empty display_name', () => {
        expect(update_profile_schema.safeParse({ display_name: '' }).success).toBe(false);
    });

    it('rejects display_name over 100 chars', () => {
        expect(update_profile_schema.safeParse({ display_name: 'x'.repeat(101) }).success).toBe(false);
    });

    it('accepts display_name at 100 chars', () => {
        expect(update_profile_schema.safeParse({ display_name: 'x'.repeat(100) }).success).toBe(true);
    });

    it('rejects invalid email format', () => {
        expect(update_profile_schema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });

    it('rejects email without domain', () => {
        expect(update_profile_schema.safeParse({ email: 'user@' }).success).toBe(false);
    });
});

describe('change_password_schema', () => {
    it('accepts valid params', () => {
        expect(change_password_schema.safeParse({ current_password: 'old', new_password: 'newpass88' }).success).toBe(true);
    });

    it('rejects empty current_password', () => {
        expect(change_password_schema.safeParse({ current_password: '', new_password: 'newpass88' }).success).toBe(false);
    });

    it('rejects short new_password (< 8 chars)', () => {
        expect(change_password_schema.safeParse({ current_password: 'old', new_password: 'short' }).success).toBe(false);
    });

    it('accepts new_password at exactly 8 chars', () => {
        expect(change_password_schema.safeParse({ current_password: 'old', new_password: '12345678' }).success).toBe(true);
    });

    it('rejects missing current_password', () => {
        expect(change_password_schema.safeParse({ new_password: 'newpass88' }).success).toBe(false);
    });

    it('rejects missing new_password', () => {
        expect(change_password_schema.safeParse({ current_password: 'old' }).success).toBe(false);
    });
});
