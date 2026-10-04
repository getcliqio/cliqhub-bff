# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home_nav.spec.ts >> Home & navigation — positive >> sidebar navigates to realms
- Location: e2e/home_nav.spec.ts:40:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Realms' })

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
        - generic [ref=e73]: "1"
      - link "No daemons default" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: default
    - generic [ref=e78]:
      - link "Getting started 1 of 4 done" [ref=e79] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=e85]: 1 / 4
      - link "Docs" [ref=e86] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e89]: ↗
      - button "TE testuser @testuser" [ref=e91] [cursor=pointer]:
        - generic [ref=e92]: TE
        - generic [ref=e93]:
          - generic [ref=e94]: testuser
          - generic [ref=e95]: "@testuser"
  - generic [ref=e100]:
    - banner [ref=e101]:
      - navigation "Breadcrumb" [ref=e102]:
        - link "All my work" [ref=e104] [cursor=pointer]:
          - /url: /home
        - generic [ref=e110]: Settings
      - button "Notifications" [ref=e113] [cursor=pointer]
    - main [ref=e117]:
      - generic [ref=e118]:
        - generic [ref=e119]:
          - heading "Settings" [level=1] [ref=e120]
          - paragraph [ref=e121]: Your account. Org-wide settings live under Manage › Organization.
        - generic [ref=e122]:
          - navigation "Settings" [ref=e123]:
            - generic [ref=e124]:
              - generic [ref=e125]: Account
              - button "Profile" [ref=e126] [cursor=pointer]
              - button "Password" [ref=e127] [cursor=pointer]
              - button "Access tokens" [ref=e128] [cursor=pointer]
            - generic [ref=e129]:
              - generic [ref=e130]: Publishing
              - button "My scopes" [ref=e131] [cursor=pointer]
          - generic [ref=e133]:
            - form "Profile" [ref=e134]:
              - generic [ref=e135]:
                - generic [ref=e136]: TE
                - generic [ref=e137]:
                  - text: testuser
                  - generic [ref=e138]: "@testuser"
              - generic [ref=e139]:
                - text: Display name
                - textbox "Display name" [ref=e140]: testuser
              - generic [ref=e141]:
                - text: Email
                - textbox "Email" [ref=e142]: testuser@test.com
                - generic [ref=e143]: Used for invites and notifications.
              - generic [ref=e144]:
                - text: Username
                - textbox "Username" [ref=e145]: testuser
                - generic [ref=e146]: Can’t be changed — it’s your personal scope @testuser.
              - button "Save" [disabled] [ref=e148] [cursor=pointer]
            - region "Organizations" [ref=e149]:
              - text: Organizations
              - list [ref=e150]:
                - listitem [ref=e151]:
                  - generic [ref=e152]: TE
                  - generic [ref=e153]: testuser
                  - generic [ref=e154]: admin
                  - link "Manage" [ref=e156] [cursor=pointer]:
                    - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
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
> 43 |         await page.getByRole('link', { name: 'Realms' }).click();
     |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
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