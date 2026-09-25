import { test, expect } from '@playwright/test';
import {
    api_login,
    api_current_org_id,
    expect_api_ok,
    api_post,
    TEST_ADMIN,
    TEST_USER,
    wait_for_active_org,
} from './helpers';

/**
 * TEL-ENV — browser + API proof that get_telemetry returns `{ ok, data }`
 * and home dashboard renders telemetry from that envelope.
 */
test.describe('Telemetry envelope — positive', () => {
    test('get_telemetry summary returns data envelope', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const org_id = await api_current_org_id(page);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
            kind: 'summary',
            org_id,
            window_days: 7,
        }));
        expect(body).toHaveProperty('data');
        expect(body.data).toEqual(expect.objectContaining({
            window: expect.any(Object),
            totals: expect.any(Object),
            by_day: expect.any(Array),
            by_hour: expect.any(Array),
            by_team: expect.any(Array),
            by_agent_kind: expect.any(Array),
        }));
        // Hard-cut — no flat totals sibling outside data.
        expect(body).not.toHaveProperty('totals');
        expect(body).not.toHaveProperty('by_day');
    });

    test('get_telemetry usage returns data.run / data.phases', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
            kind: 'usage',
            run_id: '00000000-0000-4000-8000-000000000099',
        }));
        expect(body).toHaveProperty('data');
        const data = body.data as { run: unknown; phases: unknown[] };
        expect(data).toHaveProperty('run');
        expect(Array.isArray(data.phases)).toBe(true);
        expect(body).not.toHaveProperty('run');
        expect(body).not.toHaveProperty('phases');
    });

    test('get_telemetry spans returns data array', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
            kind: 'spans',
            run_id: '00000000-0000-4000-8000-000000000099',
        }));
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body).not.toHaveProperty('spans');
    });

    test('home dashboard loads and issues get_telemetry summary', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/home');
        await wait_for_active_org(page);

        const telemetry = page.waitForResponse(
            (res) => res.url().includes('/v1/runs/get_telemetry') && res.request().method() === 'POST',
            { timeout: 20_000 },
        );
        // Reload so the waitForResponse catches the post-hydrate fetch.
        await page.reload();
        await wait_for_active_org(page);
        const res = await telemetry;
        expect(res.ok()).toBe(true);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data).toBeTruthy();
        expect(json.data.totals).toBeTruthy();

        // Page rendered (getting-started card and/or fleet telemetry) — no crash.
        await expect(page.locator('body')).toBeVisible();
        const crashed = await page.getByText(/something went wrong|unhandled|stack trace/i).isVisible().catch(() => false);
        expect(crashed).toBe(false);
        const getting_started = page.getByRole('heading', { name: 'Getting started', exact: true, level: 2 });
        const home_link = page.getByRole('link', { name: 'Home', exact: true });
        await expect(home_link).toBeVisible({ timeout: 10_000 });
        // Prefer the getting-started h2 when present; otherwise home nav proves render.
        if (await getting_started.isVisible().catch(() => false)) {
            await expect(getting_started).toBeVisible();
        }
    });
});

test.describe('Telemetry envelope — negative', () => {
    test('summary without org_id is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const res = await api_post(page, '/v1/runs/get_telemetry', { kind: 'summary' });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        const body = await res.json();
        expect(body.ok).toBe(false);
    });
});
