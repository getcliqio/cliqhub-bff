import { test, expect } from '@playwright/test';
import {
	api_current_org_id,
	api_login,
	api_post,
	expect_api_ok,
	expect_login_redirect,
	new_tx_id,
	unique_slug,
	TEST_USER,
} from './helpers';

test.describe('In-app notifications — positive', () => {
	test('default realm bindings deliver run.failed to Notifications page', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);

		const slug = unique_slug('e2e-notif');
		const org_id = await api_current_org_id(page);
		const created = await expect_api_ok(await api_post(page, '/v1/realms/create', {
			org_id,
			slug,
			name: `Notif ${slug}`,
		}));
		const realm = (created.realm ?? created.data) as { id?: string } | undefined;
		const realm_id = realm?.id;
		expect(realm_id, `realm id missing: ${JSON.stringify(created)}`).toBeTruthy();

		const message = `e2e-run-failed-${Date.now()}`;
		const submitted = await expect_api_ok(await api_post(page, '/v1/events/submit', {
			tx_id: new_tx_id(),
			type: 'run.failed',
			realm_id,
			run_id: `run-${slug}`,
			daemon_id: `daemon-${slug}`,
			message,
			severity: 'error',
		}));
		const event = (submitted.event ?? submitted) as { notifications?: string };
		expect(event.notifications).toBe('dispatched');

		await page.goto('/events?tab=all');
		await expect(page.getByRole('heading', { name: 'HUGs and Events' })).toBeVisible({
			timeout: 10_000,
		});
		const row = page.getByRole('row').filter({ hasText: message });
		await expect(row).toBeVisible({ timeout: 10_000 });
		await expect(row.getByText('run.failed')).toBeVisible();
	});

	test('notifications page lists via POST body', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const list_req = page.waitForRequest((req) =>
			req.url().includes('/v1/notifications/get')
			&& req.method() === 'POST',
		);
		await page.goto('/events?tab=all');
		await list_req;
		await expect(page.getByRole('heading', { name: 'HUGs and Events' })).toBeVisible({
			timeout: 10_000,
		});
	});
});

test.describe('In-app notifications — negative', () => {
	test('unauthenticated redirects to login', async ({ page }) => {
		await expect_login_redirect(page, '/notifications');
	});
});
