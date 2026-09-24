import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../../../src/services/session_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';
import type { EnvConfig } from '../../../src/config/env.js';
import type { SessionRecord } from '../../../src/repositories/session_store.js';

function test_config(): EnvConfig {
    return {
        port: 3001,
        backend_url: 'http://localhost:3000',
        core_api_url: 'http://localhost:3000',
        session_secret: 'test',
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
    };
}

const ALICE_USER = {
    id: 1,
    username: 'alice',
    display_name: 'Alice',
    email: 'alice@test.com',
    role: 'admin' as const,
    suspended_at: null,
    suspended_reason: '',
    created_at: '2025-01-01',
    preferences: {},
};

function base_session(overrides: Partial<SessionRecord> = {}): SessionRecord {
    const now = Math.floor(Date.now() / 1000);
    return {
        session_id: 'sid-1',
        user_id: 1,
        act_as_user_id: 1,
        username: 'alice',
        email: 'alice@test.com',
        role: 'admin',
        actor_role: 'admin',
        actor_username: 'alice',
        user_token: 'cliq_tok_user',
        target_token: 'cliq_tok_user',
        scopes_json: JSON.stringify(['alice']),
        org_slugs_json: JSON.stringify(['acme']),
        default_realm_id: 'realm-alice',
        default_realm_slug: 'default',
        default_realm_qualified: 'alice.default',
        actor_default_realm_id: 'realm-alice',
        actor_default_realm_slug: 'default',
        actor_default_realm_qualified: 'alice.default',
        orgs_json: JSON.stringify([
            { id: 1, slug: 'alice', name: 'alice', default_realm_slug: 'default' },
        ]),
        created_at: now,
        last_active: now,
        expires_at: now + 3600,
        ...overrides,
    };
}

