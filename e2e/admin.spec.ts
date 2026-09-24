import { test, expect } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_admin_blocked,
    expect_api_denied,
    expect_api_ok,
    unique_slug,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

const STRONG_PASSWORD = 'Longpass1!';

test.describe('Admin UI — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
    });

    test('admin index redirects to accounts', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
    });

    test('users list and search', async ({ page }) => {
        await page.goto('/admin/users');
        await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/\d+ total/)).toBeVisible({ timeout: 10_000 });
        await page.getByLabel('Filter accounts').fill(TEST_ADMIN.username);
        await page.getByRole('button', { name: 'Apply' }).click();
        await expect(page.getByText(TEST_ADMIN.username).first()).toBeVisible({ timeout: 8_000 });
    });

    test('create user dialog and success', async ({ page }) => {
        await page.goto('/admin/users');
        await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Invite user' }).click();
        await expect(page.getByText('New account')).toBeVisible({ timeout: 5_000 });

        const username = unique_slug('e2eu');
        await page.getByPlaceholder('username', { exact: true }).fill(username);
        await page.getByPlaceholder('email', { exact: true }).fill(`${username}@example.com`);
        await page.getByPlaceholder('password', { exact: true }).fill(STRONG_PASSWORD);
        await page.getByRole('button', { name: /^create$/i }).click();
        await expect(page.getByText(username).first()).toBeVisible({ timeout: 10_000 });
    });

    test('orgs page loads and create dialog opens', async ({ page }) => {
        await page.goto('/admin/orgs');
        await expect(page.getByRole('heading', { name: /admin · organizations/i })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: /create org/i }).click();
        await expect(page.getByText(/new organization/i)).toBeVisible({ timeout: 5_000 });
    });

    test('scopes page loads', async ({ page }) => {
        await page.goto('/admin/scopes');
        await expect(page.getByRole('heading', { name: /admin · scopes/i })).toBeVisible({ timeout: 10_000 });
    });

    test('teams page loads', async ({ page }) => {
        await page.goto('/admin/teams');
        await expect(page.getByRole('heading', { name: /admin · teams/i })).toBeVisible({ timeout: 10_000 });
    });

    test('audit page loads', async ({ page }) => {
        await page.goto('/admin/audit');
        await expect(page.getByRole('heading', { name: /admin · audit/i })).toBeVisible({ timeout: 10_000 });
    });

    test('resource-path APIs work for admin', async ({ page }) => {
        await expect_api_ok(await api_post(page, '/v1/users/get', { limit: 5, offset: 0 }));
        await expect_api_ok(await api_post(page, '/v1/reports/audit', { limit: 5, offset: 0 }));
        await expect_api_ok(await api_post(page, '/v1/scopes/get', { limit: 5, offset: 0 }));
        await expect_api_ok(await api_post(page, '/v1/orgs/get', { limit: 5, offset: 0 }));
    });
});

test.describe('Admin UI — negative', () => {
    test('member is blocked from admin users', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_admin_blocked(page, '/admin/users');
    });

    test('member is blocked from admin index', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_admin_blocked(page, '/admin');
    });

    test('member cannot call privileged APIs', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/users/new', {
            username: unique_slug('denied'),
            email: `denied-${Date.now()}@example.com`,
            password: STRONG_PASSWORD,
        }));
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
        await expect_api_denied(await api_post(page, '/v1/orgs/new', {
            slug: unique_slug('deniedorg'),
            admin_username: TEST_USER.username,
        }));
    });

    test('legacy /v1/admin/* is 404', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const res = await api_post(page, '/v1/admin/stats', {});
        expect(res.status()).toBe(404);
    });

    test('unauthenticated admin API is denied', async ({ page }) => {
        await expect_api_denied(await api_post(page, '/v1/users/get', {}));
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
    });

    test('create user with invalid username shows error', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/admin/users');
        await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Invite user' }).click();

        await page.getByPlaceholder('username', { exact: true }).fill('123bad');
        await page.getByPlaceholder('email', { exact: true }).fill('bad@example.com');
        await page.getByPlaceholder('password', { exact: true }).fill(STRONG_PASSWORD);
        await page.getByRole('button', { name: /^create$/i }).click();
        await expect(page.getByText(/username|slug|letter|invalid|start with/i).first()).toBeVisible({ timeout: 8_000 });
    });
});
