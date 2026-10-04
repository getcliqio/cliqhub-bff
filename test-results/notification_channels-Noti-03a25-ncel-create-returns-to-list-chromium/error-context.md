# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notification_channels.spec.ts >> Notification channels — positive >> cancel create returns to list
- Location: e2e/notification_channels.spec.ts:79:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Channels', exact: true, level: 2 })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Channels', exact: true, level: 2 })

```

```yaml
- complementary "Primary":
  - link "CliqHub CliqHub":
    - /url: /home
    - img "CliqHub"
    - text: CliqHub
  - 'button "Switch view (current: All my work)"': Viewing All my work
  - navigation "Main":
    - text: Work
    - link "Overview":
      - /url: /home
    - link "Inbox":
      - /url: /inbox
    - text: Build
    - link "Teams":
      - /url: /teams
    - link "Marketplace":
      - /url: /browse
    - text: Manage
    - link "Notifications":
      - /url: /notifications
    - link "Agents":
      - /url: /agents
    - link "Organization":
      - /url: /org
  - text: Realms 2
  - link "No daemons e2e-ch-muqwaqs7":
    - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
    - img "No daemons"
    - text: e2e-ch-muqwaqs7
  - link "No daemons default":
    - /url: /o/testuser/realms/default/inbox
    - img "No daemons"
    - text: default
  - link "Getting started 1 of 4 done":
    - /url: /getting-started
    - text: Getting started 1 / 4
  - link "Docs":
    - /url: https://docs.getcliq.io
  - button "TE testuser @testuser"
- banner:
  - navigation "Breadcrumb":
    - link "All my work":
      - /url: /home
    - text: Notifications
  - button "Notifications"
  - button "Refresh"
- main:
  - heading "Notifications" [level=1]
  - paragraph: Who gets told what — every org, realm and team you can see, in one place. Each rule says when, where it applies and where it goes.
  - tablist "Notifications":
    - tab "Rules"
    - tab "Channels" [selected]
    - tab "Check a realm"
    - tab "Custom events"
  - text: Org-wide rules, plus realm and team rules for
  - textbox "Search realms":
    - /placeholder: Search realms…
  - text: Realms 1–2 of 2
  - button "Previous realms" [disabled]: ‹
  - button "Next realms" [disabled]: ›
  - text: default e2e-ch-muqwaqs7
  - paragraph: Named places messages go. One channel can fan out to several destinations.
  - button "New channel"
  - table:
    - rowgroup:
      - row "Channel Owned by Destinations Used by":
        - columnheader "Channel"
        - columnheader "Owned by"
        - columnheader "Destinations"
        - columnheader "Used by"
    - rowgroup:
      - row "cliqhub realm default In-app (CliqHub) 0 rules":
        - cell "cliqhub":
          - button "cliqhub"
        - cell "realm default"
        - cell "In-app (CliqHub)": ◉
        - cell "0 rules"
      - row "cliqhub realm e2e-ch-muqwaqs7 In-app (CliqHub) 0 rules":
        - cell "cliqhub":
          - button "cliqhub"
        - cell "realm e2e-ch-muqwaqs7"
        - cell "In-app (CliqHub)": ◉
        - cell "0 rules"
      - row "testuser only you In-app (CliqHub) 0 rules":
        - cell "testuser":
          - button "testuser"
        - cell "only you"
        - cell "In-app (CliqHub)": ◉
        - cell "0 rules"
  - complementary "Channel details":
    - paragraph: Select a channel to see its destinations, which rules use it, and to send a test.
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
  26  | 	).toBeVisible({ timeout: 10_000 });
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
> 82  | 		await expect(page.getByRole('heading', { name: 'Channels', exact: true, level: 2 })).toBeVisible({
      |                                                                                        ^ Error: expect(locator).toBeVisible() failed
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
  127 | 		// Fresh realms may inherit account default channels — either empty
  128 | 		// guidance or the rules shell is acceptable.
  129 | 		await expect(
  130 | 			page.getByText(/create a channel first/i)
  131 | 				.or(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 }))
  132 | 				.first(),
  133 | 		).toBeVisible({ timeout: 10_000 });
  134 | 	});
  135 | });
  136 | 
```