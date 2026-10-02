import { describe, it, expect } from 'vitest';
import { AuthSignupInput } from '../../../src/schemas/auth_types.js';

describe('AuthSignupInput', () => {
    it('accepts valid input (no account_slug: derived from username)', () => {
        expect(AuthSignupInput.safeParse({ username: 'bob', email: 'bob@test.com', password: '12345678' }).success).toBe(true);
    });

    it('rejects short password', () => {
        expect(AuthSignupInput.safeParse({ username: 'bob', email: 'bob@test.com', password: '1234567' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
        expect(AuthSignupInput.safeParse({ username: 'bob', email: 'not-an-email', password: '12345678' }).success).toBe(false);
    });

    it('rejects empty username', () => {
        expect(AuthSignupInput.safeParse({ username: '', email: 'bob@test.com', password: '12345678' }).success).toBe(false);
    });

    it('rejects username over 40 chars', () => {
        expect(AuthSignupInput.safeParse({ username: 'a'.repeat(41), email: 'bob@test.com', password: '12345678' }).success).toBe(false);
    });
});