describe('SessionService', () => {
    const mock_auth_repo = {
        authenticate_user: vi.fn(),
        signup: vi.fn(),
        issue_session_token: vi.fn(),
        revoke_session_token: vi.fn(),
        resolve_identity: vi.fn(),
        get_user_by_id: vi.fn(),
        list_scopes: vi.fn(),
    };

    const mock_session_store = {
        create: vi.fn(),
        destroy: vi.fn(),
        update_act_as: vi.fn(),
        restore_actor: vi.fn(),
    };

    let service: SessionService;

    beforeEach(() => {
        vi.resetAllMocks();
        mock_session_store.create.mockResolvedValue('session-123');
        mock_auth_repo.revoke_session_token.mockResolvedValue({ ok: true });
        service = new SessionService(
            mock_auth_repo as any,
            mock_session_store as any,
            test_config(),
        );
    });

    describe('create', () => {
        it('authenticates and stores equal user_token and target_token', async () => {
            mock_auth_repo.authenticate_user.mockResolvedValue({
                user: ALICE_USER,
                token: 'cliq_tok_login',
                scopes: ['alice'],
                org_slugs: ['acme'],
                default_realm_id: 'realm-alice',
                default_realm_slug: 'default',
                default_realm_qualified: 'alice.default',
                orgs: [{ id: 1, slug: 'alice', name: 'alice', default_realm_slug: 'default' }],
            });

            const { session_id, target_token, dto } = await service.create('alice', 'pass');

            expect(session_id).toBe('session-123');
            expect(target_token).toBe('cliq_tok_login');
            expect(dto.user.username).toBe('alice');
            expect(dto.default_realm_slug).toBe('default');
            expect(mock_session_store.create).toHaveBeenCalledTimes(1);
            const record = mock_session_store.create.mock.calls[0][0];
            expect(record.user_token).toBe('cliq_tok_login');
            expect(record.target_token).toBe('cliq_tok_login');
            expect(record.user_id).toBe(1);
            expect(record.act_as_user_id).toBe(1);
            expect(record.actor_role).toBe('admin');
            expect(record.default_realm_slug).toBe('default');
            expect(record.actor_default_realm_slug).toBe('default');
            expect(record.default_realm_qualified).toBe('alice.default');
            expect(JSON.parse(record.orgs_json)[0].slug).toBe('alice');
        });

        it('propagates ApiError on bad credentials', async () => {
            mock_auth_repo.authenticate_user.mockRejectedValue(
                new ApiError('unauthorized', 'Invalid credentials', 401),
            );
            await expect(service.create('alice', 'wrong')).rejects.toThrow(ApiError);
            expect(mock_session_store.create).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('returns identity without acting_as when tokens equal', async () => {
            const dto = await service.get(base_session());
            expect(dto.user.username).toBe('alice');
            expect(dto.acting_as).toBeNull();
            expect(dto.org_slugs).toEqual(['acme']);
            expect(dto.default_realm_slug).toBe('default');
            expect(dto.default_realm_qualified).toBe('alice.default');
            expect(dto.orgs?.[0]?.slug).toBe('alice');
        });

        it('returns acting_as when act_as_user_id differs', async () => {
            const dto = await service.get(base_session({
                act_as_user_id: 2,
                username: 'bob',
                target_token: 'cliq_tok_bob',
                default_realm_slug: 'bob-default',
                default_realm_qualified: 'bob.default',
            }));
            expect(dto.user.username).toBe('bob');
            expect(dto.acting_as).toEqual({
                actor_id: 1,
                actor_username: 'alice',
            });
            expect(dto.default_realm_slug).toBe('bob-default');
        });
    });

    describe('update act-as', () => {
        it('changes only target_token and act_as_user_id; user_token unchanged', async () => {
            const session = base_session();
            mock_auth_repo.issue_session_token.mockResolvedValue({
                user_id: 2,
                token: 'cliq_tok_bob',
                default_realm_id: 'realm-bob',
                default_realm_slug: 'default',
                default_realm_qualified: 'bob.default',
                orgs: [{ id: 2, slug: 'bob', name: 'bob', default_realm_slug: 'default' }],
            });
            mock_auth_repo.get_user_by_id.mockResolvedValue({
                id: 2,
                username: 'bob',
                display_name: 'Bob',
                email: 'bob@test.com',
                role: 'user',
                suspended_at: null,
                orgs: [{ slug: 'acme' }],
            });
            mock_auth_repo.list_scopes.mockResolvedValue({ scopes: ['bob'] });

            const dto = await service.update(session, 2);

            expect(dto.user.username).toBe('bob');
            expect(dto.acting_as?.actor_id).toBe(1);
            expect(dto.default_realm_slug).toBe('default');
            expect(dto.default_realm_qualified).toBe('bob.default');
            expect(mock_session_store.update_act_as).toHaveBeenCalledWith(
                'sid-1',
                expect.objectContaining({
                    act_as_user_id: 2,
                    target_token: 'cliq_tok_bob',
                    default_realm_slug: 'default',
                    default_realm_qualified: 'bob.default',
                }),
            );
            const update_arg = mock_session_store.update_act_as.mock.calls[0][1];
            expect(update_arg).not.toHaveProperty('user_token');
            expect(update_arg).not.toHaveProperty('user_id');
            expect(mock_auth_repo.issue_session_token).toHaveBeenCalledWith(2, 'cliq_tok_user');
        });

        it('revokes previous target when distinct from user_token', async () => {
            const session = base_session({
                act_as_user_id: 3,
                target_token: 'cliq_tok_old_target',
            });
            mock_auth_repo.issue_session_token.mockResolvedValue({
                user_id: 2,
                token: 'cliq_tok_bob',
            });
            mock_auth_repo.get_user_by_id.mockResolvedValue({
                id: 2,
                username: 'bob',
                display_name: 'Bob',
                email: 'bob@test.com',
                role: 'user',
                suspended_at: null,
                orgs: [],
            });
            mock_auth_repo.list_scopes.mockResolvedValue({ scopes: [] });

            await service.update(session, 2);

            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_old_target');
        });

        it('rejects non-admin actor', async () => {
            await expect(
                service.update(base_session({ actor_role: 'user', role: 'user' }), 2),
            ).rejects.toThrow(ApiError);
        });
    });

    describe('update exit act-as', () => {
        it('restores target_token to user_token and clears acting_as', async () => {
            const session = base_session({
                act_as_user_id: 2,
                username: 'bob',
                target_token: 'cliq_tok_bob',
                default_realm_slug: 'bob-default',
            });
            mock_auth_repo.resolve_identity.mockResolvedValue({
                user: ALICE_USER,
                scopes: ['alice'],
                org_slugs: ['acme'],
            });

            const dto = await service.update(session, null);

            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_bob');
            expect(mock_session_store.restore_actor).toHaveBeenCalled();
            expect(dto.acting_as).toBeNull();
            expect(dto.user.id).toBe(1);
            expect(dto.default_realm_slug).toBe('default');
            expect(dto.default_realm_qualified).toBe('alice.default');
        });
    });

    describe('delete', () => {
        it('revokes both tokens when distinct and destroys session', async () => {
            const session = base_session({
                target_token: 'cliq_tok_bob',
                act_as_user_id: 2,
            });
            await service.delete(session);
            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_user');
            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_bob');
            expect(mock_session_store.destroy).toHaveBeenCalledWith('sid-1');
        });

        it('revokes once when tokens are equal', async () => {
            await service.delete(base_session());
            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledTimes(1);
            expect(mock_auth_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_user');
        });
    });
});
