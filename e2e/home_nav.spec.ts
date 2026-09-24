import { test, expect } from '@playwright/test';
import { api_login, TEST_ADMIN, TEST_USER } from './helpers';

test.describe('Home & navigation — positive', () => {
    test('logged-out home shows marketing hero', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /AI teams/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /log in|browse teams|get started/i }).first()).toBeVisible();
    });

    test('browse teams is public', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible();
    });

    test('authenticated member sees slim sidebar links', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/home');
        const nav = page.locator('aside');
        await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Getting started', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Teams', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Realms', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'HUGs and Events', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'CliqHub Marketplace', exact: true })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Human Reviews', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'My Organizations', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'HUG', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Browse', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Builder', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Daemons', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Runs', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Reviews', exact: true })).toHaveCount(0);
        await expect(nav.getByText('Admin', { exact: true })).toHaveCount(0);
    });

    test('sidebar navigates to realms', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings');
        await page.getByRole('link', { name: 'Realms' }).click();
        await expect(page).toHaveURL(/\/realms/);
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
    });

    test('admin sees admin nav', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
        const nav = page.locator('aside');
        await expect(nav.getByText('Admin', { exact: true })).toBeVisible();
        await expect(nav.locator('a[href="/admin/accounts"]')).toBeVisible();
        await expect(nav.locator('a[href="/admin/orgs"]')).toBeVisible();
        await expect(nav.locator('a[href="/admin/audit"]')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible();
    });
});

test.describe('Home & navigation — negative', () => {
    test('logged-in user visiting / is redirected to home', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/');
        await page.waitForURL((url) => url.pathname.includes('/home'), { timeout: 10_000 });
        expect(page.url()).toContain('/home');
    });

    test('unknown route does not crash app', async ({ page }) => {
        await page.goto('/this-route-does-not-exist-xyz');
        await expect(page.locator('body')).toBeVisible();
        const crashed = await page.getByText(/something went wrong|unhandled|stack trace/i).isVisible().catch(() => false);
        expect(crashed).toBe(false);
    });
});
