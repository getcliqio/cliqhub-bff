import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    unique_slug,
    TEST_USER,
} from './helpers';

async function open_tokens_tab(page: Page): Promise<void> {
    await page.goto('/settings?tab=tokens');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /new token/i })).toBeVisible({ timeout: 10_000 });
}

async function open_create_token(page: Page): Promise<void> {
    await open_tokens_tab(page);
    await page.getByRole('button', { name: /new token/i }).click();
    await expect(page.getByRole('form', { name: 'New token' })).toBeVisible({ timeout: 5_000 });
}

async function submit_create_token(page: Page, name: string): Promise<void> {
    await page.getByLabel('Token name').fill(name);
    await page.getByRole('form', { name: 'New token' }).getByRole('button', { name: /^create token$/i }).click();
}

function token_row(page: Page, name: string) {
    return page.getByTestId(`token-${name}`);
}

test.describe('Tokens UI — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('tokens page loads', async ({ page }) => {
        await page.goto('/tokens');
        await page.waitForURL(/\/settings\?tab=tokens/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('navigation', { name: 'Settings' }).getByRole('button', { name: 'Access tokens', exact: true }))
            .toHaveAttribute('aria-current', 'page');
        await expect(page.getByRole('button', { name: /new token/i })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /^Name/ })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /^Works in/ })).toBeVisible();
        await expect(page.getByText(/they act as you/i)).toBeVisible();
    });

    test('create token full-width flow shows one-time secret', async ({ page }) => {
        await open_create_token(page);

        const name = unique_slug('e2e-tok');
        await submit_create_token(page, name);

        const reveal = page.getByTestId('secret-reveal');
        await expect(reveal).toBeVisible({ timeout: 10_000 });
        await expect(reveal).toContainText(`${name} created`);
        await expect(reveal).toContainText(/won.t be shown again/i);
        await expect(reveal.getByTestId('secret-value')).not.toBeEmpty();
        await expect(reveal.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
        await expect(page.getByRole('form', { name: 'New token' })).toHaveCount(0);
        await expect(token_row(page, name)).toBeVisible({ timeout: 10_000 });
    });

    test('cancel create returns to list', async ({ page }) => {
        await open_create_token(page);
        await page.getByRole('form', { name: 'New token' }).getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('form', { name: 'New token' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /new token/i })).toBeVisible();
    });

    test('list query is sent in POST body', async ({ page }) => {
        const list_req = page.waitForRequest((req) =>
            req.url().includes('/v1/auth/get_tokens')
            && req.method() === 'POST'
            && (req.postDataJSON() as { type?: string })?.type === 'user',
        );
        await open_tokens_tab(page);
        const req = await list_req;
        expect(new URL(req.url()).search).toBe('');
    });

    test('revoke removes token from list', async ({ page }) => {
        await open_create_token(page);
        const name = unique_slug('e2e-rev');
        await submit_create_token(page, name);
        const row = token_row(page, name);
        await expect(row).toBeVisible({ timeout: 10_000 });

        await row.getByRole('button', { name: 'Revoke…' }).click();
        await row.getByRole('button', { name: 'Revoke', exact: true }).click();
        await expect(page.getByText(`${name} revoked`)).toBeVisible({ timeout: 8_000 });
        await expect(token_row(page, name)).toHaveCount(0, { timeout: 8_000 });
    });

    test('rotate shows a new one-time secret', async ({ page }) => {
        await open_create_token(page);
        const name = unique_slug('e2e-rot');
        await submit_create_token(page, name);
        const reveal = page.getByTestId('secret-reveal');
        await expect(reveal).toBeVisible({ timeout: 10_000 });
        const first_secret = await reveal.getByTestId('secret-value').textContent();

        const row = token_row(page, name);
        await expect(row).toBeVisible({ timeout: 10_000 });
        await row.getByRole('button', { name: 'Rotate…' }).click();
        await row.getByRole('button', { name: 'Rotate', exact: true }).click();
        await expect(reveal).toContainText(`${name} rotated`, { timeout: 10_000 });
        await expect(reveal).toContainText(/won.t be shown again/i);
        await expect(reveal.getByTestId('secret-value')).not.toHaveText(first_secret ?? '');
    });
});

test.describe('Tokens UI — negative', () => {
    test('unauthenticated access redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/tokens');
    });

    test('create without name keeps create disabled', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_create_token(page);
        const create_btn = page.getByRole('form', { name: 'New token' }).getByRole('button', { name: /^create token$/i });
        await expect(create_btn).toBeDisabled();
        await page.getByLabel('Token name').fill('   ');
        await expect(create_btn).toBeDisabled();
    });

    test('secret is not shown again after reload', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_create_token(page);

        const name = unique_slug('e2e-once');
        await submit_create_token(page, name);
        await expect(page.getByTestId('secret-reveal')).toBeVisible({ timeout: 10_000 });

        await page.reload();
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(token_row(page, name)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('secret-reveal')).toHaveCount(0);
    });
});
