/**
 * E2E (API via SPA origin): resource-path admin + grant denial.
 * Complements UI specs with hard HTTP assertions.
 */
import { test, expect } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_api_denied,
    expect_api_ok,
    unique_slug,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

test.describe('Grants & resource paths — positive', () => {
    test('admin users.get returns users array', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const body = await expect_api_ok(await api_post(page, '/v1/users/get', { limit: 10, offset: 0 }));
        const users = (body.data as { users?: unknown[] })?.users;
        expect(Array.isArray(users)).toBe(true);
        expect((users as unknown[]).length).toBeGreaterThan(0);
    });

    test('admin reports.audit returns payload', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const body = await expect_api_ok(await api_post(page, '/v1/reports/audit', { limit: 5, offset: 0 }));
        expect(body.data).toBeTruthy();
    });

    test('admin can create and soft-verify a user', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const username = unique_slug('apiu');
        const body = await expect_api_ok(await api_post(page, '/v1/users/new', {
            username,
            email: `${username}@example.com`,
            password: 'Longpass1!',
            display_name: username,
        }));
        expect((body.data as { username?: string })?.username).toBe(username);

        const list = await expect_api_ok(await api_post(page, '/v1/users/get', {
            search: username,
            limit: 10,
            offset: 0,
        }));
        const users = (list.data as { users: Array<{ username: string }> }).users;
        expect(users.some((u) => u.username === username)).toBe(true);
    });

    test('member can list own tokens', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_ok(await api_post(page, '/v1/auth/get_tokens', {
            type: 'user',
            limit: 10,
            offset: 0,
        }));
    });

    test('member can list realms', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const res = await api_post(page, '/v1/realms/get', {});
        expect(res.ok()).toBe(true);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });
});

test.describe('Grants & resource paths — negative', () => {
    test('legacy /v1/admin/stats is gone', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const res = await api_post(page, '/v1/admin/stats', {});
        expect(res.status()).toBe(404);
    });

    test('reports/stats is gone', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const res = await api_post(page, '/v1/reports/stats', {});
        expect(res.status()).toBe(404);
    });

    test('member cannot create user', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/users/new', {
            username: unique_slug('nope'),
            email: `nope-${Date.now()}@example.com`,
            password: 'Longpass1!',
        }));
    });

    test('member cannot read reports audit', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
    });

    test('unauthenticated privileged routes denied', async ({ page }) => {
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
        await expect_api_denied(await api_post(page, '/v1/users/get', {}));
        await expect_api_denied(await api_post(page, '/v1/scopes/new', {
            slug: unique_slug('x'),
            owner_username: 'admin',
            visibility: 'public',
            scope_type: 'user',
        }));
    });

    test('member cannot delete org', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/orgs/delete', { org_id: 1 }));
    });
});
