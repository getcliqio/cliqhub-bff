# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home_nav.spec.ts >> Home & navigation — positive >> admin sees admin nav
- Location: e2e/home_nav.spec.ts:48:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/admin\/accounts/
Received string:  "http://localhost:3010/admin"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    - locator resolved to <html lang="en" data-theme="light">…</html>
    23 × unexpected value "http://localhost:3010/admin"
       - locator resolved to <html lang="en" data-theme="light" data-palette="default">…</html>
    - unexpected value "http://localhost:3010/admin"

```

```yaml
- complementary "Admin":
  - img "CliqHub"
  - text: CliqHub ADMIN
  - link "Leave admin Back to my work":
    - /url: /home
  - navigation:
    - link "Home":
      - /url: /admin
    - text: People
    - link "Accounts":
      - /url: /admin/accounts
    - link "Organizations":
      - /url: /admin/orgs
    - text: Fleet
    - link "Realms":
      - /url: /admin/realms
    - link "Daemons":
      - /url: /admin/daemons
    - link "Workspaces":
      - /url: /admin/workspaces
    - text: Catalog
    - link "Teams":
      - /url: /admin/teams
    - link "Scopes":
      - /url: /admin/scopes
    - text: Activity
    - link "Runs":
      - /url: /admin/runs
    - link "Logs":
      - /url: /admin/logs
    - link "Audit log":
      - /url: /admin/audit
  - paragraph: Signed in as admin · site admin
- banner:
  - navigation "Breadcrumb":
    - link "Admin":
      - /url: /admin
- main:
  - heading "Hub health" [level=1]
  - paragraph: Everything across every org. Changes here affect all customers — they’re audited.
  - text: Core 1.0.0 · API 6 ● BFF ↔ Core compatible up 5m
  - button "Refresh"
  - text: Accounts 4 1 suspended Organizations 3 Realms 3 Daemons online 0 / 0 Runs · 24h 0 Failed · 24h 0
  - region "Needs attention":
    - heading "Needs attention 1" [level=2]
    - list:
      - listitem:
        - text: 1 suspended account They can’t sign in until unsuspended.
        - link "Review":
          - /url: /admin/accounts?filter=suspended
  - region "Recent admin activity":
    - heading "Recent admin activity audit log" [level=2]
    - list:
      - listitem: "admin user.create 0: { · 1: \" · 2: u 39s"
    - link "Full audit log →":
      - /url: /admin/audit
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { api_login, TEST_ADMIN, TEST_USER } from './helpers';
  3  | 
  4  | test.describe('Home & navigation — positive', () => {
  5  |     test('logged-out home shows marketing hero', async ({ page }) => {
  6  |         await page.goto('/');
  7  |         await expect(page.getByRole('heading', { name: /AI teams/i })).toBeVisible({ timeout: 10_000 });
  8  |         await expect(page.getByRole('link', { name: /log in|browse teams|get started/i }).first()).toBeVisible();
  9  |     });
  10 | 
  11 |     test('browse teams is public', async ({ page }) => {
  12 |         await page.goto('/browse');
  13 |         await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible();
  14 |     });
  15 | 
  16 |     test('authenticated member sees slim sidebar links', async ({ page }) => {
  17 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  18 |         await page.goto('/home');
  19 |         const nav = page.locator('aside');
  20 |         await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  21 |         await expect(nav.getByRole('link', { name: 'Getting started', exact: true })).toBeVisible();
  22 |         await expect(nav.getByRole('link', { name: 'Teams', exact: true })).toBeVisible();
  23 |         await expect(nav.getByRole('link', { name: 'Realms', exact: true })).toBeVisible();
  24 |         await expect(nav.getByRole('link', { name: 'HUGs and Events', exact: true })).toBeVisible();
  25 |         await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
  26 |         await expect(nav.getByRole('link', { name: 'CliqHub Marketplace', exact: true })).toBeVisible();
  27 |         await expect(nav.getByRole('link', { name: 'Human Reviews', exact: true })).toHaveCount(0);
  28 |         await expect(nav.getByRole('link', { name: 'My Organizations', exact: true })).toHaveCount(0);
  29 |         await expect(nav.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0);
  30 |         await expect(nav.getByRole('link', { name: 'HUG', exact: true })).toHaveCount(0);
  31 |         await expect(nav.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);
  32 |         await expect(nav.getByRole('link', { name: 'Browse', exact: true })).toHaveCount(0);
  33 |         await expect(nav.getByRole('link', { name: 'Builder', exact: true })).toHaveCount(0);
  34 |         await expect(nav.getByRole('link', { name: 'Daemons', exact: true })).toHaveCount(0);
  35 |         await expect(nav.getByRole('link', { name: 'Runs', exact: true })).toHaveCount(0);
  36 |         await expect(nav.getByRole('link', { name: 'Reviews', exact: true })).toHaveCount(0);
  37 |         await expect(nav.getByText('Admin', { exact: true })).toHaveCount(0);
  38 |     });
  39 | 
  40 |     test('sidebar navigates to realms', async ({ page }) => {
  41 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  42 |         await page.goto('/settings');
  43 |         await page.getByRole('link', { name: 'Realms' }).click();
  44 |         await expect(page).toHaveURL(/\/realms/);
  45 |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
  46 |     });
  47 | 
  48 |     test('admin sees admin nav', async ({ page }) => {
  49 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  50 |         await page.goto('/admin');
> 51 |         await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
     |                            ^ Error: expect(page).toHaveURL(expected) failed
  52 |         const nav = page.locator('aside');
  53 |         await expect(nav.getByText('Admin', { exact: true })).toBeVisible();
  54 |         await expect(nav.locator('a[href="/admin/accounts"]')).toBeVisible();
  55 |         await expect(nav.locator('a[href="/admin/orgs"]')).toBeVisible();
  56 |         await expect(nav.locator('a[href="/admin/audit"]')).toBeVisible();
  57 |         await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible();
  58 |     });
  59 | });
  60 | 
  61 | test.describe('Home & navigation — negative', () => {
  62 |     test('logged-in user visiting / is redirected to home', async ({ page }) => {
  63 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  64 |         await page.goto('/');
  65 |         await page.waitForURL((url) => url.pathname.includes('/home'), { timeout: 10_000 });
  66 |         expect(page.url()).toContain('/home');
  67 |     });
  68 | 
  69 |     test('unknown route does not crash app', async ({ page }) => {
  70 |         await page.goto('/this-route-does-not-exist-xyz');
  71 |         await expect(page.locator('body')).toBeVisible();
  72 |         const crashed = await page.getByText(/something went wrong|unhandled|stack trace/i).isVisible().catch(() => false);
  73 |         expect(crashed).toBe(false);
  74 |     });
  75 | });
  76 | 
```