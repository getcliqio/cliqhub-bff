import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    api_logout,
    api_post,
    api_session_get,
    expect_api_ok,
    expect_login_redirect,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

async function session_identity(page: Page): Promise<{ id: string; scope: string }> {
    const me = await expect_api_ok(await api_session_get(page));
    const data = (me.data ?? me) as {
        user?: { id?: string; username?: string };
        scopes?: Array<{ slug?: string; scope_type?: string }>;
    };
    const username = data.user?.username ?? '';
    const scopes = data.scopes ?? [];
    const scope =
        scopes.find((s) => s.slug === username)?.slug
        ?? scopes.find((s) => s.scope_type === 'user' || s.scope_type === 'personal')?.slug
        ?? scopes[0]?.slug;
    expect(data.user?.id, `session user missing: ${JSON.stringify(me)}`).toBeTruthy();
    expect(scope, `writable scope missing: ${JSON.stringify(me)}`).toBeTruthy();
    return { id: String(data.user!.id), scope: String(scope) };
}

/** Publish a public team so the Marketplace has at least one card. */
async function api_publish_catalog_team(page: Page): Promise<{ scope: string; name: string }> {
    const { scope } = await session_identity(page);
    const name = `e2e-browse-${Date.now().toString(36)}`;
    const team_yml = [
        `name: ${name}`,
        'description: E2E marketplace fixture',
        'phases:',
        '  - name: dev',
        '    type: standard',
        '',
    ].join('\n');
    await expect_api_ok(await api_post(page, '/v1/teams/create', { name, scope, manifest: team_yml }));
    const pkg = {
        'team.yml': team_yml,
        roles: [{ name: 'dev', content: 'You are a developer. Implement the change with tests and clear docs.' }],
    };
    await expect_api_ok(await api_post(page, '/v1/teams/publish', {
        name,
        scope,
        version: '1.0.0',
        visibility: 'public',
        description: 'E2E marketplace fixture',
        data_base64: Buffer.from(JSON.stringify(pkg), 'utf8').toString('base64'),
    }));
    return { scope, name };
}

test.describe('Teams browse — positive', () => {
    test('browse page shows heading and result state', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByRole('heading', { name: 'Marketplace', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/^\d[\d,]* teams?$/)).toBeVisible({ timeout: 10_000 });
        await expect(
            page.locator('[data-testid^="market-"]')
                .or(page.getByText(/no teams have been published yet/i))
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('search query is sent in list POST body', async ({ page }) => {
        await page.goto('/browse');
        await expect(page.getByLabel('Search teams')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/teams/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === 'tdd',
        );
        await page.getByLabel('Search teams').fill('tdd');
        await filter_req;
        await expect(page).toHaveURL(/[?&]q=tdd/);
        await expect(
            page.locator('[data-testid^="market-"]').or(page.getByText(/no teams match these filters/i)).first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('authenticated user can open my teams', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/teams');
        await expect(page.getByRole('heading', { name: /^teams$/i, level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: /new team/i })).toHaveAttribute('href', '/builder');
        await expect(page.getByLabel('Search teams')).toBeVisible();
    });

    test('my teams filter query is sent in list POST body', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/teams');
        await expect(page.getByLabel('Search teams')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/team_list/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { q?: string })?.q === 'no-such-team-xyz',
        );
        await page.getByLabel('Search teams').fill('no-such-team-xyz');
        await filter_req;
        await expect(page.getByText(/no teams match these filters/i)).toBeVisible({ timeout: 10_000 });
    });

    test('scopes page opens the settings scopes tab', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/scopes');
        await expect(page).toHaveURL(/\/settings\?tab=scopes/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'Scopes' })).toHaveAttribute('aria-current', 'page');
        await expect(page.getByText(/namespaces you can publish teams under/i)).toBeVisible();
    });

    test('scopes list is requested for the signed-in user', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const { id } = await session_identity(page);

        const list_req = page.waitForRequest((req) =>
            req.url().includes('/v1/orgs/get_scopes')
            && req.method() === 'POST'
            && (req.postDataJSON() as { user_id?: string })?.user_id === id,
        );
        await page.goto('/settings?tab=scopes');
        await list_req;
        await expect(page).not.toHaveURL(/[?&]q=/);
        await expect(
            page.getByRole('cell', { name: /^@/ }).or(page.getByText('No scopes.')).first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('public team detail opens from browse', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const team = await api_publish_catalog_team(page);
        await api_logout(page);

        await page.goto(`/browse?q=${encodeURIComponent(team.name)}`);
        await expect(page.getByRole('heading', { name: 'Marketplace', level: 1 })).toBeVisible({ timeout: 15_000 });
        const card = page.getByTestId(`market-${team.scope}/${team.name}`);
        await expect(card).toBeVisible({ timeout: 15_000 });
        await card.click();
        await page.waitForURL(new RegExp(`/browse/${team.scope}/${team.name}`));
        await expect(page.getByRole('heading', { name: team.name, level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('region', { name: 'Install' })).toBeVisible();
        await expect(page.getByRole('link', { name: /sign in to install/i })).toBeVisible();
    });

    test('signed-in browse card opens the team page', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const team = await api_publish_catalog_team(page);
        await page.goto(`/browse?q=${encodeURIComponent(team.name)}`);
        const card = page.getByTestId(`market-${team.scope}/${team.name}`);
        await expect(card).toBeVisible({ timeout: 15_000 });
        await card.click();
        await page.waitForURL(new RegExp(`/teams/${team.scope}/${team.name}`));
    });
});

test.describe('Teams — negative', () => {
    test('my teams requires authentication', async ({ page }) => {
        await expect_login_redirect(page, '/teams');
    });

    test('account team detail requires authentication', async ({ page }) => {
        await expect_login_redirect(page, '/teams/cliq/example');
    });

    test('no-match search still renders browse shell', async ({ page }) => {
        await page.goto('/browse');
        await page.getByLabel('Search teams').fill('zzz-no-match-e2e-xyz');
        await expect(page.getByText(/no teams match these filters/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/^0 teams$/)).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Marketplace', level: 1 })).toBeVisible();
    });

    test('builder requires a session', async ({ page }) => {
        await expect_login_redirect(page, '/builder');
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/builder');
        await expect(page.getByRole('heading', { name: 'What should your team do?', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Describe your team')).toBeVisible();
    });
});
