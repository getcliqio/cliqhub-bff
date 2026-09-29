# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notification_channels.spec.ts >> Notification channels — positive >> account channel can be bound on realm
- Location: e2e/notification_channels.spec.ts:59:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('columnheader', { name: 'Name' }).or(getByText(/no channels yet/i))
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('columnheader', { name: 'Name' }).or(getByText(/no channels yet/i))

```

```yaml
- heading "Unexpected Application Error!" [level=2]
- heading "dests.map is not a function" [level=3]
- text: "TypeError: dests.map is not a function at destinations_summary (http://localhost:3010/src/pages/account/notification_settings_page.tsx:70:15) at http://localhost:3010/src/pages/account/notification_settings_page.tsx:1375:25 at Array.map (<anonymous>) at Channels_tab (http://localhost:3010/src/pages/account/notification_settings_page.tsx:1373:25) at Object.react_stack_bottom_frame (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:12866:12) at renderWithHooks (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:4213:19) at updateFunctionComponent (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:5569:16) at beginWork (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:6140:20) at runWithFiberInDEV (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:851:66) at performUnitOfWork (http://localhost:3010/node_modules/.vite/deps/react-dom_client.js?v=a51e6d2f:8429:92)"
- paragraph: 💿 Hey developer 👋
- paragraph:
  - text: You can provide a way better UX than this when your app throws errors by providing your own
  - code: ErrorBoundary
  - text: or
  - code: errorElement
  - text: prop on your route.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   | 	api_login,
  4   | 	api_create_realm,
  5   | 	expect_login_redirect,
  6   | 	realm_url,
  7   | 	TEST_ADMIN,
  8   | 	TEST_USER,
  9   | } from './helpers';
  10  | 
  11  | async function create_realm_channel(
  12  | 	page: import('@playwright/test').Page,
  13  | 	org_slug: string,
  14  | 	realm_slug: string,
  15  | 	name: string,
  16  | ): Promise<void> {
  17  | 	await page.goto(realm_url(org_slug, realm_slug, 'channels'));
  18  | 	await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
  19  | 		timeout: 10_000,
  20  | 	});
  21  | 	// Wait for list settle — early Channel clicks are lost when realm outlet remounts.
  22  | 	await expect(page.getByText('Loading…')).toHaveCount(0, { timeout: 10_000 });
  23  | 	await expect(
  24  | 		page.getByRole('columnheader', { name: 'Name' })
  25  | 			.or(page.getByText(/no channels yet/i)),
> 26  | 	).toBeVisible({ timeout: 10_000 });
      |    ^ Error: expect(locator).toBeVisible() failed
  27  | 
  28  | 	const open_create_form = async () => {
  29  | 		await page.getByRole('button', { name: /^channel$/i }).click();
  30  | 		await expect(page.getByLabel('Channel name')).toBeVisible({ timeout: 5_000 });
  31  | 	};
  32  | 	try {
  33  | 		await open_create_form();
  34  | 	} catch {
  35  | 		await open_create_form();
  36  | 	}
  37  | 
  38  | 	await page.getByLabel('Channel name').fill(name);
  39  | 	await page.getByLabel('Destination').selectOption('slack');
  40  | 	await page.getByLabel('Webhook URL').fill('https://hooks.slack.com/services/T/B/X');
  41  | 	const create_btn = page.getByRole('button', { name: /^create$/i });
  42  | 	await expect(create_btn).toBeEnabled({ timeout: 10_000 });
  43  | 	await create_btn.click({ force: true });
  44  | 	await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  45  | }
  46  | 
  47  | test.describe('Notification channels — positive', () => {
  48  | 	test('realm bindings tab loads', async ({ page }) => {
  49  | 		await api_login(page, TEST_USER.username, TEST_USER.password);
  50  | 		const realm = await api_create_realm(page, 'e2e-ch', 'Notify');
  51  | 		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
  52  | 		await expect(
  53  | 			page.getByText(/create a channel first/i)
  54  | 				.or(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 }))
  55  | 				.first(),
  56  | 		).toBeVisible({ timeout: 10_000 });
  57  | 	});
  58  | 
  59  | 	test('account channel can be bound on realm', async ({ page }) => {
  60  | 		test.setTimeout(60_000);
  61  | 		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  62  | 		const realm = await api_create_realm(page, 'e2e-slack', 'Notify');
  63  | 		const name = `e2e-slack-${Date.now()}`;
  64  | 		await create_realm_channel(page, realm.org_slug, realm.slug, name);
  65  | 
  66  | 		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
  67  | 		await expect(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 })).toBeVisible({
  68  | 			timeout: 10_000,
  69  | 		});
  70  | 		const plus = page.locator('button.border-dashed').first();
  71  | 		await expect(plus).toBeVisible({ timeout: 10_000 });
  72  | 		await plus.click();
  73  | 		const select = page.locator('select').filter({ hasText: /select channel/i });
  74  | 		await expect(select).toBeVisible({ timeout: 5_000 });
  75  | 		await select.selectOption({ label: name });
  76  | 		await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  77  | 	});
  78  | 
  79  | 	test('cancel create returns to list', async ({ page }) => {
  80  | 		await api_login(page, TEST_USER.username, TEST_USER.password);
  81  | 		await page.goto('/settings?tab=channels');
  82  | 		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
  83  | 			timeout: 10_000,
  84  | 		});
  85  | 		await page.getByRole('button', { name: /^channel$/i }).click();
  86  | 		await expect(page.getByLabel('Channel name')).toBeVisible();
  87  | 		await page.getByRole('button', { name: /^cancel$/i }).click();
  88  | 		await expect(page.getByLabel('Channel name')).toHaveCount(0);
  89  | 		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible();
  90  | 	});
  91  | 
  92  | 	test('filter query filters bindings client-side', async ({ page }) => {
  93  | 		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  94  | 		const realm = await api_create_realm(page, 'e2e-filt', 'Notify');
  95  | 		const name = `e2e-filt-ch-${Date.now()}`;
  96  | 		await create_realm_channel(page, realm.org_slug, realm.slug, name);
  97  | 
  98  | 		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
  99  | 		await expect(page.getByPlaceholder('Filter events…')).toBeVisible({ timeout: 10_000 });
  100 | 		await page.getByPlaceholder('Filter events…').fill('no-such-binding-xyz');
  101 | 		await expect(page.getByText(/run\./i)).toHaveCount(0);
  102 | 	});
  103 | 
  104 | 	test('settings notifications tab has no cliqhub provider', async ({ page }) => {
  105 | 		await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  106 | 		await page.goto('/settings?tab=channels');
  107 | 		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
  108 | 			timeout: 10_000,
  109 | 		});
  110 | 		await page.getByRole('button', { name: /^channel$/i }).click();
  111 | 		await expect(page.getByLabel('Destination')).toBeVisible({ timeout: 10_000 });
  112 | 		const options = await page.getByLabel('Destination').locator('option').allTextContents();
  113 | 		expect(options.map((o) => o.toLowerCase())).not.toContain('cliqhub');
  114 | 		expect(options).toEqual(expect.arrayContaining(['Slack', 'Email', 'Webhook']));
  115 | 	});
  116 | });
  117 | 
  118 | test.describe('Notification channels — negative', () => {
  119 | 	test('unauthenticated redirects to login', async ({ page }) => {
  120 | 		await expect_login_redirect(page, '/realms');
  121 | 	});
  122 | 
  123 | 	test('bind without channel shows empty state', async ({ page }) => {
  124 | 		await api_login(page, TEST_USER.username, TEST_USER.password);
  125 | 		const realm = await api_create_realm(page, 'e2e-noch', 'Notify');
  126 | 		await page.goto(realm_url(realm.org_slug, realm.slug, 'notifications'));
```