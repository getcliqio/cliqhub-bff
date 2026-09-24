import { test, expect } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    unique_slug,
    TEST_USER,
} from './helpers';

async function open_create_token(page: import('@playwright/test').Page): Promise<void> {
    await page.goto('/tokens');
    await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^create token$/i }).click();
    await expect(page.getByRole('heading', { name: 'Create user token' })).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/create=1/);
}

async function submit_create_token(
    page: import('@playwright/test').Page,
    name: string,
): Promise<void> {
    await page.getByLabel('Token name').fill(name);
    await page.getByRole('button', { name: /^create token$/i }).click();
}

test.describe('Tokens UI — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('tokens page loads', async ({ page }) => {
        await page.goto('/tokens');
        await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: /^create token$/i })).toBeVisible();
        await expect(page.getByLabel('Filter tokens')).toBeVisible();
        await expect(page.getByText('User token (PAT)')).toBeVisible();
    });

    test('create token full-width flow shows one-time secret', async ({ page }) => {
        await open_create_token(page);

        const name = unique_slug('e2e-tok');
        await submit_create_token(page, name);

        await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
        await expect(page).not.toHaveURL(/create=1/);
        await expect(page.getByText(/won't be able to see it again|copy this token/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(name)).toBeVisible();
        await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
    });

    test('cancel create returns to list', async ({ page }) => {
        await open_create_token(page);
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible();
        await expect(page).not.toHaveURL(/create=1/);
    });

    test('filter query is sent in list POST body', async ({ page }) => {
        await open_create_token(page);
        const name = unique_slug('e2e-filt');
        await submit_create_token(page, name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/auth/get_tokens')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === name,
        );
        await page.getByLabel('Filter tokens').fill(name);
        await page.getByRole('button', { name: /^apply$/i }).click();
        await filter_req;
        await expect(page).not.toHaveURL(/[?&]q=/);
        await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
    });

    test('revoke removes token from list', async ({ page }) => {
        await open_create_token(page);
        const name = unique_slug('e2e-rev');
        await submit_create_token(page, name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

        const row = page.locator('tr').filter({ has: page.getByText(name, { exact: true }) });
        await row.getByRole('button', { name: 'Revoke' }).click();
        await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 8_000 });
    });

    test('rotate shows a new one-time secret', async ({ page }) => {
        await open_create_token(page);
        const name = unique_slug('e2e-rot');
        await submit_create_token(page, name);
        await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });

        const row = page.locator('tr').filter({ has: page.getByText(name, { exact: true }) });
        await row.getByRole('button', { name: 'Rotate' }).click();
        await expect(page.getByText(/won't be able to see it again|copy this token/i)).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Tokens UI — negative', () => {
    test('unauthenticated access redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/tokens');
    });

    test('create without name shows validation error', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_create_token(page);
        await page.getByRole('button', { name: /^create token$/i }).click();
        await expect(page.getByText(/token name is required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('secret is not shown again after reload', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_create_token(page);

        const name = unique_slug('e2e-once');
        await submit_create_token(page, name);
        await expect(page.getByText(/copy this token/i)).toBeVisible({ timeout: 10_000 });

        await page.reload();
        await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(name)).toBeVisible();
        await expect(page.getByText(/copy this token/i)).toHaveCount(0);
    });
});
