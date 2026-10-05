import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { test, expect, type Page } from '@playwright/test';
import { e2e_database_url } from './e2e_database';
import {
    api_login,
    api_current_org_id,
    expect_api_ok,
    api_post,
    TEST_ADMIN,
    TEST_USER,
    wait_for_active_org,
} from './helpers';

const MISSING_RUN_ID = '00000000-0000-4000-8000-000000000099';

/** Insert a finished run (and its workspace) in the caller's first realm; returns run_id. */
async function seed_visible_run(page: Page): Promise<string> {
    const listed = await expect_api_ok(await api_post(page, '/v1/realms/get', {}));
    const realm_id = ((listed.data as { items?: Array<{ id?: string }> } | undefined)?.items ?? [])[0]?.id;
    expect(realm_id, `expected a realm: ${JSON.stringify(listed)}`).toBeTruthy();

    const pool = new pg.Pool({ connectionString: e2e_database_url, ssl: false });
    const run_id = randomUUID();
    const workspace_id = randomUUID();
    const now = Date.now();
    try {
        const realm = await pool.query(`SELECT org_id FROM cliq.realms WHERE id = $1`, [realm_id]);
        expect(realm.rows[0]?.org_id, `realm ${realm_id} missing in e2e DB`).toBeTruthy();
        const org_id = String(realm.rows[0].org_id);
        await pool.query(
            `INSERT INTO cliq.workspaces (id, path, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)`,
            [workspace_id, `/tmp/e2e-tel-${workspace_id.slice(0, 8)}`, 'e2e telemetry', now],
        );
        await pool.query(
            `INSERT INTO cliq.team_runs
                (run_id, workspace_id, team_id, realm_id, org_id, run_name, state, started_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $7)`,
            [run_id, workspace_id, 'e2e/telemetry', realm_id, org_id, `e2e-tel-${run_id.slice(0, 8)}`, now],
        );
        return run_id;
    } finally {
        await pool.end();
    }
}

/**
 * TEL-ENV — browser + API proof that get_telemetry returns `{ ok, data }`
 * and the home overview renders from its `{ ok, data }` read.
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
        expect(body).not.toHaveProperty('totals');
        expect(body).not.toHaveProperty('by_day');
    });

    test('get_telemetry usage returns data.run / data.phases', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const run_id = await seed_visible_run(page);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
            kind: 'usage',
            run_id,
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
        const run_id = await seed_visible_run(page);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
            kind: 'spans',
            run_id,
        }));
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body).not.toHaveProperty('spans');
    });

    test('home overview loads and issues enveloped overview read', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const overview = page.waitForResponse(
            (res) => res.url().includes('/v1/overview/get') && res.request().method() === 'POST',
            { timeout: 20_000 },
        );
        await page.goto('/home');
        await wait_for_active_org(page);
        const res = await overview;
        expect(res.ok()).toBe(true);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data).toBeTruthy();
        expect(json.data.totals).toBeTruthy();
        expect(json).not.toHaveProperty('totals');

        const crashed = await page.getByText(/something went wrong|unhandled|stack trace/i).isVisible().catch(() => false);
        expect(crashed).toBe(false);
        await expect(
            page.getByRole('heading', { name: /good (morning|afternoon|evening)|you don.t have any realms yet/i }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
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

    test('usage / spans for an unknown run are hidden as 404', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        for (const kind of ['usage', 'spans']) {
            const res = await api_post(page, '/v1/runs/get_telemetry', { kind, run_id: MISSING_RUN_ID });
            expect(res.status(), kind).toBe(404);
            const body = await res.json();
            expect(body.ok, kind).toBe(false);
            expect(body.error?.code, kind).toBe('not_found');
        }
    });
});
