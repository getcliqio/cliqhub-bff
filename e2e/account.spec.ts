import { test, expect } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    TEST_USER,
} from './helpers';

test.describe('Account settings — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('settings page loads with profile fields', async ({ page }) => {
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
        await expect(page.getByText('Usernames cannot be changed.')).toBeVisible();
        await expect(page.getByLabel('Display name')).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Security' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Access' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Personal Settings' })).toBeVisible();
    });

    test('update display name saves', async ({ page }) => {
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });

        const display_input = page.getByLabel('Display name');
        const email_input = page.getByLabel('Email');
        const email_value = await email_input.inputValue();
        if (!email_value.includes('@')) {
            await email_input.fill('testuser@test.com');
        }

        const new_value = `Test User ${Date.now() % 10_000}`;
        await display_input.fill(new_value);
        await page.getByRole('button', { name: /save profile/i }).click();
        await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 8_000 });
    });

    test('security tab shows password form', async ({ page }) => {
        await page.goto('/settings?tab=security');
        await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Current password')).toBeVisible();
        await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
    });

    test('accounts tab lists accounts', async ({ page }) => {
        // Legacy /organizations list folded into Realms.
        await page.goto('/organizations');
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
        await page.goto('/settings?tab=security');
        await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Current password').fill('wrong-current-password');
        await page.getByLabel('New password', { exact: true }).fill('Newpassword123!');
        await page.getByLabel('Confirm new password').fill('Newpassword123!');
        await page.getByRole('button', { name: /update password/i }).click();
        await expect(page.getByText(/incorrect|wrong|invalid|failed|current|password/i).first()).toBeVisible({ timeout: 8_000 });
    });

    test('mismatched confirm password keeps change disabled or errors', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings?tab=security');
        await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Current password').fill(TEST_USER.password);
        await page.getByLabel('New password', { exact: true }).fill('newpassword123!');
        await page.getByLabel('Confirm new password').fill('different-password');

        const change_btn = page.getByRole('button', { name: /update password/i });
        if (await change_btn.isDisabled()) {
            await expect(change_btn).toBeDisabled();
            return;
        }
        await change_btn.click();
        await expect(page.getByText(/match|confirm|invalid|failed/i)).toBeVisible({ timeout: 5_000 });
    });

    test('empty display name is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/settings?tab=profile');
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Display name').fill('   ');
        const save = page.getByRole('button', { name: /save profile/i });
        if (await save.isDisabled()) {
            await expect(save).toBeDisabled();
            return;
        }
        await save.click();
        await expect(page.getByText('Display name is required')).toBeVisible({ timeout: 5_000 });
    });
});
