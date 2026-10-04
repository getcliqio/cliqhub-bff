# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs_logs.spec.ts >> Runs / logs — positive >> notifications and reviews shells load
- Location: e2e/runs_logs.spec.ts:66:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
        - generic [ref=e73]: "13"
      - link "1 of 1 daemons online e2e-run-muqwk9zx" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-run-muqwk9zx/inbox
        - img "1 of 1 daemons online" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-run-muqwk9zx
      - link "No daemons e2e-mintval-muqwjw7r" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-mintval-muqwjw7r
      - link "No daemons e2e-dcancel-muqwjk0c" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-dcancel-muqwjk0c/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-dcancel-muqwjk0c
      - link "No daemons e2e-add-muqwhk2e" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
        - generic [ref=e89]: e2e-add-muqwhk2e
      - link "No daemons e2e-usr-muqwhbpt" [ref=e90] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
        - img "No daemons" [ref=e91]
        - generic [ref=e92]: TE
        - generic [ref=e93]: e2e-usr-muqwhbpt
      - link "No daemons e2e-tok-muqwh3c3" [ref=e94] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
        - img "No daemons" [ref=e95]
        - generic [ref=e96]: TE
        - generic [ref=e97]: e2e-tok-muqwh3c3
      - link "No daemons e2e-tabs-muqwgtdg" [ref=e98] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
        - img "No daemons" [ref=e99]
        - generic [ref=e100]: TE
        - generic [ref=e101]: e2e-tabs-muqwgtdg
      - link "No daemons e2e-det-muqwg52d" [ref=e102] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
        - img "No daemons" [ref=e103]
        - generic [ref=e104]: TE
        - generic [ref=e105]: e2e-det-muqwg52d
      - link "No daemons e2e-filt-muqwfwkb" [ref=e106] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
        - img "No daemons" [ref=e107]
        - generic [ref=e108]: TE
        - generic [ref=e109]: e2e-filt-muqwfwkb
      - link "No daemons e2e-notif-muqwc55t" [ref=e110] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e111]
        - generic [ref=e112]: TE
        - generic [ref=e113]: e2e-notif-muqwc55t
      - link "All 13 realms →" [ref=e114] [cursor=pointer]:
        - /url: /realms
    - generic [ref=e115]:
      - link "Getting started 3 of 4 done" [ref=e116] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "3 of 4 done" [ref=e122]: 3 / 4
      - link "Docs" [ref=e123] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e126]: ↗
      - button "TE testuser @testuser" [ref=e128] [cursor=pointer]:
        - generic [ref=e129]: TE
        - generic [ref=e130]:
          - generic [ref=e131]: testuser
          - generic [ref=e132]: "@testuser"
  - generic [ref=e137]:
    - banner [ref=e138]:
      - navigation "Breadcrumb" [ref=e139]:
        - link "All my work" [ref=e141] [cursor=pointer]:
          - /url: /home
        - generic [ref=e147]: Notifications
      - generic [ref=e148]:
        - button "Notifications" [ref=e150] [cursor=pointer]
        - button "Refresh" [ref=e154] [cursor=pointer]
    - main [ref=e160]:
      - generic [ref=e162]:
        - generic [ref=e163]:
          - heading "Notifications" [level=1] [ref=e164]
          - paragraph [ref=e165]: Who gets told what — every org, realm and team you can see, in one place. Each rule says when, where it applies and where it goes.
        - tablist "Notifications" [ref=e166]:
          - tab "Rules" [selected] [ref=e167] [cursor=pointer]
          - tab "Channels" [ref=e168] [cursor=pointer]
          - tab "Check a realm" [ref=e169] [cursor=pointer]
          - tab "Custom events" [ref=e170] [cursor=pointer]
        - generic [ref=e171]:
          - generic [ref=e172]:
            - generic [ref=e173]: Org-wide rules, plus realm and team rules for
            - textbox "Search realms" [ref=e174]:
              - /placeholder: Search realms…
            - generic [ref=e175]: Realms 1–10 of 13
            - button "Previous realms" [disabled] [ref=e176] [cursor=pointer]: ‹
            - button "Next realms" [ref=e177] [cursor=pointer]: ›
          - generic "Realms on this page" [ref=e178]:
            - generic "Only org-wide rules apply" [ref=e179]: default
            - generic "Only org-wide rules apply" [ref=e181]: e2e-add-muqwhk2e
            - generic "Only org-wide rules apply" [ref=e183]: e2e-ch-muqwaqs7
            - generic "Only org-wide rules apply" [ref=e185]: e2e-dcancel-muqwjk0c
            - generic "Only org-wide rules apply" [ref=e187]: e2e-det-muqwg52d
            - generic "Only org-wide rules apply" [ref=e189]: e2e-filt-muqwfwkb
            - generic "Only org-wide rules apply" [ref=e191]: e2e-mintval-muqwjw7r
            - generic "Only org-wide rules apply" [ref=e193]: e2e-noch-muqwbwhw
            - generic "Only org-wide rules apply" [ref=e195]: e2e-notif-muqwc55t
            - generic "Only org-wide rules apply" [ref=e197]: e2e-run-muqwk9zx
        - generic [ref=e199]:
          - generic [ref=e200]:
            - textbox "Search rules" [ref=e201]:
              - /placeholder: Search event or channel…
            - group "Applies to" [ref=e202]:
              - button "All levels" [pressed] [ref=e203] [cursor=pointer]
              - button "Org-wide" [ref=e204] [cursor=pointer]
              - button "Realm" [ref=e205] [cursor=pointer]
              - button "Team in realm" [ref=e206] [cursor=pointer]
            - button "Only ones I can edit" [ref=e207] [cursor=pointer]
            - generic [ref=e208]: "Most specific wins: team › realm › org"
            - button "New rule" [ref=e209] [cursor=pointer]
          - generic [ref=e212]:
            - paragraph [ref=e216]: No rules here yet
            - paragraph [ref=e217]: Rules say when to notify, where it applies and where to send it.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     api_first_realm,
  5   |     api_post,
  6   |     expect_login_redirect,
  7   |     realm_url,
  8   |     TEST_USER,
  9   | } from './helpers';
  10  | 
  11  | test.describe('Runs / logs — positive', () => {
  12  |     test.beforeEach(async ({ page }) => {
  13  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  14  |     });
  15  | 
  16  |     test('runs page loads under realm with filter', async ({ page }) => {
  17  |         const realm = await api_first_realm(page);
  18  |         await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
  19  |         await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
  20  |         await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  21  |         await expect(page.getByRole('navigation', { name: 'Realm sections' }).getByRole('link', { name: 'Runs' })).toBeVisible();
  22  |     });
  23  | 
  24  |     test('runs filter query is sent in list POST body', async ({ page }) => {
  25  |         const realm = await api_first_realm(page);
  26  |         await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
  27  |         await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
  28  | 
  29  |         const filter_req = page.waitForRequest((req) =>
  30  |             req.url().includes('/v1/runs/get')
  31  |             && req.method() === 'POST'
  32  |             && (req.postDataJSON() as { query?: string })?.query === 'no-such-run-xyz',
  33  |         );
  34  |         const search = page.getByLabel('Search runs');
  35  |         await search.click();
  36  |         await search.fill('no-such-run-xyz');
  37  |         await search.press('Enter');
  38  |         await filter_req;
  39  |     });
  40  | 
  41  |     test('legacy /runs redirects into a realm', async ({ page }) => {
  42  |         await page.goto('/runs');
  43  |         await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/runs/, { timeout: 10_000 });
  44  |         await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
  45  |     });
  46  | 
  47  |     test('logs page loads with explorer shell', async ({ page }) => {
  48  |         const realm = await api_first_realm(page);
  49  |         // /logs redirects into runs under the org-scoped realm URL.
  50  |         await page.goto(realm_url(realm.org_slug, realm.slug, 'logs'));
  51  |         await page.waitForURL(/\/runs/, { timeout: 10_000 });
  52  |         await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
  53  |     });
  54  | 
  55  |     test('logs load via POST on page load', async ({ page }) => {
  56  |         const realm = await api_first_realm(page);
  57  |         const runs_req = page.waitForRequest((req) =>
  58  |             req.url().includes('/v1/runs/get')
  59  |             && req.method() === 'POST',
  60  |         );
  61  |         await page.goto(realm_url(realm.org_slug, realm.slug, 'logs'));
  62  |         await page.waitForURL(/\/runs/, { timeout: 10_000 });
  63  |         await runs_req;
  64  |     });
  65  | 
  66  |     test('notifications and reviews shells load', async ({ page }) => {
  67  |         await page.goto('/notifications?tab=inbox');
> 68  |         await page.waitForURL(/\/events/, { timeout: 10_000 });
      |                    ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  69  |         await expect(page.getByRole('heading', { name: 'HUGs and Events' })).toBeVisible({ timeout: 10_000 });
  70  |         await expect(page.getByRole('button', { name: 'HUGs', exact: true })).toBeVisible();
  71  |         await page.getByRole('button', { name: 'HUGs', exact: true }).click();
  72  |         await expect(page).toHaveURL(/tab=hug|\/events/);
  73  |         await page.goto('/hug');
  74  |         await page.waitForURL(/\/events/, { timeout: 10_000 });
  75  |     });
  76  | 
  77  |     test('home shows getting started or dashboard', async ({ page }) => {
  78  |         await page.goto('/home');
  79  |         await expect(
  80  |             page.getByRole('heading', { name: /good (morning|afternoon|evening)|burning the midnight oil/i }),
  81  |         ).toBeVisible({ timeout: 10_000 });
  82  |         await page.goto('/getting-started');
  83  |         await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({
  84  |             timeout: 10_000,
  85  |         });
  86  |     });
  87  | 
  88  |     test('legacy /bundles redirects to teams', async ({ page }) => {
  89  |         await page.goto('/bundles');
  90  |         await page.waitForURL(/\/teams/, { timeout: 10_000 });
  91  |         await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible({ timeout: 10_000 });
  92  |     });
  93  | });
  94  | 
  95  | test.describe('Runs — negative', () => {
  96  |     test('unauthenticated runs redirects to login', async ({ page }) => {
  97  |         await expect_login_redirect(page, '/runs');
  98  |     });
  99  | });
  100 | 
  101 | test.describe('Runs — control routes (Slice 1 hard cut)', () => {
  102 |     test.beforeEach(async ({ page }) => {
  103 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  104 |     });
  105 | 
  106 |     test('cancel / resume / supply_inputs / enqueue are registered', async ({ page }) => {
  107 |         const fake_run = '00000000-0000-4000-8000-000000000099';
  108 |         const cases: Array<{ path: string; body: Record<string, unknown> }> = [
  109 |             { path: '/v1/runs/cancel', body: { run_id: fake_run } },
  110 |             { path: '/v1/runs/resume', body: { run_id: fake_run, from_phase: 'phase_a' } },
  111 |             { path: '/v1/runs/supply_inputs', body: { run_id: fake_run, inputs: { x: '1' } } },
  112 |             { path: '/v1/runs/enqueue', body: { realm_id: 'r-missing', team_id: 'scope/slug' } },
  113 |         ];
  114 |         for (const c of cases) {
  115 |             const res = await api_post(page, c.path, c.body);
  116 |             const body = await res.json().catch(() => ({}));
  117 |             const msg = JSON.stringify(body);
  118 |             expect(msg, `${c.path} must not be BFF unknown route`).not.toMatch(/Unknown API route/i);
  119 |             expect(res.status(), c.path).toBeGreaterThanOrEqual(400);
  120 |             expect(res.status(), c.path).toBeLessThan(500);
  121 |         }
  122 |     });
  123 | 
  124 |     test('force_terminate is hard-cut (folded into cancel)', async ({ page }) => {
  125 |         const res = await api_post(page, '/v1/runs/force_terminate', {
  126 |             run_id: '00000000-0000-4000-8000-000000000099',
  127 |         });
  128 |         const body = await res.json().catch(() => ({}));
  129 |         expect(res.status()).toBe(404);
  130 |         expect(JSON.stringify(body)).toMatch(/Unknown API route/i);
  131 |     });
  132 | 
  133 |     test('legacy dispatch schedule/claim paths are gone', async ({ page }) => {
  134 |         for (const path of [
  135 |             '/v1/dispatch/cancel',
  136 |             '/v1/dispatch/run',
  137 |             '/v1/dispatch/enqueue',
  138 |             '/v1/dispatch/claim',
  139 |             '/v1/dispatch/queue/get_by_id',
  140 |         ]) {
  141 |             const res = await api_post(page, path, { run_id: 'x', queue_item_id: 'x', daemon_id: 'd' });
  142 |             const body = await res.json().catch(() => ({}));
  143 |             expect(res.status(), path).toBe(404);
  144 |             expect(JSON.stringify(body), path).toMatch(/Unknown API route/i);
  145 |         }
  146 |     });
  147 | });
  148 | 
```