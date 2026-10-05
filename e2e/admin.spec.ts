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

test.describe('Admin UI — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
    });

    test('admin index shows hub health', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Hub health', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('stat-Accounts')).toBeVisible({ timeout: 10_000 });
    });

    test('users list and search', async ({ page }) => {
        await page.goto('/admin/users');
        await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('group', { name: 'Filter' }).getByRole('button', { name: /^All/ })).toBeVisible({ timeout: 10_000 });

        const search_req = page.waitForRequest((req) =>
            req.url().includes('/v1/admin_list/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { kind?: string; query?: string })?.kind === 'accounts'
            && (req.postDataJSON() as { query?: string })?.query === TEST_ADMIN.username,
        );
        await page.getByLabel('Search accounts').fill(TEST_ADMIN.username);
        await page.getByLabel('Search accounts').press('Enter');
        await search_req;
        await expect(page.getByTestId(`acct-${TEST_ADMIN.username}`)).toBeVisible({ timeout: 8_000 });
    });

    test('create user dialog and success', async ({ page }) => {
        await page.goto('/admin/accounts');
        await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'New account' }).click();
        const form = page.getByRole('form', { name: 'New account' });
        await expect(form).toBeVisible({ timeout: 5_000 });

        const username = unique_slug('e2eu');
        await form.getByLabel('username', { exact: true }).fill(username);
        await form.getByLabel('email', { exact: true }).fill(`${username}@example.com`);
        await form.getByRole('button', { name: 'Create account' }).click();
        await expect(page.getByTestId('account-created')).toContainText(username, { timeout: 10_000 });
    });

    test('orgs page loads and create form opens', async ({ page }) => {
        await page.goto('/admin/orgs');
        await expect(page.getByRole('heading', { name: 'Organizations', level: 1 })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: /new org/i }).click();
        await expect(page.getByRole('form', { name: 'New organization' })).toBeVisible({ timeout: 5_000 });
    });

    test('scopes page loads', async ({ page }) => {
        await page.goto('/admin/scopes');
        await expect(page.getByRole('heading', { name: 'Scopes', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Search scopes')).toBeVisible();
    });

    test('teams page loads', async ({ page }) => {
        await page.goto('/admin/teams');
        await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Search teams')).toBeVisible();
    });

    test('audit page loads', async ({ page }) => {
        await page.goto('/admin/audit');
        await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Target type')).toBeVisible();
    });

    test('resource-path APIs work for admin', async ({ page }) => {
        await expect_api_ok(await api_post(page, '/v1/users/get', { limit: 5, offset: 0 }));
        await expect_api_ok(await api_post(page, '/v1/reports/audit', { limit: 5, offset: 0 }));
        await expect_api_ok(await api_post(page, '/v1/admin_list/get', { kind: 'scopes', limit: 5, offset: 0 }));
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
        }));
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
        await expect_api_denied(await api_post(page, '/v1/admin_list/get', { kind: 'accounts' }));
        await expect_api_denied(await api_post(page, '/v1/orgs/new', {
            slug: unique_slug('deniedorg'),
            owner: { email: `denied-owner-${Date.now()}@example.com` },
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
        await expect_api_denied(await api_post(page, '/v1/admin_list/get', { kind: 'accounts' }));
    });

    test('create user with invalid username shows error', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/admin/accounts');
        await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'New account' }).click();
        const form = page.getByRole('form', { name: 'New account' });

        await form.getByLabel('username', { exact: true }).fill('123bad');
        await form.getByLabel('email', { exact: true }).fill('bad@example.com');
        await form.getByRole('button', { name: 'Create account' }).click();
        await expect(form.getByRole('alert').first()).toContainText(/username|slug|letter|invalid|start with/i, { timeout: 8_000 });
        await expect(page.getByTestId('account-created')).toHaveCount(0);
    });
});
