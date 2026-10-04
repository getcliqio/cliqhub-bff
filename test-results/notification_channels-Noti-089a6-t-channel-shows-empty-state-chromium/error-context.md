# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notification_channels.spec.ts >> Notification channels — negative >> bind without channel shows empty state
- Location: e2e/notification_channels.spec.ts:123:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/create a channel first/i).or(getByRole('heading', { name: 'Notifications', exact: true, level: 2 })).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/create a channel first/i).or(getByRole('heading', { name: 'Notifications', exact: true, level: 2 })).first()

```

```yaml
- complementary "Primary":
  - link "CliqHub CliqHub":
    - /url: /home
    - img "CliqHub"
    - text: CliqHub
  - 'button "Switch view (current: testuser)"': Viewing org · admin testuser
  - link "Back to all my work":
    - /url: /home
  - navigation "Main":
    - text: Work
    - link "Overview":
      - /url: /home?org=testuser
    - link "Inbox":
      - /url: /inbox?org=testuser
    - text: Build
    - link "Teams":
      - /url: /teams?org=testuser
    - link "Marketplace":
      - /url: /browse
    - text: Manage
    - link "Notifications":
      - /url: /notifications?org=testuser
    - link "Agents":
      - /url: /agents?org=testuser
    - link "Organization":
      - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
  - text: Realms 3
  - link "No daemons e2e-noch-muqwbwhw":
    - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
    - img "No daemons"
    - text: e2e-noch-muqwbwhw
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
    - link "testuser":
      - /url: /home?org=testuser
    - text: Notifications
  - button "Notifications"
  - button "Refresh"
- main:
  - heading "Notifications" [level=1]
  - paragraph: Who gets told what — every org, realm and team you can see, in one place. Each rule says when, where it applies and where it goes.
  - tablist "Notifications":
    - tab "Rules" [selected]
    - tab "Channels"
    - tab "Check a realm"
    - tab "Custom events"
  - text: Org-wide rules, plus realm and team rules for
  - textbox "Search realms":
    - /placeholder: Search realms…
  - text: Realms 1–3 of 3
  - button "Previous realms" [disabled]: ‹
  - button "Next realms" [disabled]: ›
  - text: default e2e-ch-muqwaqs7 e2e-noch-muqwbwhw
  - textbox "Search rules":
    - /placeholder: Search event or channel…
  - group "Applies to":
    - button "All levels" [pressed]
    - button "Org-wide"
    - button "Realm"
    - button "Team in realm"
  - button "Only ones I can edit"
  - text: "Most specific wins: team › realm › org"
  - button "New rule"
  - paragraph: No rules here yet
  - paragraph: Rules say when to notify, where it applies and where to send it.
```

# Test source

```ts
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
  127 | 		// Fresh realms may inherit account default channels — either empty
  128 | 		// guidance or the rules shell is acceptable.
  129 | 		await expect(
  130 | 			page.getByText(/create a channel first/i)
  131 | 				.or(page.getByRole('heading', { name: 'Notifications', exact: true, level: 2 }))
  132 | 				.first(),
> 133 | 		).toBeVisible({ timeout: 10_000 });
      |     ^ Error: expect(locator).toBeVisible() failed
  134 | 	});
  135 | });
  136 | 
```