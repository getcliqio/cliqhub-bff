import { test, expect } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    TEST_USER,
} from './helpers';

test.describe('Drafts / my teams — positive', () => {
    test('authenticated user sees teams page shell', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/teams');
        await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Drafts / my teams — negative', () => {
    test('unauthenticated my-teams redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/teams');
    });
});
