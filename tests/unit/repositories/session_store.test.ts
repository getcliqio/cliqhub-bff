import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionStore } from '../../../src/repositories/session_store.js';
import type { EnvConfig } from '../../../src/config/env.js';

function make_config(overrides: Partial<EnvConfig> = {}): EnvConfig {
    return {
        port: 3001,
        backend_url: 'http://localhost:3000',
        core_api_url: 'http://localhost:3000',
        session_secret: 'test-secret',
        session_ttl_seconds: 3600,
        session_idle_seconds: 600,
        database_url: 'postgres://test:test@localhost:5432/test',
        cookie_name: 'sid',
        cors_origins: [],
        node_env: 'test',
        rate_limit_builder_anon: 5,
        rate_limit_builder_auth: 30,
        rate_limit_window_ms: 60000,
        static_dir: '',
        ...overrides,
    };
}

function make_record() {
    const now = Math.floor(Date.now() / 1000);
    return {
        user_id: 1,
        act_as_user_id: 1,
        username: 'alice',
        email: 'alice@test.com',
        role: 'user' as const,
        actor_role: 'user' as const,
        actor_username: 'alice',
        user_token: 'cliq_tok_user',
        target_token: 'cliq_tok_user',
        scopes_json: JSON.stringify(['alice']),
        org_slugs_json: JSON.stringify(['acme']),
        default_realm_id: 'realm-1',
        default_realm_slug: 'default',
        default_realm_qualified: 'alice.default',
        actor_default_realm_id: 'realm-1',
        actor_default_realm_slug: 'default',
        actor_default_realm_qualified: 'alice.default',
        orgs_json: '[]',
        created_at: now,
        last_active: now,
        expires_at: now + 3600,
    };
}

function make_mock_pool() {
    return {
        query: vi.fn(),
        end: vi.fn(),
    };
}

describe('SessionStore', () => {
    let store: SessionStore;
    let pool: ReturnType<typeof make_mock_pool>;

    beforeEach(() => {
        pool = make_mock_pool();
        store = SessionStore.from_pool(pool as any, make_config());
    });

    describe('init', () => {
        it('creates schema and dual-token table with default_realm columns', async () => {
            pool.query.mockResolvedValue({});
            await store.init();
            expect(pool.query).toHaveBeenCalled();
            const sql = pool.query.mock.calls.map((c) => String(c[0])).join('\n');
            expect(sql).toContain('CREATE SCHEMA');
            expect(sql).toContain('user_token');
            expect(sql).toContain('target_token');
            expect(sql).toContain('act_as_user_id');
            expect(sql).toContain('default_realm_slug');
            expect(sql).toContain('actor_default_realm_slug');
            expect(sql).toContain('orgs_json');
        });
    });

    describe('create', () => {
        it('inserts both tokens and default_realm fields and returns a UUID', async () => {
            pool.query.mockResolvedValue({});
            const sid = await store.create(make_record());
            expect(sid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
            );
            const [, params] = pool.query.mock.calls[0];
            expect(params).toContain('cliq_tok_user');
            expect(params[1]).toBe(1); // user_id
            expect(params[2]).toBe(1); // act_as_user_id
            expect(params).toContain('default');
            expect(params).toContain('alice.default');
        });
    });

    describe('update_act_as', () => {
        it('updates target fields without touching user_token column in SET list', async () => {
            pool.query.mockResolvedValue({});
            await store.update_act_as('sid-1', {
                act_as_user_id: 2,
                username: 'bob',
                email: 'bob@test.com',
                role: 'user',
                target_token: 'cliq_tok_bob',
                scopes_json: '[]',
                org_slugs_json: '[]',
                default_realm_id: 'realm-bob',
                default_realm_slug: 'default',
                default_realm_qualified: 'bob.default',
                orgs_json: '[]',
            });
            const [sql] = pool.query.mock.calls[0];
            expect(sql).toContain('target_token');
            expect(sql).toContain('act_as_user_id');
            expect(sql).toContain('default_realm_slug');
            expect(sql).not.toMatch(/user_token\s*=/);
        });
    });

    describe('restore_actor', () => {
        it('sets target_token = user_token and restores default_realm from actor_*', async () => {
            pool.query.mockResolvedValue({});
            await store.restore_actor('sid-1', {
                username: 'alice',
                email: 'alice@test.com',
                role: 'user',
                scopes_json: '[]',
                org_slugs_json: '[]',
                orgs_json: '[]',
            });
            const [sql] = pool.query.mock.calls[0];
            expect(sql).toContain('act_as_user_id = user_id');
            expect(sql).toContain('target_token = user_token');
            expect(sql).toContain('default_realm_id = actor_default_realm_id');
            expect(sql).toContain('default_realm_slug = actor_default_realm_slug');
        });
    });
});
