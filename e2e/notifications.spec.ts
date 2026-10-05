import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { test, expect } from '@playwright/test';
import {
	api_create_realm,
	api_current_org_id,
	api_login,
	api_post,
	expect_api_ok,
	expect_login_redirect,
	new_tx_id,
	TEST_USER,
} from './helpers';

const DATABASE_URL = process.env.E2E_DATABASE_URL
	|| 'postgresql://cliqhub:cliqhub@localhost:5432/cliqhub_e2e';

/** Seed a failed run in the realm so `run.failed` names a real run (Core checks run ↔ realm). */
async function seed_failed_run(realm_id: string, org_id: string): Promise<string> {
	const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
	const run_id = randomUUID();
	const workspace_id = randomUUID();
	const now = Date.now();
	try {
		await pool.query(
			`INSERT INTO cliq.workspaces (id, path, name, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $4)`,
			[workspace_id, `/tmp/e2e-notif-${workspace_id.slice(0, 8)}`, 'e2e-notif', now],
		);
		await pool.query(
			`INSERT INTO cliq.team_runs (run_id, workspace_id, team_id, realm_id, org_id, state, started_at, completed_at)
			 VALUES ($1, $2, $3, $4, $5, 'failed', $6, $6)`,
			[run_id, workspace_id, 'e2e-notif-team', realm_id, org_id, now],
		);
		return run_id;
	} finally {
		await pool.end();
	}
}

test.describe('In-app notifications — positive', () => {
	test('default realm bindings deliver run.failed to the Inbox', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);

		const org_id = await api_current_org_id(page);
		const realm = await api_create_realm(page, 'e2e-notif', 'Notif');
		const run_id = await seed_failed_run(realm.id, org_id);

		const message = `e2e-run-failed-${Date.now()}`;
		const submitted = await expect_api_ok(await api_post(page, '/v1/events/submit', {
			tx_id: new_tx_id(),
			type: 'run.failed',
			realm_id: realm.id,
			run_id,
			daemon_id: `daemon-${realm.slug}`,
			message,
			severity: 'error',
		}));
		const event = (submitted.event ?? submitted.data ?? submitted) as { notifications?: string };
		expect(event.notifications).toBe('dispatched');

		await page.goto('/inbox?tab=all');
		await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({ timeout: 10_000 });
		const row = page.locator('[data-testid^="inbox-item-"]').filter({ hasText: message });
		await expect(row).toBeVisible({ timeout: 10_000 });
		await expect(row.locator('span.g-mono', { hasText: /^run\.failed$/ })).toBeVisible();
	});

	test('inbox lists notifications via POST body', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const list_req = page.waitForRequest((req) =>
			req.url().includes('/v1/inbox/get')
			&& req.method() === 'POST'
			&& (req.postDataJSON() as { limit?: number })?.limit === 50,
		);
		await page.goto('/inbox?tab=all');
		await list_req;
		await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({
			timeout: 10_000,
		});
		await expect(page.getByRole('tab', { name: /all notifications/i })).toHaveAttribute('aria-selected', 'true');
	});

	test('legacy /events redirects to the Inbox', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		await page.goto('/events?tab=all');
		await page.waitForURL(/\/inbox/, { timeout: 10_000 });
		await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({ timeout: 10_000 });
	});
});

test.describe('In-app notifications — negative', () => {
	test('unauthenticated redirects to login', async ({ page }) => {
		await expect_login_redirect(page, '/notifications');
	});

	test('unauthenticated inbox redirects to login', async ({ page }) => {
		await expect_login_redirect(page, '/inbox');
	});
});
