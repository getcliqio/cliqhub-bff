import { describe, it, expect } from 'vitest';
import { SessionCreateInput, SessionUpdateInput } from '../../../src/schemas/session_types.js';

describe('SessionCreateInput', () => {
    it('accepts valid input', () => {
        expect(SessionCreateInput.safeParse({ username: 'alice', password: 'pass' }).success).toBe(true);
    });

    it('rejects empty username', () => {
        expect(SessionCreateInput.safeParse({ username: '', password: 'pass' }).success).toBe(false);
    });

    it('rejects empty password', () => {
        expect(SessionCreateInput.safeParse({ username: 'alice', password: '' }).success).toBe(false);
    });

    it('rejects missing fields', () => {
        expect(SessionCreateInput.safeParse({}).success).toBe(false);
    });
});

describe('SessionUpdateInput', () => {
    it('accepts a user UUID to act as', () => {
        expect(SessionUpdateInput.safeParse({ act_as_user_id: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
    });

    it('accepts null to stop acting as', () => {
        const r = SessionUpdateInput.safeParse({ act_as_user_id: null });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.act_as_user_id).toBeNull();
    });

    it('rejects numeric or non-uuid ids', () => {
        expect(SessionUpdateInput.safeParse({ act_as_user_id: 2 }).success).toBe(false);
        expect(SessionUpdateInput.safeParse({ act_as_user_id: 'bob' }).success).toBe(false);
    });

    it('rejects a missing act_as_user_id', () => {
        expect(SessionUpdateInput.safeParse({}).success).toBe(false);
    });
});
