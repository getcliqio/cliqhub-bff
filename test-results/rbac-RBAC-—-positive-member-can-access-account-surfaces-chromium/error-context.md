# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC — positive >> member can access account surfaces
- Location: e2e/rbac.spec.ts:22:5

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
- generic [ref=f5e4]:
  - complementary "Primary" [ref=f5e5]:
    - link [ref=f5e6] [cursor=pointer]:
      - /url: /home
      - img "CliqHub" [ref=f5e7]
      - text: CliqHub
    - 'button "Switch view (current: All my work)" [ref=f5e15] [cursor=pointer]':
      - generic [ref=f5e20]:
        - generic [ref=f5e21]: Viewing
        - generic [ref=f5e22]: All my work
    - navigation "Main" [ref=f5e26]:
      - generic [ref=f5e27]: Work
      - generic [ref=f5e28]:
        - link "Overview" [ref=f5e29] [cursor=pointer]:
          - /url: /home
        - link "Inbox" [ref=f5e34] [cursor=pointer]:
          - /url: /inbox
      - generic [ref=f5e39]: Build
      - generic [ref=f5e40]:
        - link "Teams" [ref=f5e41] [cursor=pointer]:
          - /url: /teams
        - link "Marketplace" [ref=f5e47] [cursor=pointer]:
          - /url: /browse
      - generic [ref=f5e53]: Manage
      - generic [ref=f5e54]:
        - link "Notifications" [ref=f5e55] [cursor=pointer]:
          - /url: /notifications
        - link "Agents" [ref=f5e60] [cursor=pointer]:
          - /url: /agents
        - link "Organization" [ref=f5e65] [cursor=pointer]:
          - /url: /org
    - generic [ref=f5e71]:
      - generic [ref=f5e72]:
        - text: Realms
        - generic [ref=f5e73]: "4"
      - link "No daemons e2e-notif-muqwc55t" [ref=f5e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=f5e75]
        - generic [ref=f5e76]: TE
        - generic [ref=f5e77]: e2e-notif-muqwc55t
      - link "No daemons e2e-noch-muqwbwhw" [ref=f5e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
        - img "No daemons" [ref=f5e79]
        - generic [ref=f5e80]: TE
        - generic [ref=f5e81]: e2e-noch-muqwbwhw
      - link "No daemons e2e-ch-muqwaqs7" [ref=f5e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
        - img "No daemons" [ref=f5e83]
        - generic [ref=f5e84]: TE
        - generic [ref=f5e85]: e2e-ch-muqwaqs7
      - link "No daemons default" [ref=f5e86] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=f5e87]
        - generic [ref=f5e88]: TE
        - generic [ref=f5e89]: default
    - generic [ref=f5e90]:
      - link "Getting started 1 of 4 done" [ref=f5e91] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=f5e97]: 1 / 4
      - link "Docs" [ref=f5e98] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=f5e101]: ↗
      - button "TE testuser @testuser" [ref=f5e103] [cursor=pointer]:
        - generic [ref=f5e104]: TE
        - generic [ref=f5e105]:
          - generic [ref=f5e106]: testuser
          - generic [ref=f5e107]: "@testuser"
  - generic [ref=f5e112]:
    - banner [ref=f5e113]:
      - navigation "Breadcrumb" [ref=f5e114]:
        - link "All my work" [ref=f5e116] [cursor=pointer]:
          - /url: /home
        - generic [ref=f5e122]: Realms
      - button "Notifications" [ref=f5e125] [cursor=pointer]
    - main [ref=f5e129]:
      - generic [ref=f5e130]:
        - generic [ref=f5e131]:
          - generic [ref=f5e132]:
            - heading "Realms" [level=1] [ref=f5e133]
            - paragraph [ref=f5e134]: Groups of machines that run your teams. 4 realms across 1 organization.
          - button "New realm" [ref=f5e135] [cursor=pointer]
        - textbox "Search realms" [ref=f5e142]
        - region "testuser" [ref=f5e143]:
          - generic [ref=f5e144]:
            - heading "testuser" [level=2] [ref=f5e145]
            - generic [ref=f5e146]: admin
            - link "Manage org →" [ref=f5e147] [cursor=pointer]:
              - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
          - generic [ref=f5e148]:
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 2m ago" [ref=f5e149] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=f5e150]:
                - generic [ref=f5e151]: Notif e2e-notif-muqwc55t
                - generic [ref=f5e152]: e2e-notif-muqwc55t
              - generic [ref=f5e153]: no daemons
              - generic [ref=f5e154]: Active 2m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 2m ago" [ref=f5e156] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=f5e157]:
                - generic [ref=f5e158]: Notify e2e-noch-muqwbwhw
                - generic [ref=f5e159]: e2e-noch-muqwbwhw
              - generic [ref=f5e160]: no daemons
              - generic [ref=f5e161]: Active 2m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 3m ago" [ref=f5e163] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=f5e164]:
                - generic [ref=f5e165]: Notify e2e-ch-muqwaqs7
                - generic [ref=f5e166]: e2e-ch-muqwaqs7
              - generic [ref=f5e167]: no daemons
              - generic [ref=f5e168]: Active 3m ago
            - link "default default no daemons Active 13m ago" [ref=f5e170] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=f5e171]:
                - generic [ref=f5e172]: default
                - generic [ref=f5e173]: default
              - generic [ref=f5e174]: no daemons
              - generic [ref=f5e175]: Active 13m ago
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import {
  3  |     api_login,
  4  |     api_post,
  5  |     expect_admin_blocked,
  6  |     expect_api_denied,
  7  |     expect_login_redirect,
  8  |     TEST_ADMIN,
  9  |     TEST_USER,
  10 | } from './helpers';
  11 | 
  12 | test.describe('RBAC — positive', () => {
  13 |     test('admin can open every admin section', async ({ page }) => {
  14 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  15 |         for (const path of ['/admin', '/admin/accounts', '/admin/orgs', '/admin/scopes', '/admin/teams', '/admin/audit']) {
  16 |             await page.goto(path);
  17 |             await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
  18 |             await expect(page.getByText(/site admin/i).first()).toBeVisible({ timeout: 10_000 });
  19 |         }
  20 |     });
  21 | 
  22 |     test('member can access account surfaces', async ({ page }) => {
  23 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  24 |         for (const path of ['/settings', '/tokens', '/teams', '/scopes', '/realms']) {
  25 |             await page.goto(path);
  26 |             await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
  27 |             await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  28 |         }
  29 |         await page.goto('/daemons');
> 30 |         await page.waitForURL(/\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
     |                    ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  31 |         await expect(page.getByRole('heading', { name: 'Daemons' })).toBeVisible({ timeout: 10_000 });
  32 |         await page.goto('/organizations');
  33 |         await page.waitForURL(/\/realms/, { timeout: 10_000 });
  34 |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
  35 |     });
  36 | });
  37 | 
  38 | test.describe('RBAC — negative', () => {
  39 |     test('protected routes redirect when logged out', async ({ page }) => {
  40 |         await expect_login_redirect(page, '/settings');
  41 |         await expect_login_redirect(page, '/scopes');
  42 |         await expect_login_redirect(page, '/realms');
  43 |         await expect_login_redirect(page, '/admin/accounts');
  44 |     });
  45 | 
  46 |     test('member cannot enter admin UI', async ({ page }) => {
  47 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  48 |         await expect_admin_blocked(page, '/admin/users');
  49 |         await expect_admin_blocked(page, '/admin/scopes');
  50 |         await expect_admin_blocked(page, '/admin/audit');
  51 |     });
  52 | 
  53 |     test('member cannot mint privileged hub ops via BFF', async ({ page }) => {
  54 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  55 |         await expect_api_denied(await api_post(page, '/v1/users/suspend', { user_id: 1 }));
  56 |         await expect_api_denied(await api_post(page, '/v1/scopes/delete', { scope_id: 1 }));
  57 |         await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
  58 |     });
  59 | 
  60 |     test('admin session required for users list API', async ({ page }) => {
  61 |         await expect_api_denied(await api_post(page, '/v1/users/get', {}));
  62 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  63 |         await expect_api_denied(await api_post(page, '/v1/users/get', {}));
  64 |     });
  65 | });
  66 | 
```