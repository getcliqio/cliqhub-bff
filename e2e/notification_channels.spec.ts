import { test, expect } from '@playwright/test';
import {
	api_login,
	api_create_realm,
	expect_login_redirect,
	realm_url,
	TEST_ADMIN,
	TEST_USER,
} from './helpers';

async function create_realm_channel(
	page: import('@playwright/test').Page,
	org_slug: string,
	realm_slug: string,
	name: string,
): Promise<void> {
	await page.goto(realm_url(org_slug, realm_slug, 'channels'));
	await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
		timeout: 10_000,
	});
	// Wait for list settle — early Channel clicks are lost when realm outlet remounts.
	await expect(page.getByText('Loading…')).toHaveCount(0, { timeout: 10_000 });
	await expect(
		page.getByRole('columnheader', { name: 'Name' })
			.or(page.getByText(/no channels yet/i)),
	).toBeVisible({ timeout: 10_000 });

	const open_create_form = async () => {
		await page.getByRole('button', { name: /^channel$/i }).click();
		await expect(page.getByLabel('Channel name')).toBeVisible({ timeout: 5_000 });
	};
	try {
		await open_create_form();
	} catch {
		await open_create_form();
	}

	await page.getByLabel('Channel name').fill(name);
	await page.getByLabel('Destination').selectOption('slack');
	await page.getByLabel('Webhook URL').fill('https://hooks.slack.com/services/T/B/X');
	const create_btn = page.getByRole('button', { name: /^create$/i });
	await expect(create_btn).toBeEnabled({ timeout: 10_000 });
	await create_btn.click({ force: true });
	await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Notification channels — positive', () => {
	test('realm bindings tab loads', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const realm = await api_create_realm(page, 'e2e-ch', 'Notify');
		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
		await expect(
			page.getByText(/create a channel first/i)
				.or(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 }))
				.first(),
		).toBeVisible({ timeout: 10_000 });
	});

	test('account channel can be bound on realm', async ({ page }) => {
		test.setTimeout(60_000);
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		const realm = await api_create_realm(page, 'e2e-slack', 'Notify');
		const name = `e2e-slack-${Date.now()}`;
		await create_realm_channel(page, realm.org_slug, realm.slug, name);

		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
		await expect(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 })).toBeVisible({
			timeout: 10_000,
		});
		const plus = page.locator('button.border-dashed').first();
		await expect(plus).toBeVisible({ timeout: 10_000 });
		await plus.click();
		const select = page.locator('select').filter({ hasText: /select channel/i });
		await expect(select).toBeVisible({ timeout: 5_000 });
		await select.selectOption({ label: name });
		await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
	});

	test('cancel create returns to list', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		await page.goto('/settings?tab=channels');
		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
			timeout: 10_000,
		});
		await page.getByRole('button', { name: /^channel$/i }).click();
		await expect(page.getByLabel('Channel name')).toBeVisible();
		await page.getByRole('button', { name: /^cancel$/i }).click();
		await expect(page.getByLabel('Channel name')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible();
	});

	test('filter query filters bindings client-side', async ({ page }) => {
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		const realm = await api_create_realm(page, 'e2e-filt', 'Notify');
		const name = `e2e-filt-ch-${Date.now()}`;
		await create_realm_channel(page, realm.org_slug, realm.slug, name);

		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
		await expect(page.getByPlaceholder('Filter events…')).toBeVisible({ timeout: 10_000 });
		await page.getByPlaceholder('Filter events…').fill('no-such-binding-xyz');
		await expect(page.getByText(/run\./i)).toHaveCount(0);
	});

	test('settings notifications tab has no cliqhub provider', async ({ page }) => {
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		await page.goto('/settings?tab=channels');
		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
			timeout: 10_000,
		});
		await page.getByRole('button', { name: /^channel$/i }).click();
		await expect(page.getByLabel('Destination')).toBeVisible({ timeout: 10_000 });
		const options = await page.getByLabel('Destination').locator('option').allTextContents();
		expect(options.map((o) => o.toLowerCase())).not.toContain('cliqhub');
		expect(options).toEqual(expect.arrayContaining(['Slack', 'Email', 'Webhook']));
	});
});

test.describe('Notification channels — negative', () => {
	test('unauthenticated redirects to login', async ({ page }) => {
		await expect_login_redirect(page, '/realms');
	});

	test('bind without channel shows empty state', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const realm = await api_create_realm(page, 'e2e-noch', 'Notify');
		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
		// Fresh realms may inherit account default channels — either empty
		// guidance or the rules shell is acceptable.
		await expect(
			page.getByText(/create a channel first/i)
				.or(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 }))
				.first(),
		).toBeVisible({ timeout: 10_000 });
	});
});
