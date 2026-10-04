# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs_logs.spec.ts >> Runs / logs — positive >> legacy /runs redirects into a realm
- Location: e2e/runs_logs.spec.ts:41:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3010/realms"
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
        - generic [ref=e147]: Realms
      - button "Notifications" [ref=e150] [cursor=pointer]
    - main [ref=e154]:
      - generic [ref=e155]:
        - generic [ref=e156]:
          - generic [ref=e157]:
            - heading "Realms" [level=1] [ref=e158]
            - paragraph [ref=e159]: Groups of machines that run your teams. 13 realms across 1 organization.
          - button "New realm" [ref=e160] [cursor=pointer]
        - textbox "Search realms" [ref=e167]
        - region "testuser" [ref=e168]:
          - generic [ref=e169]:
            - heading "testuser" [level=2] [ref=e170]
            - generic [ref=e171]: admin
            - link "Manage org →" [ref=e172] [cursor=pointer]:
              - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
          - generic [ref=e173]:
            - link "RunLife e2e-run-muqwk9zx e2e-run-muqwk9zx 1/1 online Active just now" [ref=e174] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-run-muqwk9zx/inbox
              - generic [ref=e175]:
                - generic [ref=e176]: RunLife e2e-run-muqwk9zx
                - generic [ref=e177]: e2e-run-muqwk9zx
              - generic "1 online · 0 stale · 0 offline" [ref=e178]:
                - generic [ref=e181]: 1/1
                - text: online
              - generic [ref=e182]: Active just now
            - link "Mint e2e-mintval-muqwjw7r e2e-mintval-muqwjw7r no daemons Active just now" [ref=e184] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
              - generic [ref=e185]:
                - generic [ref=e186]: Mint e2e-mintval-muqwjw7r
                - generic [ref=e187]: e2e-mintval-muqwjw7r
              - generic [ref=e188]: no daemons
              - generic [ref=e189]: Active just now
            - link "Cancel e2e-dcancel-muqwjk0c e2e-dcancel-muqwjk0c no daemons Active just now" [ref=e191] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-dcancel-muqwjk0c/inbox
              - generic [ref=e192]:
                - generic [ref=e193]: Cancel e2e-dcancel-muqwjk0c
                - generic [ref=e194]: e2e-dcancel-muqwjk0c
              - generic [ref=e195]: no daemons
              - generic [ref=e196]: Active just now
            - link "Detail e2e-add-muqwhk2e e2e-add-muqwhk2e no daemons Active 2m ago" [ref=e198] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
              - generic [ref=e199]:
                - generic [ref=e200]: Detail e2e-add-muqwhk2e
                - generic [ref=e201]: e2e-add-muqwhk2e
              - generic [ref=e202]: no daemons
              - generic [ref=e203]: Active 2m ago
            - link "Detail e2e-usr-muqwhbpt e2e-usr-muqwhbpt no daemons Active 2m ago" [ref=e205] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
              - generic [ref=e206]:
                - generic [ref=e207]: Detail e2e-usr-muqwhbpt
                - generic [ref=e208]: e2e-usr-muqwhbpt
              - generic [ref=e209]: no daemons
              - generic [ref=e210]: Active 2m ago
            - link "Detail e2e-tok-muqwh3c3 e2e-tok-muqwh3c3 no daemons Active 3m ago" [ref=e212] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
              - generic [ref=e213]:
                - generic [ref=e214]: Detail e2e-tok-muqwh3c3
                - generic [ref=e215]: e2e-tok-muqwh3c3
              - generic [ref=e216]: no daemons
              - generic [ref=e217]: Active 3m ago
            - link "Detail e2e-tabs-muqwgtdg e2e-tabs-muqwgtdg no daemons Active 3m ago" [ref=e219] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
              - generic [ref=e220]:
                - generic [ref=e221]: Detail e2e-tabs-muqwgtdg
                - generic [ref=e222]: e2e-tabs-muqwgtdg
              - generic [ref=e223]: no daemons
              - generic [ref=e224]: Active 3m ago
            - link "Detail e2e-det-muqwg52d e2e-det-muqwg52d no daemons Active 3m ago" [ref=e226] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
              - generic [ref=e227]:
                - generic [ref=e228]: Detail e2e-det-muqwg52d
                - generic [ref=e229]: e2e-det-muqwg52d
              - generic [ref=e230]: no daemons
              - generic [ref=e231]: Active 3m ago
            - link "Filter Target e2e-filt-muqwfwkb e2e-filt-muqwfwkb no daemons Active 3m ago" [ref=e233] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
              - generic [ref=e234]:
                - generic [ref=e235]: Filter Target e2e-filt-muqwfwkb
                - generic [ref=e236]: e2e-filt-muqwfwkb
              - generic [ref=e237]: no daemons
              - generic [ref=e238]: Active 3m ago
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 6m ago" [ref=e240] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=e241]:
                - generic [ref=e242]: Notif e2e-notif-muqwc55t
                - generic [ref=e243]: e2e-notif-muqwc55t
              - generic [ref=e244]: no daemons
              - generic [ref=e245]: Active 6m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 7m ago" [ref=e247] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=e248]:
                - generic [ref=e249]: Notify e2e-noch-muqwbwhw
                - generic [ref=e250]: e2e-noch-muqwbwhw
              - generic [ref=e251]: no daemons
              - generic [ref=e252]: Active 7m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 7m ago" [ref=e254] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=e255]:
                - generic [ref=e256]: Notify e2e-ch-muqwaqs7
                - generic [ref=e257]: e2e-ch-muqwaqs7
              - generic [ref=e258]: no daemons
              - generic [ref=e259]: Active 7m ago
            - link "default default no daemons Active 18m ago" [ref=e261] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=e262]:
                - generic [ref=e263]: default
                - generic [ref=e264]: default
              - generic [ref=e265]: no daemons
              - generic [ref=e266]: Active 18m ago
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
> 43  |         await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/runs/, { timeout: 10_000 });
      |                    ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
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
  68  |         await page.waitForURL(/\/events/, { timeout: 10_000 });
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
```