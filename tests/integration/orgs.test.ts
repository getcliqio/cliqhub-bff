import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { hub_legacy_uuid } from '../helpers/hub_legacy_uuid.js';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { ApiError } from '../../src/errors/api_error.js';

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
            vi.spyOn(CoreClient.prototype, 'post')
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

    describe('POST /v1/orgs/get — site-admin search and sort reach Core in Core\'s names', () => {
        function make_admin_session() {
            const now = Math.floor(Date.now() / 1000);
            const sid = `orgs-admin-sid-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, {
                session_id: sid,
                user_id: hub_legacy_uuid(2), username: 'root', email: 'r@test.com', role: 'admin',
                token: 'jwt-admin', user_token: 'jwt-admin', target_token: 'jwt-admin', scopes_json: '[]', org_slugs_json: '[]',
                created_at: now, last_active: now, expires_at: now + 3600,
            });
            return sid;
        }
        const PAGE = { orgs: [], total: 0, limit: 25, offset: 0 };

        // The SPA (admin › Organizations) sends `search`; Core's OrgsGetInput only knows `query`.
        it.each([
            ['slug', 'acme'],
            ['display name', 'Acme Corp'],
        ])('search by %s is sent to Core as query', async (_what, term) => {
            const sid = make_admin_session();
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce(PAGE);

            const res = await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ limit: 25, offset: 0, search: term });

            expect(res.status).toBe(200);
            expect(post).toHaveBeenCalledTimes(1);
            expect(post).toHaveBeenCalledWith('/v1/orgs/get', { query: term, limit: 25, offset: 0 }, 'jwt-admin');
        });

        it('accepts Core\'s own `query`, drops a blank search, never forwards unknown fields', async () => {
            const sid = make_admin_session();
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValue(PAGE);

            await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ query: ' acme ', bogus: 1 });
            expect(post).toHaveBeenLastCalledWith('/v1/orgs/get', { query: 'acme' }, 'jwt-admin');

            await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ search: '  ', limit: 10 });
            expect(post).toHaveBeenLastCalledWith('/v1/orgs/get', { limit: 10 }, 'jwt-admin');
        });

        it('does not send sort to Core until Core supports it, and says so in `sortable`', async () => {
            const sid = make_admin_session();
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce(PAGE);

            const res = await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ search: 'acme', sort_by: 'slug', sort_dir: 'asc' });

            expect(res.status).toBe(200);
            expect(post).toHaveBeenCalledWith('/v1/orgs/get', { query: 'acme' }, 'jwt-admin');
            expect(res.body.data.sortable).toEqual([]);
        });

        it('rejects a sort key outside the list', async () => {
            const sid = make_admin_session();
            const post = vi.spyOn(CoreClient.prototype, 'post');
            const res = await request(app).post('/v1/orgs/get').set(CSRF).set('Cookie', `test_sid=${sid}`).send({ sort_by: 'password' });
            expect(res.status).toBe(422);
            expect(post).not.toHaveBeenCalled();
        });
    });

    describe('POST /v1/orgs/new — a name conflict reaches the SPA with who holds the name', () => {
        it('relays Core\'s 409 message and details unchanged', async () => {
            const now = Math.floor(Date.now() / 1000);
            const sid = `orgs-new-sid-${Math.random().toString(36).slice(2)}`;
            session_store._sessions.set(sid, {
                session_id: sid, user_id: hub_legacy_uuid(2), username: 'root', email: 'r@test.com', role: 'admin',
                token: 'jwt-admin', user_token: 'jwt-admin', target_token: 'jwt-admin', scopes_json: '[]', org_slugs_json: '[]',
                created_at: now, last_active: now, expires_at: now + 3600,
            });
            const details = { kind: 'scope', slug: 'measureone', scope_type: 'user', org_slug: null, owner_username: 'measureone' };
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
                ok: false, error: 'The name measureone is already taken.', code: 'conflict', details,
            }), { status: 409, headers: { 'content-type': 'application/json' } }));

            const res = await request(app).post('/v1/orgs/new').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ slug: 'measureone', owner: { email: 'sapan@example.test' } });

            expect(res.status).toBe(409);
            expect(res.body).toEqual({ ok: false, error: { code: 'conflict', message: 'The name measureone is already taken.', details } });
        });
    });

    describe('POST /v1/orgs/get_scopes — search reaches Core as query', () => {
        it('maps search to query and keeps only Core\'s fields', async () => {
            const sid = make_session();
            const post = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ items: [], total: 0, offset: 0, limit: 100 });

            const res = await request(app).post('/v1/orgs/get_scopes').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ user_id: hub_legacy_uuid(1), search: 'acme', limit: 100 });

            expect(res.status).toBe(200);
            // make_session() has no target_token, so the bearer is whatever that harness resolves (not under test here).
            expect(post.mock.calls[0].slice(0, 2)).toEqual(['/v1/orgs/get_scopes', { user_id: hub_legacy_uuid(1), query: 'acme', limit: 100 }]);
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
                .mockResolvedValueOnce({ updated: true });

            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), display_name: 'Acme Corp' });

            expect(res.status).toBe(200);
            expect(res.body.data.updated).toBe(true);
        });

        it('forwards owner_id to Core to make a member an owner', async () => {
            const sid = make_session();
            const core = vi.spyOn(CoreClient.prototype, 'post').mockResolvedValueOnce({ updated: true });
            const owner_id = hub_legacy_uuid(7);

            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), owner_id });

            expect(res.status).toBe(200);
            expect(core.mock.calls[0].slice(0, 2)).toEqual(['/internal/orgs/update', { org_id: hub_legacy_uuid(1), owner_id }]);
        });

        it('returns 422 when neither display_name nor owner_id is given', async () => {
            const sid = make_session();
            const res = await request(app)
                .post('/v1/orgs/update')
                .set(CSRF)
                .set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1) });

            expect(res.status).toBe(422);
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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

    describe('POST /v1/orgs/add_member is not a route (adding someone is an invite)', () => {
        it('is not served: JSON 404 and Core is never called', async () => {
            const sid = make_session();
            const post = vi.spyOn(CoreClient.prototype, 'post');

            const res = await request(app).post('/v1/orgs/add_member').set(CSRF).set('Cookie', `test_sid=${sid}`)
                .send({ org_id: hub_legacy_uuid(1), username: 'bob' });

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ ok: false, error: { code: 'not_found', message: 'Unknown API route' } });
            expect(post).not.toHaveBeenCalled();
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
            vi.spyOn(CoreClient.prototype, 'post')
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
