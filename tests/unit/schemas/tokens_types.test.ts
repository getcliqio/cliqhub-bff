import { describe, it, expect } from 'vitest';
import {
    TokensGenerateInput, TokensGetInput, TokensRevokeInput, TokensRotateInput,
} from '../../../src/schemas/tokens_types.js';

describe('TokensGenerateInput', () => {
    it('accepts empty body and defaults type to user', () => {
        const r = TokensGenerateInput.safeParse({});
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.type).toBe('user');
    });

    it('accepts valid name', () => {
        const r = TokensGenerateInput.safeParse({ name: 'CI pipeline' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.name).toBe('CI pipeline');
    });

    it('rejects name over 100 chars', () => {
        expect(TokensGenerateInput.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
    });

    it('accepts type a2a with realm_id', () => {
        const r = TokensGenerateInput.safeParse({ type: 'a2a', realm_id: 'realm-1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.type).toBe('a2a');
    });

    it('rejects type a2a without realm_id', () => {
        expect(TokensGenerateInput.safeParse({ type: 'a2a' }).success).toBe(false);
    });

    it('rejects type daemon_wire without realm_id', () => {
        expect(TokensGenerateInput.safeParse({ type: 'daemon_wire', aud: 'edge-1' }).success).toBe(false);
        expect(TokensGenerateInput.safeParse({ type: 'daemon_wire', realm_id: 'r1', action: 'execute' }).success).toBe(true);
    });

    it('rejects an empty realm_ids list', () => {
        expect(TokensGenerateInput.safeParse({ realm_ids: [] }).success).toBe(false);
    });

    it('validates permission access levels', () => {
        expect(TokensGenerateInput.safeParse({ permissions: { access: { teams: ['read', 'write'] } } }).success).toBe(true);
        expect(TokensGenerateInput.safeParse({ permissions: { access: { teams: ['owner'] } } }).success).toBe(false);
        expect(TokensGenerateInput.safeParse({ permissions: { access: { teams: [] } } }).success).toBe(false);
    });
});

describe('TokensGetInput', () => {
    it('defaults type to user', () => {
        const r = TokensGetInput.safeParse({});
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.type).toBe('user');
    });

    it('rejects limit over 100', () => {
        expect(TokensGetInput.safeParse({ limit: 101 }).success).toBe(false);
    });
});

describe('TokensRevokeInput', () => {
    it('accepts valid positive integer token_id', () => {
        expect(TokensRevokeInput.safeParse({ token_id: 5 }).success).toBe(true);
    });

    it('rejects missing token_id', () => {
        expect(TokensRevokeInput.safeParse({}).success).toBe(false);
    });

    it('rejects non-integer token_id', () => {
        expect(TokensRevokeInput.safeParse({ token_id: 1.5 }).success).toBe(false);
    });

    it('rejects zero token_id', () => {
        expect(TokensRevokeInput.safeParse({ token_id: 0 }).success).toBe(false);
    });

    it('rejects negative token_id', () => {
        expect(TokensRevokeInput.safeParse({ token_id: -1 }).success).toBe(false);
    });

    it('rejects daemon token type (no alias)', () => {
        expect(TokensRevokeInput.safeParse({ type: 'daemon', token_id: 'abc', realm_id: 'r1' }).success).toBe(false);
    });

    it('accepts realm token type with string token_id', () => {
        const r = TokensRevokeInput.safeParse({ type: 'realm', token_id: 'abc', realm_id: 'r1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.type).toBe('realm');
    });
});

describe('TokensRotateInput', () => {
    it('accepts user rotate with token_id', () => {
        expect(TokensRotateInput.safeParse({ type: 'user', token_id: 5 }).success).toBe(true);
    });

    it('rejects user rotate without token_id', () => {
        expect(TokensRotateInput.safeParse({ type: 'user' }).success).toBe(false);
    });

    it('rejects default-type rotate without token_id', () => {
        expect(TokensRotateInput.safeParse({}).success).toBe(false);
    });

    it('accepts type a2a with realm_id', () => {
        const r = TokensRotateInput.safeParse({ type: 'a2a', realm_id: 'realm-1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.type).toBe('a2a');
    });

    it('rejects type a2a without realm_id', () => {
        expect(TokensRotateInput.safeParse({ type: 'a2a' }).success).toBe(false);
    });
});
