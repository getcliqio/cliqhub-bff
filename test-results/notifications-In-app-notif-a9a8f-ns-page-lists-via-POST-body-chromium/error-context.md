# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> In-app notifications — positive >> notifications page lists via POST body
- Location: e2e/notifications.spec.ts:50:2

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForRequest: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary "Primary" [ref=e5]:
    - link [ref=e6] [cursor=pointer]:
      - /url: /home
      - img "CliqHub" [ref=e7]
      - text: CliqHub
    - 'button "Switch view (current: All my work)" [ref=e15] [cursor=pointer]':
      - generic [ref=e20]:
        - generic [ref=e21]: Viewing
        - generic [ref=e22]: All my work
    - navigation "Main" [ref=e26]:
      - generic [ref=e27]: Work
      - generic [ref=e28]:
        - link "Overview" [ref=e29] [cursor=pointer]:
          - /url: /home
        - link "Inbox" [ref=e34] [cursor=pointer]:
          - /url: /inbox
      - generic [ref=e39]: Build
      - generic [ref=e40]:
        - link "Teams" [ref=e41] [cursor=pointer]:
          - /url: /teams
        - link "Marketplace" [ref=e47] [cursor=pointer]:
          - /url: /browse
      - generic [ref=e53]: Manage
      - generic [ref=e54]:
        - link "Notifications" [ref=e55] [cursor=pointer]:
          - /url: /notifications
        - link "Agents" [ref=e60] [cursor=pointer]:
          - /url: /agents
        - link "Organization" [ref=e65] [cursor=pointer]:
          - /url: /org
    - generic [ref=e71]:
      - generic [ref=e72]:
        - text: Realms
        - generic [ref=e73]: "4"
      - link "No daemons e2e-notif-muqwc55t" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-notif-muqwc55t
      - link "No daemons e2e-noch-muqwbwhw" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-noch-muqwbwhw
      - link "No daemons e2e-ch-muqwaqs7" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-ch-muqwaqs7
      - link "No daemons default" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
        - generic [ref=e89]: default
    - generic [ref=e90]:
      - link "Getting started 1 of 4 done" [ref=e91] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=e97]: 1 / 4
      - link "Docs" [ref=e98] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e101]: ↗
      - button "TE testuser @testuser" [ref=e103] [cursor=pointer]:
        - generic [ref=e104]: TE
        - generic [ref=e105]:
          - generic [ref=e106]: testuser
          - generic [ref=e107]: "@testuser"
  - generic [ref=e112]:
    - banner [ref=e113]:
      - navigation "Breadcrumb" [ref=e114]:
        - link "All my work" [ref=e116] [cursor=pointer]:
          - /url: /home
        - generic [ref=e122]: Inbox
      - generic [ref=e123]:
        - button "Notifications" [ref=e125] [cursor=pointer]
        - button "Refresh" [ref=e129] [cursor=pointer]
    - main [ref=e135]:
      - generic [ref=e136]:
        - generic [ref=e137]:
          - heading "Inbox" [level=1] [ref=e138]
          - paragraph [ref=e139]: What’s waiting on you, and everything you’ve been told.
        - generic [ref=e140]:
          - tablist "Inbox" [ref=e141]:
            - tab "Needs me" [selected] [ref=e142] [cursor=pointer]
            - tab "All notifications" [ref=e143] [cursor=pointer]
          - link "Notification settings →" [ref=e144] [cursor=pointer]:
            - /url: /notifications
        - generic [ref=e145]:
          - generic [ref=e146]:
            - button "All 0" [pressed] [ref=e147] [cursor=pointer]:
              - text: All
              - generic [ref=e148]: "0"
            - button "Reviews 0" [ref=e149] [cursor=pointer]:
              - text: Reviews
              - generic [ref=e150]: "0"
            - button "Input 0" [ref=e151] [cursor=pointer]:
              - text: Input
              - generic [ref=e152]: "0"
            - textbox "Search waiting items" [ref=e153]:
              - /placeholder: Search…
          - generic [ref=e155]:
            - paragraph [ref=e159]: Nothing is waiting on you
            - paragraph [ref=e160]: Reviews and input requests show up here.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import {
  3  | 	api_current_org_id,
  4  | 	api_login,
  5  | 	api_post,
  6  | 	expect_api_ok,
  7  | 	expect_login_redirect,
  8  | 	new_tx_id,
  9  | 	unique_slug,
  10 | 	TEST_USER,
  11 | } from './helpers';
  12 | 
  13 | test.describe('In-app notifications — positive', () => {
  14 | 	test('default realm bindings deliver run.failed to Notifications page', async ({ page }) => {
  15 | 		await api_login(page, TEST_USER.username, TEST_USER.password);
  16 | 
  17 | 		const slug = unique_slug('e2e-notif');
  18 | 		const org_id = await api_current_org_id(page);
  19 | 		const created = await expect_api_ok(await api_post(page, '/v1/realms/create', {
  20 | 			org_id,
  21 | 			slug,
  22 | 			name: `Notif ${slug}`,
  23 | 		}));
  24 | 		const realm = (created.realm ?? created.data) as { id?: string } | undefined;
  25 | 		const realm_id = realm?.id;
  26 | 		expect(realm_id, `realm id missing: ${JSON.stringify(created)}`).toBeTruthy();
  27 | 
  28 | 		const message = `e2e-run-failed-${Date.now()}`;
  29 | 		const submitted = await expect_api_ok(await api_post(page, '/v1/events/submit', {
  30 | 			tx_id: new_tx_id(),
  31 | 			type: 'run.failed',
  32 | 			realm_id,
  33 | 			run_id: `run-${slug}`,
  34 | 			daemon_id: `daemon-${slug}`,
  35 | 			message,
  36 | 			severity: 'error',
  37 | 		}));
  38 | 		const event = (submitted.event ?? submitted) as { notifications?: string };
  39 | 		expect(event.notifications).toBe('dispatched');
  40 | 
  41 | 		await page.goto('/events?tab=all');
  42 | 		await expect(page.getByRole('heading', { name: 'HUGs and Events' })).toBeVisible({
  43 | 			timeout: 10_000,
  44 | 		});
  45 | 		const row = page.getByRole('row').filter({ hasText: message });
  46 | 		await expect(row).toBeVisible({ timeout: 10_000 });
  47 | 		await expect(row.getByText('run.failed')).toBeVisible();
  48 | 	});
  49 | 
  50 | 	test('notifications page lists via POST body', async ({ page }) => {
  51 | 		await api_login(page, TEST_USER.username, TEST_USER.password);
> 52 | 		const list_req = page.waitForRequest((req) =>
     |                         ^ Error: page.waitForRequest: Test timeout of 30000ms exceeded.
  53 | 			req.url().includes('/v1/notifications/get')
  54 | 			&& req.method() === 'POST',
  55 | 		);
  56 | 		await page.goto('/events?tab=all');
  57 | 		await list_req;
  58 | 		await expect(page.getByRole('heading', { name: 'HUGs and Events' })).toBeVisible({
  59 | 			timeout: 10_000,
  60 | 		});
  61 | 	});
  62 | });
  63 | 
  64 | test.describe('In-app notifications — negative', () => {
  65 | 	test('unauthenticated redirects to login', async ({ page }) => {
  66 | 		await expect_login_redirect(page, '/notifications');
  67 | 	});
  68 | });
  69 | 
```