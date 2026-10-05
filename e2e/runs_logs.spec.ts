import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_api_ok,
    expect_login_redirect,
    realm_url,
    TEST_USER,
} from './helpers';

type Realm_row = { id: string; slug: string; org_slug: string };

/** First realm from `realms/get` (`data.items` PagedData). */
async function first_realm(page: Page): Promise<Realm_row> {
    const body = await expect_api_ok(await api_post(page, '/v1/realms/get', {}));
    const items = ((body.data as { items?: Array<Partial<Realm_row>> } | undefined)?.items) ?? [];
    expect(items.length, `expected a realm: ${JSON.stringify(body)}`).toBeGreaterThan(0);
    const realm = items[0]!;
    expect(realm.slug).toBeTruthy();
    expect(realm.org_slug).toBeTruthy();
    return { id: String(realm.id ?? ''), slug: String(realm.slug), org_slug: String(realm.org_slug) };
}

test.describe('Runs / logs — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('runs page loads under realm with filter', async ({ page }) => {
        const realm = await first_realm(page);
        await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Realm sections' }).getByRole('link', { name: 'Runs' })).toBeVisible();
    });

    test('runs filter query is sent in list POST body', async ({ page }) => {
        const realm = await first_realm(page);
        await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/realm_runs/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { q?: string })?.q === 'no-such-run-xyz',
        );
        await page.getByLabel('Search runs').fill('no-such-run-xyz');
        await filter_req;
        await expect(page).toHaveURL(/[?&]q=no-such-run-xyz/);
        await expect(page.getByText('No runs match these filters.')).toBeVisible({ timeout: 10_000 });
    });

    test('legacy /runs redirects into a realm', async ({ page }) => {
        await page.goto('/runs');
        await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/runs/, { timeout: 10_000 });
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
    });

    test('logs page loads with explorer shell', async ({ page }) => {
        const realm = await first_realm(page);
        await page.goto(realm_url(realm.org_slug, realm.slug, 'logs'));
        await page.waitForURL(/\/runs/, { timeout: 10_000 });
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
    });

    test('logs load via POST on page load', async ({ page }) => {
        const realm = await first_realm(page);
        const runs_req = page.waitForRequest((req) =>
            req.url().includes('/v1/realm_runs/get')
            && req.method() === 'POST',
        );
        await page.goto(realm_url(realm.org_slug, realm.slug, 'logs'));
        await page.waitForURL(/\/runs/, { timeout: 10_000 });
        const req = await runs_req;
        expect(req.postDataJSON()).toEqual(expect.objectContaining({ org_slug: realm.org_slug, slug: realm.slug }));
    });

    test('notifications and inbox shells load', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible({ timeout: 10_000 });

        await page.goto('/events');
        await page.waitForURL(/\/inbox/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('tab', { name: /all notifications/i }).click();
        await expect(page).toHaveURL(/tab=all/);

        await page.goto('/hug');
        await page.waitForURL(/\/inbox/, { timeout: 10_000 });
        await page.goto('/reviews');
        await page.waitForURL(/\/inbox/, { timeout: 10_000 });
    });

    test('home shows getting started or dashboard', async ({ page }) => {
        await page.goto('/home');
        await expect(
            page.getByRole('heading', { name: /good (morning|afternoon|evening)|burning the midnight oil/i }),
        ).toBeVisible({ timeout: 10_000 });
        await page.goto('/getting-started');
        await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({
            timeout: 10_000,
        });
    });

    test('legacy /bundles redirects to teams', async ({ page }) => {
        await page.goto('/bundles');
        await page.waitForURL(/\/teams/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Runs — negative', () => {
    test('unauthenticated runs redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/runs');
    });
});

test.describe('Runs — control routes (Slice 1 hard cut)', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('cancel / resume / supply_inputs / enqueue are registered', async ({ page }) => {
        const fake_run = '00000000-0000-4000-8000-000000000099';
        const cases: Array<{ path: string; body: Record<string, unknown> }> = [
            { path: '/v1/runs/cancel', body: { run_id: fake_run } },
            { path: '/v1/runs/resume', body: { run_id: fake_run, from_phase: 'phase_a' } },
            { path: '/v1/runs/supply_inputs', body: { run_id: fake_run, inputs: { x: '1' } } },
            { path: '/v1/runs/enqueue', body: { realm_id: 'r-missing', team_id: 'scope/slug' } },
        ];
        for (const c of cases) {
            const res = await api_post(page, c.path, c.body);
            const body = await res.json().catch(() => ({}));
            const msg = JSON.stringify(body);
            expect(msg, `${c.path} must not be BFF unknown route`).not.toMatch(/Unknown API route/i);
            expect(res.status(), c.path).toBeGreaterThanOrEqual(400);
            expect(res.status(), c.path).toBeLessThan(500);
        }
    });

    test('force_terminate is hard-cut (folded into cancel)', async ({ page }) => {
        const res = await api_post(page, '/v1/runs/force_terminate', {
            run_id: '00000000-0000-4000-8000-000000000099',
        });
        const body = await res.json().catch(() => ({}));
        expect(res.status()).toBe(404);
        expect(JSON.stringify(body)).toMatch(/Unknown API route/i);
    });

    test('legacy dispatch schedule/claim paths are gone', async ({ page }) => {
        for (const path of [
            '/v1/dispatch/cancel',
            '/v1/dispatch/run',
            '/v1/dispatch/enqueue',
            '/v1/dispatch/claim',
            '/v1/dispatch/queue/get_by_id',
        ]) {
            const res = await api_post(page, path, { run_id: 'x', queue_item_id: 'x', daemon_id: 'd' });
            const body = await res.json().catch(() => ({}));
            expect(res.status(), path).toBe(404);
            expect(JSON.stringify(body), path).toMatch(/Unknown API route/i);
        }
    });
});
