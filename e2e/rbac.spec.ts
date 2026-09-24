import { test, expect } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_admin_blocked,
    expect_api_denied,
    expect_login_redirect,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

test.describe('RBAC — positive', () => {
    test('admin can open every admin section', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        for (const path of ['/admin', '/admin/accounts', '/admin/orgs', '/admin/scopes', '/admin/teams', '/admin/audit']) {
            await page.goto(path);
            await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
            await expect(page.getByText(/site admin/i).first()).toBeVisible({ timeout: 10_000 });
        }
    });

    test('member can access account surfaces', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        for (const path of ['/settings', '/tokens', '/teams', '/scopes', '/realms']) {
            await page.goto(path);
            await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
            await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
        }
        await page.goto('/daemons');
        await page.waitForURL(/\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Daemons' })).toBeVisible({ timeout: 10_000 });
        await page.goto('/organizations');
        await page.waitForURL(/\/realms/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('RBAC — negative', () => {
    test('protected routes redirect when logged out', async ({ page }) => {
        await expect_login_redirect(page, '/settings');
        await expect_login_redirect(page, '/scopes');
        await expect_login_redirect(page, '/realms');
        await expect_login_redirect(page, '/admin/accounts');
    });

    test('member cannot enter admin UI', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_admin_blocked(page, '/admin/users');
        await expect_admin_blocked(page, '/admin/scopes');
        await expect_admin_blocked(page, '/admin/audit');
    });

    test('member cannot mint privileged hub ops via BFF', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/users/suspend', { user_id: 1 }));
        await expect_api_denied(await api_post(page, '/v1/scopes/delete', { scope_id: 1 }));
        await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
    });

    test('admin session required for users list API', async ({ page }) => {
        await expect_api_denied(await api_post(page, '/v1/users/get', {}));
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_api_denied(await api_post(page, '/v1/users/get', {}));
    });
});
