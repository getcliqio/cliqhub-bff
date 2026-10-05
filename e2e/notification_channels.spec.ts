import { test, expect, type Page } from '@playwright/test';
import {
	api_login,
	api_create_realm,
	expect_login_redirect,
	realm_url,
	TEST_ADMIN,
	TEST_USER,
} from './helpers';

function notifications_url(org_slug: string, tab: 'rules' | 'channels' = 'rules'): string {
	const params = new URLSearchParams({ org: org_slug });
	if (tab !== 'rules') params.set('tab', tab);
	return `/notifications?${params}`;
}

async function expect_notifications_page(page: Page): Promise<void> {
	await expect(page.getByRole('heading', { name: 'Notifications', exact: true, level: 1 })).toBeVisible({
		timeout: 10_000,
	});
	await expect(page.getByRole('tablist', { name: 'Notifications' })).toBeVisible();
}

async function create_org_channel(page: Page, org_slug: string, name: string): Promise<void> {
	await page.goto(notifications_url(org_slug, 'channels'));
	await expect_notifications_page(page);
	await page.getByRole('button', { name: /^new channel$/i }).click();
	const drawer = page.getByRole('dialog', { name: 'New channel' });
	await expect(drawer).toBeVisible({ timeout: 5_000 });

	await drawer.getByLabel('Name').fill(name);
	await drawer.getByRole('radio', { name: 'The whole org' }).click();
	await drawer.getByLabel('Destination 1 type').selectOption('slack');
	await drawer.getByLabel('Destination 1 value').fill('https://hooks.slack.com/services/T/B/X');
	const create_btn = drawer.getByRole('button', { name: /^create channel$/i });
	await expect(create_btn).toBeEnabled({ timeout: 10_000 });
	await create_btn.click();
	await expect(drawer).toHaveCount(0, { timeout: 15_000 });
	await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible({ timeout: 15_000 });
}

test.describe('Notification channels — positive', () => {
	test('legacy realm notifications URL opens the Notifications center', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const realm = await api_create_realm(page, 'e2e-ch', 'Notify');
		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
		await page.waitForURL(/\/notifications\?org=/, { timeout: 10_000 });
		await expect_notifications_page(page);
		await expect(page.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true');
	});

	test('org channel can be bound to a realm with a rule', async ({ page }) => {
		test.setTimeout(60_000);
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		const realm = await api_create_realm(page, 'e2e-slack', 'Notify');
		const name = `e2e-slack-${Date.now()}`;
		await create_org_channel(page, realm.org_slug, name);

		await page.getByRole('tab', { name: 'Rules' }).click();
		await page.getByRole('textbox', { name: 'Search realms' }).fill(realm.slug);
		await expect(page.getByTestId('realm-range')).toHaveText(/Realms 1–1 of 1/, { timeout: 10_000 });

		await page.getByRole('button', { name: /^new rule$/i }).click();
		const drawer = page.getByRole('dialog', { name: 'New rule' });
		await expect(drawer).toBeVisible({ timeout: 5_000 });
		await drawer.getByRole('radio', { name: 'One realm' }).click();
		await drawer.getByRole('button', { name: 'Realm', exact: true }).click();
		await drawer.getByLabel('Search realm', { exact: true }).fill(realm.slug);
		await drawer.getByRole('listbox', { name: 'Realm' }).getByRole('option').filter({ hasText: realm.slug }).first().click();
		await expect(drawer.getByRole('button', { name: 'Realm', exact: true })).toHaveText(new RegExp(realm.slug));
		await drawer.locator('#nr-channel').selectOption({ label: name });
		await drawer.getByRole('button', { name: /^save rule$/i }).click();
		await expect(drawer).toHaveCount(0, { timeout: 15_000 });

		const rule_row = page.getByRole('row').filter({ hasText: name }).filter({ hasText: realm.slug });
		await expect(rule_row).toBeVisible({ timeout: 15_000 });
		await expect(rule_row.getByText('run.failed', { exact: true })).toBeVisible();
	});

	test('cancel create returns to list', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		await page.goto('/notifications?tab=channels');
		await expect_notifications_page(page);
		await page.getByRole('button', { name: /^new channel$/i }).click();
		const drawer = page.getByRole('dialog', { name: 'New channel' });
		await expect(drawer.getByLabel('Name')).toBeVisible();
		await drawer.getByRole('button', { name: /^cancel$/i }).click();
		await expect(drawer).toHaveCount(0);
		await expect(page.getByRole('tab', { name: 'Channels' })).toHaveAttribute('aria-selected', 'true');
	});

	test('rule search filters rules client-side', async ({ page }) => {
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		const realm = await api_create_realm(page, 'e2e-filt', 'Notify');
		await page.goto(notifications_url(realm.org_slug));
		await expect_notifications_page(page);
		await page.getByLabel('Search rules').fill('no-such-rule-xyz');
		await expect(page.getByText(/no rules here yet/i)).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('[data-testid^="rule-"]')).toHaveCount(0);
	});

	test('legacy settings channels tab offers in-app, Slack, email and webhook destinations', async ({ page }) => {
		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
		await page.goto('/settings?tab=channels');
		await page.waitForURL(/\/notifications\?tab=channels/, { timeout: 10_000 });
		await expect_notifications_page(page);
		await page.getByRole('button', { name: /^new channel$/i }).click();
		const drawer = page.getByRole('dialog', { name: 'New channel' });
		await expect(drawer.getByLabel('Destination 1 type')).toBeVisible({ timeout: 10_000 });
		const options = await drawer.getByLabel('Destination 1 type').locator('option').allTextContents();
		expect(options).toEqual(['In-app', 'Slack', 'Email', 'Webhook']);
	});
});

test.describe('Notification channels — negative', () => {
	test('unauthenticated redirects to login', async ({ page }) => {
		await expect_login_redirect(page, '/notifications');
	});

	test('rule without a channel cannot be saved', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		const realm = await api_create_realm(page, 'e2e-noch', 'Notify');
		await page.goto(notifications_url(realm.org_slug));
		await expect_notifications_page(page);
		await page.getByRole('button', { name: /^new rule$/i }).click();
		const drawer = page.getByRole('dialog', { name: 'New rule' });
		await expect(drawer).toBeVisible({ timeout: 5_000 });
		await expect(drawer.locator('#nr-channel')).toHaveValue('');
		await expect(drawer.getByRole('button', { name: /^save rule$/i })).toBeDisabled();
	});

	test('channel without a name cannot be created', async ({ page }) => {
		await api_login(page, TEST_USER.username, TEST_USER.password);
		await page.goto('/notifications?tab=channels');
		await expect_notifications_page(page);
		await page.getByRole('button', { name: /^new channel$/i }).click();
		const drawer = page.getByRole('dialog', { name: 'New channel' });
		await expect(drawer.getByLabel('Name')).toBeVisible({ timeout: 5_000 });
		await expect(drawer.getByRole('button', { name: /^create channel$/i })).toBeDisabled();
	});
});
