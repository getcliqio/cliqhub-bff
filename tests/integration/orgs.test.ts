import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { hub_legacy_uuid } from '../helpers/hub_legacy_uuid.js';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { ApiError } from '../../src/repositories/api_error.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Orgs integration', () => {
    let app: Express;
    let session_store: ReturnType<typeof create_test_app>['session_store'];

    beforeAll(() => {
        ({ app, session_store } = create_test_app());
    });

    beforeEach(() => {
        vi.restoreAllMocks();
        session_store.find.mockImplementation(async (sid: string) => {
            return session_store._sessions.get(sid) ?? null;
        });
        session_store.create.mockImplementation(async (record: any) => {
            const sid = `mock-sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, { session_id: sid, ...record });
            return sid;
        });
        session_store.destroy.mockImplementation(async (sid: string) => {
            session_store._sessions.delete(sid);
        });
        session_store.touch.mockResolvedValue(undefined);
    });

    function make_session() {
        const now = Math.floor(Date.now() / 1000);
        const sid = `orgs-sid-${Math.random().toString(36).slice(2)}`;
        session_store._sessions.set(sid, {
            session_id: sid,
            user_id: hub_legacy_uuid(1), username: 'alice', email: 'a@test.com', role: 'user',
            token: 'jwt-abc', scopes_json: '[]', org_slugs_json: '[]',
            created_at: now, last_active: now, expires_at: now + 3600,
        });
        return sid;
    }

    describe('POST /v1/orgs/get', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/get')
                .set(CSRF)
                .send({});

            expect(res.status).toBe(401);
        });

        it('returns 200 with orgs list', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    orgs: [{
                        id: hub_legacy_uuid(1), slug: 'acme', display_name: 'Acme',
                        role: 'admin', member_count: 5, scope_count: 2,
                    }],
                });

            const res = await request(app)
                .post('/v1/orgs/get')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.data.orgs).toHaveLength(1);
            expect(res.body.data.orgs[0].slug).toBe('acme');
        });
    });

    describe('POST /v1/orgs/get_by_id', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/get_by_id')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(401);
        });

        it('returns 200 with org detail for member', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    id: hub_legacy_uuid(1), slug: 'acme', display_name: 'Acme',
                    created_at: '2025-01-01', my_role: 'member',
                    members: [{ user_id: hub_legacy_uuid(1), username: 'alice', display_name: 'Alice', role: 'member', role_id: hub_legacy_uuid(4) }],
                    scopes: [],
                    roles: [{ id: hub_legacy_uuid(4), org_id: hub_legacy_uuid(1), slug: 'member', name: 'Member', permissions: [], is_system: false, is_default: true, member_count: 1 }],
                    available_permissions: ['org.settings'],
                });

            const res = await request(app)
                .post('/v1/orgs/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.my_role).toBe('member');
            expect(res.body.data.members[0].role_id).toBe(hub_legacy_uuid(4));
            expect(res.body.data.roles).toHaveLength(1);
            expect(res.body.data.available_permissions).toContain('org.settings');
        });

        it('returns 403 for non-member', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(new ApiError('forbidden', 'You are not a member', 403));

            const res = await request(app)
                .post('/v1/orgs/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(403);
        });

        it('returns 422 on missing org_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/get_by_id')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/orgs/update', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), display_name: 'New' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ updated: true });

            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), display_name: 'Acme Corp' });

            expect(res.status).toBe(200);
            expect(res.body.data.updated).toBe(true);
        });

        it('returns 422 on empty display_name', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), display_name: '' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/orgs/leave', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/leave')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ left: true });

            const res = await request(app)
                .post('/v1/orgs/leave')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.left).toBe(true);
        });

        it('returns error when last admin tries to leave', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('invalid_params', 'Cannot leave as the last org admin', 422),
                );

            const res = await request(app)
                .post('/v1/orgs/leave')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
            expect(res.body.error.message).toContain('last org admin');
        });
    });

    // ── Member Management ────────────────────────────────────────────

    describe('POST /v1/orgs/add_member', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), username: 'bob' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ user_id: hub_legacy_uuid(3), username: 'bob', role: 'member' });

            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), username: 'bob' });

            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('bob');
            expect(res.body.data.role).toBe('member');
        });

        it('returns 422 on empty username', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), username: '' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on missing org_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ username: 'bob' });

            expect(res.status).toBe(422);
        });

        it('returns 409 when user is already a member', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'User is already a member', 409),
                );

            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), username: 'bob' });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toContain('already a member');
        });

        it('returns 404 when user not found', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('not_found', 'User not found', 404),
                );

            const res = await request(app)
                .post('/v1/orgs/add_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), username: 'nobody' });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/orgs/remove_member', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ removed: true });

            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(200);
            expect(res.body.data.removed).toBe(true);
        });

        it('returns 422 on non-positive user_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), user_id: 0 });

            expect(res.status).toBe(422);
        });

        it('returns 422 on missing user_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
        });

        it('returns error when removing last admin', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('invalid_params', 'Cannot remove the last org admin', 422),
                );

            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
            expect(res.body.error.message).toContain('last org admin');
        });

        it('returns 404 when member not found', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('not_found', 'Member not found', 404),
                );

            const res = await request(app)
                .post('/v1/orgs/remove_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), user_id: hub_legacy_uuid(999) });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/orgs/list_roles', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/list_roles')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(401);
        });

        it('returns 200 with roles list', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    roles: [{
                        id: hub_legacy_uuid(2), org_id: hub_legacy_uuid(1), slug: 'admin', name: 'Admin',
                        permissions: ['org.settings'], is_system: false, is_default: true, member_count: 1,
                    }],
                });

            const res = await request(app)
                .post('/v1/orgs/list_roles')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(200);
            expect(res.body.data.roles).toHaveLength(1);
            expect(res.body.data.roles[0].slug).toBe('admin');
        });

        it('returns 422 on missing org_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/list_roles')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({});

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/users/update_role', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .send({ user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) });

            expect(res.status).toBe(401);
        });

        it('returns 200 when assigning role', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({
                    user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2), role_slug: 'admin', role: 'admin',
                });

            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) });

            expect(res.status).toBe(200);
            expect(res.body.data.role_id).toBe(hub_legacy_uuid(2));
            expect(res.body.data.role_slug).toBe('admin');
        });

        it('returns 422 on missing role_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(3), org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
        });

        it('returns 422 on non-positive user_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: -1, org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) });

            expect(res.status).toBe(422);
        });

        it('returns error when demoting last owner', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'Cannot demote the last org owner', 409),
                );

            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(4) });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toContain('last org owner');
        });

        it('returns 404 when member not found', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('not_found', 'Member not found', 404),
                );

            const res = await request(app)
                .post('/v1/users/update_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(999), org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(2) });

            expect(res.status).toBe(404);
        });
    });

    describe('POST /v1/orgs/delete_role', () => {
        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/orgs/delete_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(10) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns 409 when members still assigned', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'Cannot delete role with assigned members', 409),
                );

            const res = await request(app)
                .post('/v1/orgs/delete_role')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), role_id: hub_legacy_uuid(10) });

            expect(res.status).toBe(409);
        });
    });

    // ── Scope Management ─────────────────────────────────────────────

    describe('POST /v1/orgs/new_scope', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), slug: 'acme-labs' });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ id: hub_legacy_uuid(20), slug: 'acme-labs' });

            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), slug: 'acme-labs', visibility: 'private' });

            expect(res.status).toBe(200);
            expect(res.body.data.slug).toBe('acme-labs');
        });

        it('returns 422 on invalid slug format', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), slug: '123-invalid' });

            expect(res.status).toBe(422);
        });

        it('returns 422 on slug with uppercase', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), slug: 'Acme-Labs' });

            expect(res.status).toBe(422);
        });

        it('returns 409 when scope slug already exists', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'A scope with that slug already exists', 409),
                );

            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), slug: 'acme-labs' });

            expect(res.status).toBe(409);
            expect(res.body.error.message).toContain('already exists');
        });

        it('returns 422 on invalid visibility value', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/new_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), slug: 'acme-labs', visibility: 'internal' });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/orgs/delete_scope', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/delete_scope')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(11) });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ deleted: true });

            const res = await request(app)
                .post('/v1/orgs/delete_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(11) });

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it('returns error when scope has teams', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('invalid_params', 'Cannot delete scope with 3 team(s)', 422),
                );

            const res = await request(app)
                .post('/v1/orgs/delete_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(11) });

            expect(res.status).toBe(422);
            expect(res.body.error.message).toContain('team(s)');
        });

        it('returns error when trying to delete default scope', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('invalid_params', 'Cannot delete the default org scope', 422),
                );

            const res = await request(app)
                .post('/v1/orgs/delete_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10) });

            expect(res.status).toBe(422);
            expect(res.body.error.message).toContain('default org scope');
        });

        it('returns 422 on missing scope_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/delete_scope')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/orgs/assign_scope_member', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/assign_scope_member')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ assigned: true });

            const res = await request(app)
                .post('/v1/orgs/assign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(200);
            expect(res.body.data.assigned).toBe(true);
        });

        it('returns 409 when already assigned', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('conflict', 'User is already assigned to this scope', 409),
                );

            const res = await request(app)
                .post('/v1/orgs/assign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(409);
        });

        it('returns 422 when user is not an org member', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('invalid_params', 'User is not a member of this org', 422),
                );

            const res = await request(app)
                .post('/v1/orgs/assign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(99) });

            expect(res.status).toBe(422);
        });

        it('returns 422 on non-positive user_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/assign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: 0 });

            expect(res.status).toBe(422);
        });
    });

    describe('POST /v1/orgs/unassign_scope_member', () => {
        it('returns 401 without session', async () => {
            const res = await request(app)
                .post('/v1/orgs/unassign_scope_member')
                .set(CSRF)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(401);
        });

        it('returns 200 on success', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockResolvedValueOnce({ removed: true });

            const res = await request(app)
                .post('/v1/orgs/unassign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(200);
            expect(res.body.data.removed).toBe(true);
        });

        it('returns 404 when scope not found in org', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('not_found', 'Scope not found in this org', 404),
                );

            const res = await request(app)
                .post('/v1/orgs/unassign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(999), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(404);
        });

        it('returns 422 on non-positive scope_id', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/unassign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: 0, user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(422);
        });

        it('returns 403 when non-admin tries to unassign', async () => {
            const sid = make_session();
            vi.spyOn(ApiClient.prototype, 'post')
                .mockRejectedValueOnce(
                    new ApiError('forbidden', 'Org admin access required', 403),
                );

            const res = await request(app)
                .post('/v1/orgs/unassign_scope_member')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), scope_id: hub_legacy_uuid(10), user_id: hub_legacy_uuid(3) });

            expect(res.status).toBe(403);
        });
    });
});
