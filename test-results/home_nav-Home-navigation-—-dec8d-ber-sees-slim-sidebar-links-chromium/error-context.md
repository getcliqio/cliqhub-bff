# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home_nav.spec.ts >> Home & navigation — positive >> authenticated member sees slim sidebar links
- Location: e2e/home_nav.spec.ts:16:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('aside').getByRole('link', { name: 'Home', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('aside').getByRole('link', { name: 'Home', exact: true })

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
  - text: Realms 1
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
    - text: Overview
  - button "Notifications"
  - button "Refresh"
- main:
  - heading "Good afternoon, testuser" [level=1]
  - paragraph: Across 1 org and 1 realm you can access.
  - text: Waiting on you 0 0 reviews · 0 inputs Running now 0 nothing running Failed · 24h 0 0 completed Daemons 0/0 none enrolled
  - region "Needs you":
    - heading "Needs you" [level=2]
    - text: across every org
    - tablist "Filter needs":
      - tab "All 0" [selected]
      - tab "Reviews 0"
      - tab "Input 0"
    - paragraph: You’re all caught up
    - paragraph: Reviews and input requests will show up here.
  - region "Realms":
    - heading "Realms" [level=2]
    - text: waiting on you first
    - link "All 1 realms →":
      - /url: /realms
    - link "No daemons default testuser no daemons":
      - /url: /o/testuser/realms/default/inbox
      - img "No daemons"
      - text: default testuserno daemons
  - region "Running now":
    - heading "Running now" [level=2]
    - paragraph: Nothing is running right now.
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
> 20 |         await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
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
  51 |         await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
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