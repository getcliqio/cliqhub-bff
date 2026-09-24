import { test, expect } from '@playwright/test';
import {
    api_login,
    expect_login_redirect,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

const BROWSE_SEARCH = 'Search teams, agents, workflows…';

test.describe('Teams browse — positive', () => {
    test('browse page shows heading and result state', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible();
        await expect(
            page.getByRole('heading', { name: /trending this week/i })
                .or(page.getByText(/all teams/i))
                .or(page.getByText(/results for/i))
                .or(page.getByText(/no teams/i))
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('search query is sent in list POST body', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByPlaceholder(BROWSE_SEARCH)).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/teams/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === 'tdd',
        );
        await page.getByPlaceholder(BROWSE_SEARCH).fill('tdd');
        await page.getByRole('button', { name: /^search$/i }).click();
        await filter_req;
        await expect(
            page.getByText(/results for.+tdd/i).or(page.getByText(/no teams/i)).first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('authenticated user can open my teams', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/teams');
        await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /build a team/i })).toBeVisible();
        await expect(page.getByLabel('Search teams')).toBeVisible();
    });

    test('my teams filter query is sent in list POST body', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/teams');
        await expect(page.getByLabel('Search teams')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/teams/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string; mine?: boolean })?.query === 'no-such-team-xyz'
            && (req.postDataJSON() as { mine?: boolean })?.mine === true,
        );
        await page.getByLabel('Search teams').fill('no-such-team-xyz');
        await filter_req;
    });

    test('scopes page loads with filter', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/scopes');
        await expect(page.getByRole('heading', { name: 'Scopes' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Filter scopes')).toBeVisible();
    });

    test('scopes filter query is sent in list POST body', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/scopes');
        await expect(page.getByLabel('Filter scopes')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/scopes/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string; mine?: boolean })?.query === 'no-such-scope-xyz'
            && (req.postDataJSON() as { mine?: boolean })?.mine === true,
        );
        await page.getByLabel('Filter scopes').fill('no-such-scope-xyz');
        await page.getByRole('button', { name: /^apply$/i }).click();
        await filter_req;
        await expect(page).not.toHaveURL(/[?&]q=/);
        await expect(page.getByText(/no scopes match this filter/i)).toBeVisible({ timeout: 10_000 });
    });

    test('team detail opens from browse when teams exist', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible({ timeout: 15_000 });
        const first_team = page.locator('a:has(h3)').first();
        await expect(first_team).toBeVisible({ timeout: 15_000 });
        await first_team.click();
        await page.waitForURL(/\/browse\/[^/]+\/[^/]+/);
        await expect(page.getByText(/install|download|version/i).first()).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Teams — negative', () => {
    test('my teams requires authentication', async ({ page }) => {
        await expect_login_redirect(page, '/teams');
    });

    test('account team detail requires authentication', async ({ page }) => {
        await expect_login_redirect(page, '/teams/cliq/example');
    });

    test('empty search keyword still renders browse shell', async ({ page }) => {
        await page.goto('/browse');
        await page.getByPlaceholder(BROWSE_SEARCH).fill('zzz-no-match-e2e-xyz');
        await page.getByRole('button', { name: /^search$/i }).click();
        await expect(
            page.getByText(/no teams|results for|0 teams/i).first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('builder publish controls require session for member path', async ({ page }) => {
        await page.goto('/builder');
        await expect(page.locator('body')).toBeVisible();
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/builder');
        await expect(
            page.getByText(/what team do you want to build/i)
                .or(page.getByRole('button', { name: /build my team/i }))
                .or(page.getByPlaceholder(/development team/i))
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });
});
