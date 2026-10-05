import { test, expect } from '@playwright/test';
import { api_login, TEST_ADMIN, TEST_USER } from './helpers';

test.describe('Home & navigation — positive', () => {
    test('logged-out home shows marketing hero', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /AI teams/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /sign in|browse teams|get started/i }).first()).toBeVisible();
    });

    test('browse teams is public', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible();
    });

    test('authenticated member sees slim sidebar links', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/home');
        const nav = page.getByRole('complementary', { name: 'Primary' });
        const main_nav = nav.getByRole('navigation', { name: 'Main' });
        await expect(main_nav.getByRole('link', { name: 'Overview', exact: true })).toBeVisible({ timeout: 10_000 });
        await expect(main_nav.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('href', /^\/home/);
        await expect(main_nav.getByRole('link', { name: /^Inbox/ })).toBeVisible();
        await expect(main_nav.getByRole('link', { name: 'Teams', exact: true })).toBeVisible();
        await expect(main_nav.getByRole('link', { name: 'Marketplace', exact: true })).toBeVisible();
        await expect(main_nav.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
        await expect(main_nav.getByRole('link', { name: 'Agents', exact: true })).toBeVisible();
        await expect(main_nav.getByRole('link', { name: 'Organization', exact: true })).toBeVisible();
        await expect(nav.getByTestId('sidebar-realms')).toContainText('Realms');
        await expect(nav.getByRole('link', { name: /^Docs/ })).toBeVisible();
        await expect(nav.getByTestId('account-button')).toContainText(`@${TEST_USER.username}`);
        await expect(nav.getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Human Reviews', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'My Organizations', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'HUG', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Browse', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Builder', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Daemons', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Runs', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'Reviews', exact: true })).toHaveCount(0);
        await expect(nav.getByRole('button', { name: /^Admin/ })).toHaveCount(0);
    });

    test('sidebar navigates to realms', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await page.getByTestId('view-switcher').click();
        await page.getByRole('dialog', { name: 'Switch view' }).getByRole('button', { name: 'All realms', exact: true }).click();
        await expect(page).toHaveURL(/\/realms/);
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
    });

    test('admin sees admin nav', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/home');
        await page.getByRole('complementary', { name: 'Primary' }).getByRole('button', { name: /^Admin/ }).click();
        await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Hub health', level: 1 })).toBeVisible({ timeout: 10_000 });

        const nav = page.getByRole('complementary', { name: 'Admin' });
        await expect(nav.getByText('ADMIN', { exact: true })).toBeVisible();
        await expect(nav.getByTestId('admin-back')).toHaveAttribute('href', /^\/home/);
        await expect(nav.locator('a[href="/admin/accounts"]')).toBeVisible();
        await expect(nav.locator('a[href="/admin/orgs"]')).toBeVisible();
        await expect(nav.locator('a[href="/admin/audit"]')).toBeVisible();

        await nav.getByRole('link', { name: 'Accounts', exact: true }).click();
        await expect(page).toHaveURL(/\/admin\/accounts/);
        await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible({ timeout: 10_000 });
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
