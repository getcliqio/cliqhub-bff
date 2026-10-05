import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    TEST_USER,
} from './helpers';

async function open_password_tab(page: Page): Promise<void> {
    await page.goto('/settings?tab=password');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('form', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
}

test.describe('Account settings — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('settings page loads with profile fields', async ({ page }) => {
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('form', { name: 'Profile' })).toBeVisible();
        await expect(page.getByText(/can.t be changed/i)).toBeVisible();
        await expect(page.getByLabel('Display name')).toBeVisible();
        await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Username', { exact: true })).toHaveValue(TEST_USER.username);
        const settings_nav = page.getByRole('navigation', { name: 'Settings' });
        await expect(settings_nav.getByRole('button', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');
        await expect(settings_nav.getByRole('button', { name: 'Password', exact: true })).toBeVisible();
        await expect(settings_nav.getByRole('button', { name: 'Access tokens', exact: true })).toBeVisible();
        await expect(settings_nav.getByRole('button', { name: 'My scopes', exact: true })).toBeVisible();
    });

    test('update display name saves', async ({ page }) => {
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });

        const display_input = page.getByLabel('Display name');
        const email_input = page.getByLabel('Email', { exact: true });
        const email_value = await email_input.inputValue();
        if (!email_value.includes('@')) {
            await email_input.fill('testuser@test.com');
        }

        const new_value = `Test User ${Date.now() % 10_000}`;
        await display_input.fill(new_value);
        await page.getByRole('form', { name: 'Profile' }).getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 8_000 });
    });

    test('security tab shows password form', async ({ page }) => {
        await page.goto('/settings?tab=security');
        await page.waitForURL(/[?&]tab=password/, { timeout: 10_000 });
        await expect(page.getByRole('form', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Current password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeVisible();
    });

    test('accounts tab lists accounts', async ({ page }) => {
        await page.goto('/settings?tab=accounts');
        await page.waitForURL(/\/realms/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Account settings — negative', () => {
    test('unauthenticated access redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/settings?tab=profile');
    });

    test('wrong current password is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_password_tab(page);

        await page.getByLabel('Current password').fill('wrong-current-password');
        await page.getByLabel('New password (8+ characters)').fill('Newpassword123!');
        await page.getByLabel('Confirm new password').fill('Newpassword123!');
        await page.getByRole('button', { name: 'Change password', exact: true }).click();
        const form_alert = page.getByRole('form', { name: 'Change password' }).getByRole('alert');
        await expect(form_alert).toBeVisible({ timeout: 8_000 });
        await expect(form_alert).toContainText(/incorrect|wrong|invalid|failed|current|password/i);
    });

    test('mismatched confirm password keeps change disabled or errors', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_password_tab(page);

        await page.getByLabel('Current password').fill(TEST_USER.password);
        await page.getByLabel('New password (8+ characters)').fill('newpassword123!');
        await page.getByLabel('Confirm new password').fill('different-password');

        await expect(page.getByText(/passwords don.t match/i)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeDisabled();
    });

    test('empty display name is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Display name').fill('   ');
        await page.getByRole('form', { name: 'Profile' }).getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'Display name is required.' })).toBeVisible({ timeout: 5_000 });
    });
});
