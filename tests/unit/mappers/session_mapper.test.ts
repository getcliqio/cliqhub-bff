import { describe, it, expect } from 'vitest';
import {
    scopes_from_slugs, parse_scope_slugs, parse_orgs_json, to_session_data, to_cli_login_data,
} from '../../../src/mappers/session_mapper.js';
import type { SessionRecord } from '../../../src/repositories/session_store.js';
import type { LoginData } from '../../../src/schemas/session_types.js';

const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const BOB_ID = '22222222-2222-4222-8222-222222222222';
const ORG = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'acme', name: 'Acme', default_realm_slug: 'default' };

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
    return {
        session_id: 'sid', user_id: ALICE_ID, act_as_user_id: ALICE_ID, username: 'alice', email: 'a@test.com',
        role: 'admin', actor_role: 'admin', actor_username: 'alice', user_token: 'u', target_token: 'u',
        scopes_json: '["alice"]', org_slugs_json: '["acme"]',
        default_realm_id: 'r1', default_realm_slug: 'default', default_realm_qualified: 'acme.default',
        actor_default_realm_id: 'r1', actor_default_realm_slug: 'default', actor_default_realm_qualified: 'acme.default',
        orgs_json: JSON.stringify([ORG]), created_at: 1700000000, last_active: 1700000000, expires_at: 1700003600,
        ...overrides,
    };
}

describe('scopes_from_slugs', () => {
    it('builds minimal private user scopes from slugs', () => {
        expect(scopes_from_slugs(['alice'])).toEqual([{
            id: '0', slug: 'alice', display_name: 'alice', owner_id: '0', org_id: null, visibility: 'private', scope_type: 'user',
        }]);
    });
});

describe('parse_scope_slugs', () => {
    it('reads strings and legacy { slug } rows, dropping empties', () => {
        expect(parse_scope_slugs(JSON.stringify(['a', { slug: 'b' }, {}, '']))).toEqual(['a', 'b']);
    });

    it('returns [] for a non-array', () => {
        expect(parse_scope_slugs('{}')).toEqual([]);
    });
});

describe('parse_orgs_json', () => {
    it('keeps orgs whose id is a string UUID', () => {
        expect(parse_orgs_json(JSON.stringify([ORG]))).toEqual([ORG]);
    });

    it('drops rows with a numeric id or no slug', () => {
        expect(parse_orgs_json(JSON.stringify([{ ...ORG, id: 1 }, { id: ORG.id }, null, ORG]))).toEqual([ORG]);
    });

    it('returns [] for empty, null, non-array or invalid JSON', () => {
        expect(parse_orgs_json(null)).toEqual([]);
        expect(parse_orgs_json(undefined)).toEqual([]);
        expect(parse_orgs_json('')).toEqual([]);
        expect(parse_orgs_json('{"a":1}')).toEqual([]);
        expect(parse_orgs_json('not json')).toEqual([]);
    });
});

describe('to_session_data', () => {
    it('maps the signed-in user from the session row', () => {
        const data = to_session_data(session());
        expect(data).toEqual({
            user: {
                id: ALICE_ID, username: 'alice', display_name: 'alice', email: 'a@test.com', role: 'admin',
                suspended_at: null, created_at: new Date(1700000000 * 1000).toISOString(), preferences: {},
            },
            scopes: scopes_from_slugs(['alice']),
            org_slugs: ['acme'],
            default_realm_id: 'r1',
            default_realm_slug: 'default',
            default_realm_qualified: 'acme.default',
            orgs: [ORG],
            acting_as: null,
        });
    });

    it('reports acting_as for an acted-as user', () => {
        const data = to_session_data(session({ act_as_user_id: BOB_ID, username: 'bob', role: 'user' }));
        expect(data.user.id).toBe(BOB_ID);
        expect(data.user.role).toBe('user');
        expect(data.acting_as).toEqual({ actor_id: ALICE_ID, actor_username: 'alice' });
    });
});

describe('to_cli_login_data', () => {
    it('flattens scopes to slugs and adds the bearer token', () => {
        const login: LoginData = {
            user: { id: ALICE_ID, username: 'alice', display_name: 'Alice', email: 'a@test.com', role: 'user', suspended_at: null, created_at: 'c', preferences: {} },
            scopes: scopes_from_slugs(['alice', 'acme']),
            org_slugs: ['acme'],
            default_realm_id: 'r1',
            default_realm_slug: 'default',
            default_realm_qualified: 'acme.default',
            enroll_token: 'enroll-1',
            orgs: [ORG],
        };

        const data = to_cli_login_data(login, 'cliq_tok_x');

        expect(data).toEqual({ ...login, scopes: ['alice', 'acme'], token: 'cliq_tok_x' });
        expect(login.scopes[0]).toHaveProperty('slug');
    });
});
