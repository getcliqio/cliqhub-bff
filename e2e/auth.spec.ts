import { test, expect } from '@playwright/test';
import {
    ui_login,
    api_login,
    api_logout,
    api_session_get,
    api_post,
    expect_alert,
    expect_login_redirect,
    TEST_ADMIN,
    TEST_USER,
    TEST_SUSPENDED,
} from './helpers';

test.describe('Auth — positive', () => {
    test('login with valid credentials leaves /login', async ({ page }) => {
        await ui_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        expect(page.url()).not.toContain('/login');
    });

    test('admin lands on /home after UI login', async ({ page }) => {
        await ui_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await expect(page).toHaveURL(/\/home/);
    });

    test('member lands on redirect target after UI login', async ({ page }) => {
        await page.goto('/login?redirect=/settings');
        await page.getByLabel('Username').fill(TEST_USER.username);
        await page.getByLabel('Password').fill(TEST_USER.password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.waitForURL((url) => url.pathname === '/settings', { timeout: 15_000 });
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    });

    test('logout returns to login', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: /^sign out$/i }).click();
        await page.waitForURL('**/login', { timeout: 10_000 });
        expect(page.url()).toContain('/login');
    });

    test('api session create then get succeeds', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const res = await api_session_get(page);
        expect(res.ok()).toBe(true);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data?.user?.username ?? body.user?.username).toBe(TEST_ADMIN.username);
    });
});

test.describe('Auth — negative', () => {
    test('wrong password shows error and stays on login', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Username').fill(TEST_ADMIN.username);
        await page.getByLabel('Password').fill('totally-wrong-password');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect_alert(page, /invalid|credentials|password/i);
        expect(page.url()).toContain('/login');
    });

    test('suspended user cannot log in', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Username').fill(TEST_SUSPENDED.username);
        await page.getByLabel('Password').fill(TEST_SUSPENDED.password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect_alert(page, /suspended|disabled|blocked/i);
        expect(page.url()).toContain('/login');
    });

    test('unknown user shows credentials error', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Username').fill('no-such-user-xyz');
        await page.getByLabel('Password').fill('whatever123');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect_alert(page, /invalid|credentials|not found|password/i);
        expect(page.url()).toContain('/login');
    });

    test('unauthenticated account page redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/settings');
    });

    test('unauthenticated tokens page redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/tokens');
    });

    test('signup is invite-only (no public registration form)', async ({ page }) => {
        await page.goto('/signup');
        await expect(page.getByRole('heading', { name: /invite only/i })).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', { name: /^log in$/i })).toBeVisible();
        await expect(page.getByLabel(/username/i)).toHaveCount(0);
    });

    test('logout clears session — protected page redirects again', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await api_logout(page);
        await expect_login_redirect(page, '/settings');
    });

    test('legacy /v1/auth/login|me|impersonate return 404', async ({ page }) => {
        for (const path of ['/v1/auth/login', '/v1/auth/me', '/v1/auth/impersonate'] as const) {
            const res = await api_post(page, path, {});
            expect(res.status(), `${path} should be gone`).toBe(404);
        }
    });
});
