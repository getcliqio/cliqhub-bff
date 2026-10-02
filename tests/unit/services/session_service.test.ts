import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../../../src/services/session_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import type { SessionRecord } from '../../../src/repositories/session_store.js';
import { test_config } from '../../helpers/test_container.js';

const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const BOB_ID = '22222222-2222-4222-8222-222222222222';
const CAROL_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const ALICE_USER = {
    id: ALICE_ID,
    username: 'alice',
    display_name: 'Alice',
    email: 'alice@test.com',
    role: 'admin' as const,
    suspended_at: null,
    suspended_reason: 'internal note',
    created_at: '2025-01-01',
    preferences: { theme: 'dark' },
};

const ALICE_ORG = { id: ORG_ALICE, slug: 'alice', name: 'alice', default_realm_slug: 'default' };

function base_session(overrides: Partial<SessionRecord> = {}): SessionRecord {
    const now = Math.floor(Date.now() / 1000);
    return {
        session_id: 'sid-1',
        user_id: ALICE_ID,
        act_as_user_id: ALICE_ID,
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
        orgs_json: JSON.stringify([ALICE_ORG]),
        created_at: now,
        last_active: now,
        expires_at: now + 3600,
        ...overrides,
    };
}

describe('SessionService', () => {
    const mock_identity_repo = {
        authenticate_user: vi.fn(),
        signup: vi.fn(),
        issue_session_token: vi.fn(),
        revoke_session_token: vi.fn(),
        resolve_identity: vi.fn(),
        get_user_by_id: vi.fn(),
        list_scope_slugs: vi.fn(),
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
        mock_identity_repo.revoke_session_token.mockResolvedValue(undefined);
        service = new SessionService(mock_identity_repo as any, mock_session_store as any, test_config());
    });

    describe('create', () => {
        it('authenticates and stores equal user_token and target_token', async () => {
            mock_identity_repo.authenticate_user.mockResolvedValue({
                user: ALICE_USER,
                token: 'cliq_tok_login',
                scopes: ['alice'],
                org_slugs: ['acme'],
                default_realm_id: 'realm-alice',
                default_realm_slug: 'default',
                default_realm_qualified: 'alice.default',
                enroll_token: 'enroll-1',
                orgs: [ALICE_ORG],
            });

            const { session_id, target_token, login } = await service.create({ username: '  Alice ', password: 'pass' });

            expect(mock_identity_repo.authenticate_user).toHaveBeenCalledWith('alice', 'pass');
            expect(session_id).toBe('session-123');
            expect(target_token).toBe('cliq_tok_login');
            expect(login.user.username).toBe('alice');
            expect(login.user).not.toHaveProperty('suspended_reason');
            expect(login.user.preferences).toEqual({ theme: 'dark' });
            expect(login.scopes.map((s) => s.slug)).toEqual(['alice']);
            expect(login.org_slugs).toEqual(['acme']);
            expect(login.default_realm_slug).toBe('default');
            expect(login.default_realm_qualified).toBe('alice.default');
            expect(login.enroll_token).toBe('enroll-1');
            expect(login.orgs).toEqual([ALICE_ORG]);

            expect(mock_session_store.create).toHaveBeenCalledTimes(1);
            const record = mock_session_store.create.mock.calls[0][0];
            expect(record.user_token).toBe('cliq_tok_login');
            expect(record.target_token).toBe('cliq_tok_login');
            expect(record.user_id).toBe(ALICE_ID);
            expect(record.act_as_user_id).toBe(ALICE_ID);
            expect(record.actor_role).toBe('admin');
            expect(record.default_realm_slug).toBe('default');
            expect(record.actor_default_realm_slug).toBe('default');
            expect(record.default_realm_qualified).toBe('alice.default');
            expect(record.actor_default_realm_qualified).toBe('alice.default');
            expect(JSON.parse(record.scopes_json)).toEqual(['alice']);
            expect(JSON.parse(record.orgs_json)[0].slug).toBe('alice');
            expect(record.expires_at - record.created_at).toBe(test_config().session_ttl_seconds);
        });

        it('defaults optional sign-in fields', async () => {
            mock_identity_repo.authenticate_user.mockResolvedValue({
                user: { ...ALICE_USER, role: 'user' }, token: 't',
            });

            const { login } = await service.create({ username: 'alice', password: 'pass' });

            expect(login).toMatchObject({
                scopes: [], org_slugs: [], default_realm_id: null, default_realm_slug: null,
                default_realm_qualified: null, enroll_token: null, orgs: [],
            });
            expect(mock_session_store.create.mock.calls[0][0].actor_role).toBe('user');
        });

        it('propagates ApiError on bad credentials', async () => {
            mock_identity_repo.authenticate_user.mockRejectedValue(new ApiError('unauthorized', 'Invalid credentials', 401));
            await expect(service.create({ username: 'alice', password: 'wrong' })).rejects.toThrow(ApiError);
            expect(mock_session_store.create).not.toHaveBeenCalled();
        });
    });

    describe('create_from_signup', () => {
        it('signs up (lower-cased) and stores the identity scopes and org slugs', async () => {
            mock_identity_repo.signup.mockResolvedValue({
                user: { ...ALICE_USER, role: 'user' }, token: 'cliq_tok_new',
                default_realm_slug: 'default', enroll_token: 'enroll-1',
            });
            mock_identity_repo.resolve_identity.mockResolvedValue({ user: ALICE_USER, scopes: ['alice'], org_slugs: ['alice'] });

            const { target_token, login } = await service.create_from_signup({
                username: ' Alice ', email: 'Alice@Test.com', password: '12345678',
            });

            expect(mock_identity_repo.signup).toHaveBeenCalledWith('alice', 'alice@test.com', '12345678');
            expect(mock_identity_repo.resolve_identity).toHaveBeenCalledWith('cliq_tok_new');
            expect(target_token).toBe('cliq_tok_new');
            expect(login.scopes.map((s) => s.slug)).toEqual(['alice']);
            expect(login.org_slugs).toEqual(['alice']);
            expect(login.enroll_token).toBe('enroll-1');
            expect(login.default_realm_slug).toBe('default');
        });

        it('still creates the session when resolving the identity fails', async () => {
            mock_identity_repo.signup.mockResolvedValue({ user: ALICE_USER, token: 'cliq_tok_new' });
            mock_identity_repo.resolve_identity.mockRejectedValue(new Error('down'));

            const { login } = await service.create_from_signup({ username: 'alice', email: 'a@test.com', password: '12345678' });

            expect(login.scopes).toEqual([]);
            expect(login.org_slugs).toEqual([]);
            expect(mock_session_store.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('create_from_backend_token', () => {
        it('resolves the PAT and stores it as both tokens with no default realm', async () => {
            mock_identity_repo.resolve_identity.mockResolvedValue({ user: ALICE_USER, scopes: ['alice'], org_slugs: ['acme'] });

            const { session_id, target_token, login } = await service.create_from_backend_token('cliq_tok_invite');

            expect(mock_identity_repo.resolve_identity).toHaveBeenCalledWith('cliq_tok_invite');
            expect(session_id).toBe('session-123');
            expect(target_token).toBe('cliq_tok_invite');
            expect(login.default_realm_id).toBeNull();
            expect(login.enroll_token).toBeNull();
            const record = mock_session_store.create.mock.calls[0][0];
            expect(record.user_token).toBe('cliq_tok_invite');
            expect(record.target_token).toBe('cliq_tok_invite');
        });
    });

    describe('hydrate_bearer', () => {
        it('returns null for daemon tokens without calling Core', async () => {
            expect(await service.hydrate_bearer('cliq_dt_abc')).toBeNull();
            expect(mock_identity_repo.resolve_identity).not.toHaveBeenCalled();
        });

        it('returns null when the token does not resolve', async () => {
            mock_identity_repo.resolve_identity.mockRejectedValue(ApiError.unauthorized('Invalid token'));
            expect(await service.hydrate_bearer('cliq_tok_bad')).toBeNull();
        });

        it('builds a request-scoped session for a user PAT', async () => {
            mock_identity_repo.resolve_identity.mockResolvedValue({ user: ALICE_USER, scopes: ['alice'], org_slugs: ['acme'] });

            const s = await service.hydrate_bearer('cliq_tok_pat');

            expect(s).toMatchObject({
                session_id: `bearer:pat:${ALICE_ID}`, user_id: ALICE_ID, act_as_user_id: ALICE_ID,
                role: 'admin', actor_role: 'admin', user_token: 'cliq_tok_pat', target_token: 'cliq_tok_pat',
                orgs_json: '[]',
            });
            expect(JSON.parse(s!.scopes_json)).toEqual(['alice']);
            expect(mock_session_store.create).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('returns identity without acting_as when not acting as', async () => {
            const data = await service.get(base_session());
            expect(data.user.username).toBe('alice');
            expect(data.user.id).toBe(ALICE_ID);
            expect(data.acting_as).toBeNull();
            expect(data.scopes.map((s) => s.slug)).toEqual(['alice']);
            expect(data.org_slugs).toEqual(['acme']);
            expect(data.default_realm_slug).toBe('default');
            expect(data.default_realm_qualified).toBe('alice.default');
        });

        it('keeps orgs whose id is a string UUID', async () => {
            const data = await service.get(base_session());
            expect(data.orgs).toEqual([ALICE_ORG]);
        });

        it('drops malformed org rows (numeric id, missing slug)', async () => {
            const data = await service.get(base_session({
                orgs_json: JSON.stringify([
                    { id: 1, slug: 'legacy', name: 'legacy', default_realm_slug: 'default' },
                    { id: ORG_BOB, name: 'no-slug' },
                    ALICE_ORG,
                ]),
            }));
            expect(data.orgs).toEqual([ALICE_ORG]);
        });

        it('returns acting_as when act_as_user_id differs', async () => {
            const data = await service.get(base_session({
                act_as_user_id: BOB_ID,
                username: 'bob',
                target_token: 'cliq_tok_bob',
                default_realm_slug: 'bob-default',
                default_realm_qualified: 'bob.default',
            }));
            expect(data.user.username).toBe('bob');
            expect(data.user.id).toBe(BOB_ID);
            expect(data.acting_as).toEqual({ actor_id: ALICE_ID, actor_username: 'alice' });
            expect(data.default_realm_slug).toBe('bob-default');
        });
    });

    describe('update — act as', () => {
        const BOB_DETAIL = {
            id: BOB_ID, username: 'bob', display_name: 'Bob', email: 'bob@test.com',
            role: 'user', suspended_at: null, orgs: [{ slug: 'acme' }],
        };

        it('changes only target_token and act_as_user_id; user_token unchanged', async () => {
            const bob_org = { id: ORG_BOB, slug: 'bob', name: 'bob', default_realm_slug: 'default' };
            mock_identity_repo.issue_session_token.mockResolvedValue({
                user_id: BOB_ID, token: 'cliq_tok_bob',
                default_realm_id: 'realm-bob', default_realm_slug: 'default', default_realm_qualified: 'bob.default',
                orgs: [bob_org],
            });
            mock_identity_repo.get_user_by_id.mockResolvedValue(BOB_DETAIL);
            mock_identity_repo.list_scope_slugs.mockResolvedValue(['bob']);

            const data = await service.update(base_session(), { act_as_user_id: BOB_ID });

            expect(mock_identity_repo.issue_session_token).toHaveBeenCalledWith(BOB_ID, 'cliq_tok_user');
            expect(mock_identity_repo.get_user_by_id).toHaveBeenCalledWith(BOB_ID, 'cliq_tok_user');
            expect(mock_identity_repo.list_scope_slugs).toHaveBeenCalledWith(BOB_ID, 'cliq_tok_bob');
            expect(data.user.username).toBe('bob');
            expect(data.user.role).toBe('user');
            expect(data.scopes.map((s) => s.slug)).toEqual(['bob']);
            expect(data.org_slugs).toEqual(['acme']);
            expect(data.orgs).toEqual([bob_org]);
            expect(data.acting_as).toEqual({ actor_id: ALICE_ID, actor_username: 'alice' });
            expect(data.default_realm_slug).toBe('default');
            expect(data.default_realm_qualified).toBe('bob.default');
            expect(mock_session_store.update_act_as).toHaveBeenCalledWith(
                'sid-1',
                expect.objectContaining({
                    act_as_user_id: BOB_ID,
                    target_token: 'cliq_tok_bob',
                    default_realm_slug: 'default',
                    default_realm_qualified: 'bob.default',
                }),
            );
            const update_arg = mock_session_store.update_act_as.mock.calls[0][1];
            expect(update_arg).not.toHaveProperty('user_token');
            expect(update_arg).not.toHaveProperty('user_id');
            // previous target == user_token: never revoked
            expect(mock_identity_repo.revoke_session_token).not.toHaveBeenCalled();
        });

        it('revokes previous target when distinct from user_token', async () => {
            mock_identity_repo.issue_session_token.mockResolvedValue({ user_id: BOB_ID, token: 'cliq_tok_bob' });
            mock_identity_repo.get_user_by_id.mockResolvedValue({ ...BOB_DETAIL, orgs: [] });
            mock_identity_repo.list_scope_slugs.mockResolvedValue([]);

            await service.update(base_session({ act_as_user_id: CAROL_ID, target_token: 'cliq_tok_old_target' }), { act_as_user_id: BOB_ID });

            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_old_target');
            expect(mock_identity_repo.revoke_session_token).not.toHaveBeenCalledWith('cliq_tok_user');
        });

        it('falls back to no scopes when the scope lookup fails', async () => {
            mock_identity_repo.issue_session_token.mockResolvedValue({ user_id: BOB_ID, token: 'cliq_tok_bob' });
            mock_identity_repo.get_user_by_id.mockResolvedValue(BOB_DETAIL);
            mock_identity_repo.list_scope_slugs.mockRejectedValue(new Error('down'));

            const data = await service.update(base_session(), { act_as_user_id: BOB_ID });

            expect(data.scopes).toEqual([]);
            expect(data.default_realm_id).toBeNull();
            expect(data.orgs).toEqual([]);
        });

        it('rejects non-admin actor', async () => {
            await expect(
                service.update(base_session({ actor_role: 'user', role: 'user' }), { act_as_user_id: BOB_ID }),
            ).rejects.toMatchObject({ code: 'forbidden' });
            expect(mock_identity_repo.issue_session_token).not.toHaveBeenCalled();
        });

        it('rejects acting as yourself', async () => {
            await expect(
                service.update(base_session(), { act_as_user_id: ALICE_ID }),
            ).rejects.toThrow(ApiError);
            expect(mock_identity_repo.issue_session_token).not.toHaveBeenCalled();
        });
    });

    describe('update — stop acting as', () => {
        it('restores target_token to user_token and clears acting_as', async () => {
            const session = base_session({
                act_as_user_id: BOB_ID,
                username: 'bob',
                target_token: 'cliq_tok_bob',
                default_realm_slug: 'bob-default',
            });
            mock_identity_repo.resolve_identity.mockResolvedValue({ user: ALICE_USER, scopes: ['alice'], org_slugs: ['acme'] });

            const data = await service.update(session, { act_as_user_id: null });

            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_bob');
            expect(mock_identity_repo.resolve_identity).toHaveBeenCalledWith('cliq_tok_user');
            expect(mock_session_store.restore_actor).toHaveBeenCalledWith('sid-1', expect.objectContaining({
                username: 'alice', role: 'admin', orgs_json: '[]',
            }));
            expect(data.acting_as).toBeNull();
            expect(data.user.id).toBe(ALICE_ID);
            expect(data.scopes.map((s) => s.slug)).toEqual(['alice']);
            expect(data.default_realm_slug).toBe('default');
            expect(data.default_realm_qualified).toBe('alice.default');
        });

        it('falls back to the stored scopes when the identity lookup fails', async () => {
            mock_identity_repo.resolve_identity.mockRejectedValue(new Error('down'));

            const data = await service.update(base_session({
                act_as_user_id: BOB_ID, target_token: 'cliq_tok_bob',
                scopes_json: JSON.stringify([{ slug: 'bob' }]), org_slugs_json: JSON.stringify(['bobs']),
            }), { act_as_user_id: null });

            expect(data.scopes.map((s) => s.slug)).toEqual(['bob']);
            expect(data.org_slugs).toEqual(['bobs']);
            expect(data.user.role).toBe('admin');
        });

        it('is a no-op get when not acting as anyone', async () => {
            const data = await service.update(base_session(), { act_as_user_id: null });

            expect(data.acting_as).toBeNull();
            expect(mock_identity_repo.revoke_session_token).not.toHaveBeenCalled();
            expect(mock_session_store.restore_actor).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('revokes both tokens when distinct and destroys session', async () => {
            const result = await service.delete(base_session({ target_token: 'cliq_tok_bob', act_as_user_id: BOB_ID }));
            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_user');
            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_bob');
            expect(mock_session_store.destroy).toHaveBeenCalledWith('sid-1');
            expect(result).toEqual({ deleted: true });
        });

        it('revokes once when tokens are equal', async () => {
            await service.delete(base_session());
            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledTimes(1);
            expect(mock_identity_repo.revoke_session_token).toHaveBeenCalledWith('cliq_tok_user');
        });

        it('still destroys the session when revoke fails (best-effort)', async () => {
            mock_identity_repo.revoke_session_token.mockRejectedValue(new Error('down'));
            await expect(service.delete(base_session())).resolves.toEqual({ deleted: true });
            expect(mock_session_store.destroy).toHaveBeenCalledWith('sid-1');
        });

        it('answers deleted without a session', async () => {
            await expect(service.delete(undefined)).resolves.toEqual({ deleted: true });
            expect(mock_identity_repo.revoke_session_token).not.toHaveBeenCalled();
            expect(mock_session_store.destroy).not.toHaveBeenCalled();
        });
    });
});
