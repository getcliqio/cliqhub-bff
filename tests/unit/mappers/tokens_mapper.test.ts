import { describe, it, expect } from 'vitest';
import {
    to_token_data, to_tokens_generate_data, to_tokens_get_data, to_tokens_revoke_data, to_tokens_rotate_data,
} from '../../../src/mappers/tokens_mapper.js';
import { TokensGenerateInput, TokensRotateInput } from '../../../src/schemas/tokens_types.js';

const gen = (body: unknown) => TokensGenerateInput.parse(body);
const rot = (body: unknown) => TokensRotateInput.parse(body);

describe('to_token_data', () => {
    it('maps all token fields', () => {
        const data = to_token_data({
            id: 42, name: 'CI pipeline', permissions: { access: { teams: ['read'] } },
            created_at: '2025-03-15T10:00:00Z', last_used_at: '2025-03-20T14:30:00Z',
        });
        expect(data).toEqual({
            id: 42, name: 'CI pipeline', permissions: { access: { teams: ['read'] } },
            created_at: '2025-03-15T10:00:00Z', last_used_at: '2025-03-20T14:30:00Z',
        });
    });

    it('defaults permissions to {} and preserves null last_used_at', () => {
        const data = to_token_data({ id: 1, name: 'CLI', created_at: '2025-01-01T00:00:00Z', last_used_at: null } as never);
        expect(data.permissions).toEqual({});
        expect(data.last_used_at).toBeNull();
    });
});

describe('to_tokens_generate_data', () => {
    it('user: secret, name, id and realm_ids (default [])', () => {
        expect(to_tokens_generate_data({ token: 't', name: 'CI', id: 9, bearer: 'x' }, gen({ name: 'CI' })))
            .toEqual({ token: 't', name: 'CI', id: 9, realm_ids: [] });
    });

    it('user: keeps Core realm_ids', () => {
        expect(to_tokens_generate_data({ token: 't', name: 'CI', id: 9, realm_ids: ['r1'] }, gen({ realm_ids: ['r1'] })).realm_ids)
            .toEqual(['r1']);
    });

    it('realm: same shape as user', () => {
        expect(to_tokens_generate_data({ token: 't', name: 'R', id: 3, realm_ids: ['r1'] }, gen({ type: 'realm', realm_id: 'r1' })))
            .toEqual({ token: 't', name: 'R', id: 3, realm_ids: ['r1'] });
    });

    it('a2a: bearer fields, falling back to the input realm', () => {
        const data = to_tokens_generate_data({ token: 'cliq_tok_a2a' } as never, gen({ type: 'a2a', realm_id: 'realm-1' }));
        expect(data).toEqual({
            token: 'cliq_tok_a2a', bearer: 'cliq_tok_a2a', name: 'a2a', realm_id: 'realm-1', realm_ids: ['realm-1'],
            has_bearer: undefined, bearer_prefix: undefined,
        });
    });

    it('a2a: Core fields win', () => {
        const data = to_tokens_generate_data(
            { token: 't', bearer: 'b', name: 'agent', realm_id: 'realm-2', realm_ids: ['realm-2'], has_bearer: true, bearer_prefix: 'cliq_' },
            gen({ type: 'a2a', realm_id: 'realm-1' }),
        );
        expect(data).toMatchObject({ bearer: 'b', name: 'agent', realm_id: 'realm-2', realm_ids: ['realm-2'], has_bearer: true, bearer_prefix: 'cliq_' });
    });

    it('daemon_wire: lifetime, no bearer or id', () => {
        const data = to_tokens_generate_data({ token: 'cliq_dt_x', id: 5, expires_in: 300 } as never, gen({ type: 'daemon_wire', realm_id: 'r1' }));
        expect(data).toEqual({ token: 'cliq_dt_x', name: 'daemon_wire', realm_id: 'r1', realm_ids: ['r1'], expires_in: 300 });
    });
});

describe('to_tokens_get_data', () => {
    it('maps tokens and total', () => {
        const data = to_tokens_get_data({ tokens: [{ id: 1, name: 'CLI', permissions: {}, created_at: 'c', last_used_at: null }], total: 1 });
        expect(data).toEqual({ tokens: [{ id: 1, name: 'CLI', permissions: {}, created_at: 'c', last_used_at: null }], total: 1 });
    });

    it('defaults missing tokens and total', () => {
        expect(to_tokens_get_data({} as never)).toEqual({ tokens: [], total: 0 });
    });
});

describe('to_tokens_revoke_data', () => {
    it('keeps only revoked', () => {
        expect(to_tokens_revoke_data({ revoked: true, type: 'user' })).toEqual({ revoked: true });
    });
});

describe('to_tokens_rotate_data', () => {
    it('user: only the new secret', () => {
        expect(to_tokens_rotate_data({ token: 'new', type: 'user', bearer: 'x' }, rot({ token_id: 5 }))).toEqual({ token: 'new' });
    });

    it('a2a: bearer fields with type, falling back to the input realm', () => {
        expect(to_tokens_rotate_data({ token: 'new' }, rot({ type: 'a2a', realm_id: 'realm-1' }))).toEqual({
            token: 'new', bearer: 'new', type: 'a2a', realm_id: 'realm-1', has_bearer: undefined, bearer_prefix: undefined,
        });
    });
});
