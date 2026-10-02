import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../../src/services/users_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import type { SessionRecord } from '../../../src/repositories/session_store.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const USER_1 = hub_legacy_uuid(1);
const USER_5 = hub_legacy_uuid(5);
const ORG_1 = hub_legacy_uuid(101);
const ROLE_2 = hub_legacy_uuid(202);

function session(role: 'user' | 'admin'): SessionRecord {
    return { role, target_token: 'jwt-target', user_token: 'jwt-user' } as unknown as SessionRecord;
}

describe('UsersService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_by_id: vi.fn(),
        new: vi.fn(),
        update: vi.fn(),
        suspend: vi.fn(),
        unsuspend: vi.fn(),
        delete: vi.fn(),
        set_role: vi.fn(),
        reset_password: vi.fn(),
        forgot_password: vi.fn(),
        update_role: vi.fn(),
        update_profile: vi.fn(),
        change_password: vi.fn(),
        reset_with_token: vi.fn(),
    };

    const sessions = { destroy_user: vi.fn() };
    const session_service = { create: vi.fn() };
    const service = new UsersService(mock_repo as any, sessions, session_service as any);

    beforeEach(() => {
        vi.resetAllMocks();
        sessions.destroy_user.mockResolvedValue(undefined);
    });

    describe('get', () => {
        const page = {
            users: [{ id: USER_1, username: 'alice', display_name: 'Alice', email: 'alice@test.com', role: 'user', suspended_at: null, created_at: '2025-01-01T00:00:00.000Z', status: 'active', deleted_at: null }],
            total: 1, limit: 20, offset: 0,
        };

        it('returns the mapped hub-wide list for a site admin, using the target token', async () => {
            mock_repo.get.mockResolvedValue(page);

            const data = await service.get({ limit: 20, offset: 0 }, session('admin'));

            expect(mock_repo.get).toHaveBeenCalledWith({ limit: 20, offset: 0 }, 'jwt-target');
            expect(data.users).toHaveLength(1);
            expect(data.users[0].username).toBe('alice');
            expect(data).toMatchObject({ total: 1, limit: 20, offset: 0 });
        });

        it('throws ApiError 403 for a non-admin hub-wide list without calling Core', async () => {
            const err = await service.get({ search: 'a' }, session('user')).catch((e) => e);

            expect(err).toBeInstanceOf(ApiError);
            expect(err.status).toBe(403);
            expect(err.code).toBe('forbidden');
            expect(mock_repo.get).not.toHaveBeenCalled();
        });

        it('lets a non-admin list an org (org_id)', async () => {
            mock_repo.get.mockResolvedValue(page);

            const data = await service.get({ org_id: ORG_1 }, session('user'));

            expect(mock_repo.get).toHaveBeenCalledWith({ org_id: ORG_1 }, 'jwt-target');
            expect(data.total).toBe(1);
        });

        it('lets a non-admin search to invite to a realm (realm_id)', async () => {
            mock_repo.get.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

            const data = await service.get({ realm_id: 'realm-1', search: 'bob' }, session('user'));

            // Core's search field is `query` (`search` is deprecated there).
            expect(mock_repo.get).toHaveBeenCalledWith({ realm_id: 'realm-1', query: 'bob' }, 'jwt-target');
            expect(data.users).toEqual([]);
        });

        it('sends exactly Core\'s fields: query wins over search, blanks and unknowns are dropped', async () => {
            mock_repo.get.mockResolvedValue({ users: [], total: 0, limit: 20, offset: 0 });

            await service.get({ org_id: ORG_1, query: '  ana ', search: 'bob', limit: 10, offset: 20 }, session('user'));
            expect(mock_repo.get).toHaveBeenLastCalledWith({ org_id: ORG_1, query: 'ana', limit: 10, offset: 20 }, 'jwt-target');

            await service.get({ search: '   ' } as never, session('admin'));
            expect(mock_repo.get).toHaveBeenLastCalledWith({}, 'jwt-target');
        });

        it('forwards include_deleted (site admin hub list)', async () => {
            mock_repo.get.mockResolvedValue({ users: [], total: 0, limit: 50, offset: 0 });
            await service.get({ include_deleted: true }, session('admin'));
            expect(mock_repo.get).toHaveBeenLastCalledWith({ include_deleted: true }, 'jwt-target');
        });
    });

    describe('get_by_id', () => {
        it('returns mapped user detail', async () => {
            mock_repo.get_by_id.mockResolvedValue({
                id: USER_1, username: 'alice', display_name: 'Alice', email: 'alice@test.com',
                role: 'user', suspended_at: null, suspended_reason: '', created_at: '2025-01-01',
                scope_count: 2, team_count: 3, token_count: 1, draft_count: 0,
                orgs: [{ id: 10, slug: 'acme', display_name: 'Acme', role: 'admin' }],
            });

            const data = await service.get_by_id({ user_id: USER_1 }, 'jwt');

            expect(mock_repo.get_by_id).toHaveBeenCalledWith({ user_id: USER_1 }, 'jwt');
            expect(data.username).toBe('alice');
            expect(data.scope_count).toBe(2);
            expect(data.orgs[0].slug).toBe('acme');
        });
    });

    describe('new', () => {
        it('creates an invited user (no password) and maps the setup link state', async () => {
            const vo = {
                user: { id: USER_5, username: 'bob', email: 'bob@test.com', status: 'invited' },
                setup: { expires_at: '2026-10-09T10:00:00Z', email_sent: true, setup_url: null },
            };
            mock_repo.new.mockResolvedValue(vo);
            const input = { username: 'bob', email: 'bob@test.com', reactivate: true };

            const data = await service.new(input, 'jwt');

            expect(mock_repo.new).toHaveBeenCalledWith(input, 'jwt');
            expect(data).toEqual(vo);
        });
    });

    describe('update', () => {
        it('returns mapped update result', async () => {
            mock_repo.update.mockResolvedValue({ updated: true });

            const data = await service.update({ user_id: USER_1, display_name: 'Alice W' }, 'jwt');

            expect(mock_repo.update).toHaveBeenCalledWith({ user_id: USER_1, display_name: 'Alice W' }, 'jwt');
            expect(data).toEqual({ updated: true });
        });
    });

    describe('suspend', () => {
        it('returns mapped suspend result', async () => {
            mock_repo.suspend.mockResolvedValue({ suspended: true });

            const data = await service.suspend({ user_id: USER_5, reason: 'spam' }, 'jwt');

            expect(mock_repo.suspend).toHaveBeenCalledWith({ user_id: USER_5, reason: 'spam' }, 'jwt');
            expect(data).toEqual({ suspended: true });
        });

        it('ends the suspended user\'s BFF sessions after Core accepted', async () => {
            mock_repo.suspend.mockResolvedValue({ suspended: true });

            await service.suspend({ user_id: USER_5 }, 'jwt');

            expect(sessions.destroy_user).toHaveBeenCalledWith(USER_5);
        });

        it('keeps the sessions when Core refuses', async () => {
            mock_repo.suspend.mockRejectedValue(new ApiError('invalid_params', 'Cannot suspend yourself', 422));

            await expect(service.suspend({ user_id: USER_5 }, 'jwt')).rejects.toMatchObject({ status: 422 });
            expect(sessions.destroy_user).not.toHaveBeenCalled();
        });
    });

    describe('unsuspend', () => {
        it('returns mapped unsuspend result', async () => {
            mock_repo.unsuspend.mockResolvedValue({ suspended: false });

            const data = await service.unsuspend({ user_id: USER_5 }, 'jwt');

            expect(mock_repo.unsuspend).toHaveBeenCalledWith({ user_id: USER_5 }, 'jwt');
            expect(data).toEqual({ suspended: false });
        });
    });

    describe('delete', () => {
        it('returns mapped delete result', async () => {
            mock_repo.delete.mockResolvedValue({ deleted: true });

            const data = await service.delete({ user_id: USER_5 }, 'jwt');

            expect(mock_repo.delete).toHaveBeenCalledWith({ user_id: USER_5 }, 'jwt');
            expect(data).toEqual({ deleted: true });
        });

        it('ends the deleted user\'s BFF sessions after Core deleted them', async () => {
            const order: string[] = [];
            mock_repo.delete.mockImplementation(async () => { order.push('core'); return { deleted: true }; });
            sessions.destroy_user.mockImplementation(async () => { order.push('sessions'); });

            await service.delete({ user_id: USER_5 }, 'jwt');

            expect(sessions.destroy_user).toHaveBeenCalledWith(USER_5);
            expect(order).toEqual(['core', 'sessions']);
        });

        it('passes Core\'s 409 owns_orgs (with details) through and keeps the sessions', async () => {
            const refused = new ApiError('owns_orgs', 'Transfer or delete these orgs first.', 409, { orgs: [{ slug: 'measureone' }] });
            mock_repo.delete.mockRejectedValue(refused);

            const err = await service.delete({ user_id: USER_5 }, 'jwt').catch((e) => e);

            expect(err).toBe(refused);
            expect(sessions.destroy_user).not.toHaveBeenCalled();
        });

        it('still answers deleted when ending the sessions fails (Core already refuses the token)', async () => {
            mock_repo.delete.mockResolvedValue({ deleted: true });
            sessions.destroy_user.mockRejectedValue(new Error('db down'));

            await expect(service.delete({ user_id: USER_5 }, 'jwt')).resolves.toEqual({ deleted: true });
        });
    });

    describe('set_role', () => {
        it('returns mapped role result', async () => {
            mock_repo.set_role.mockResolvedValue({ role: 'admin' });

            const data = await service.set_role({ user_id: USER_1, role: 'admin' }, 'jwt');

            expect(mock_repo.set_role).toHaveBeenCalledWith({ user_id: USER_1, role: 'admin' }, 'jwt');
            expect(data).toEqual({ role: 'admin' });
        });
    });

    describe('reset_password', () => {
        it('sends { user_id } and maps the reset link state', async () => {
            const vo = { reset_id: 'rst-1', expires_at: '2026-10-03T10:20:00Z', email_sent: false, reset_url: 'https://app.example.test/reset/x' };
            mock_repo.reset_password.mockResolvedValue(vo);

            const data = await service.reset_password({ user_id: USER_1 }, 'jwt');

            expect(mock_repo.reset_password).toHaveBeenCalledWith({ user_id: USER_1 }, 'jwt');
            expect(data).toEqual(vo);
        });
    });

    describe('forgot_password', () => {
        it('sends { email } with the caller address chain and answers { requested: true }', async () => {
            mock_repo.forgot_password.mockResolvedValue({ requested: true });

            const data = await service.forgot_password({ email: 'priya@example.test' });

            expect(mock_repo.forgot_password).toHaveBeenCalledWith({ email: 'priya@example.test' });
            expect(data).toEqual({ requested: true });
        });

        it('passes 429 rate_limited through', async () => {
            const limited = new ApiError('rate_limited', 'Too many requests', 429);
            mock_repo.forgot_password.mockRejectedValue(limited);
            await expect(service.forgot_password({ email: 'priya@example.test' })).rejects.toBe(limited);
        });
    });

    describe('update_role', () => {
        it('maps the org role assignment', async () => {
            mock_repo.update_role.mockResolvedValue({
                user_id: USER_1, org_id: ORG_1, role_id: ROLE_2, role_slug: 'admin', role: 'admin',
            });

            const data = await service.update_role({ user_id: USER_1, org_id: ORG_1, role_id: ROLE_2 }, 'jwt');

            expect(mock_repo.update_role).toHaveBeenCalledWith({ user_id: USER_1, org_id: ORG_1, role_id: ROLE_2 }, 'jwt');
            expect(data.role_id).toBe(ROLE_2);
            expect(data.role_slug).toBe('admin');
        });
    });

    describe('update_profile', () => {
        it('maps the user and strips suspension fields', async () => {
            mock_repo.update_profile.mockResolvedValue({
                user: {
                    id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com',
                    role: 'user', suspended_at: '2025-06-01', suspended_reason: 'spam', created_at: '2025-01-01',
                },
            });

            const data = await service.update_profile({ display_name: 'Alice W' }, 'jwt');

            expect(mock_repo.update_profile).toHaveBeenCalledWith({ display_name: 'Alice W' }, 'jwt');
            expect(data.user.display_name).toBe('Alice W');
            expect(data.user).not.toHaveProperty('suspended_at');
            expect(data.user).not.toHaveProperty('suspended_reason');
        });
    });

    describe('change_password', () => {
        it('maps the user and sessions_revoked', async () => {
            const vo = { user: { id: USER_1, username: 'alice', status: 'active' }, sessions_revoked: 2 };
            mock_repo.change_password.mockResolvedValue(vo);

            const data = await service.change_password({ current_password: 'old', new_password: 'newpass88' }, 'jwt');

            expect(mock_repo.change_password).toHaveBeenCalledWith({ current_password: 'old', new_password: 'newpass88' }, 'jwt');
            expect(data).toEqual(vo);
            expect(session_service.create).not.toHaveBeenCalled();
        });
    });

    describe('reset_with_token', () => {
        const vo = { user: { id: USER_5, username: 'priya', status: 'active' }, sessions_revoked: 1 };
        const input = { reset_token: 'tok', new_password: 'newpass88' };

        it('sets the password, ends the old BFF sessions, then signs in with the new password', async () => {
            const order: string[] = [];
            mock_repo.reset_with_token.mockImplementation(async () => { order.push('core'); return vo; });
            sessions.destroy_user.mockImplementation(async () => { order.push('sessions'); });
            const created = { session_id: 'sid', target_token: 't', login: {} };
            session_service.create.mockImplementation(async () => { order.push('sign_in'); return created; });

            const out = await service.reset_with_token(input);

            expect(mock_repo.reset_with_token).toHaveBeenCalledWith(input);
            expect(sessions.destroy_user).toHaveBeenCalledWith(USER_5);
            expect(session_service.create).toHaveBeenCalledWith({ username: 'priya', password: 'newpass88' });
            expect(order).toEqual(['core', 'sessions', 'sign_in']);
            expect(out).toEqual({ data: vo, session: created });
        });

        it('a failed sign-in still reports the password change, without a session', async () => {
            mock_repo.reset_with_token.mockResolvedValue(vo);
            session_service.create.mockRejectedValue(new ApiError('unauthorized', 'nope', 401));

            await expect(service.reset_with_token(input)).resolves.toEqual({ data: vo, session: null });
        });

        it.each([
            ['expired', 410, { expired_at: '2026-10-01T00:00:00Z' }],
            ['not_pending', 409, { status: 'used' }],
            ['not_found', 404, undefined],
        ])('passes %s through and signs nobody in', async (code, status, details) => {
            const err = new ApiError(code, code, status, details);
            mock_repo.reset_with_token.mockRejectedValue(err);

            await expect(service.reset_with_token(input)).rejects.toBe(err);
            expect(session_service.create).not.toHaveBeenCalled();
            expect(sessions.destroy_user).not.toHaveBeenCalled();
        });
    });
});
