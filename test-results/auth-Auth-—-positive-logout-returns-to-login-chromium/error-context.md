# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth — positive >> logout returns to login
- Location: e2e/auth.spec.ts:35:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^sign out$/i })

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
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     ui_login,
  4   |     api_login,
  5   |     api_logout,
  6   |     api_session_get,
  7   |     api_post,
  8   |     expect_alert,
  9   |     expect_login_redirect,
  10  |     TEST_ADMIN,
  11  |     TEST_USER,
  12  |     TEST_SUSPENDED,
  13  | } from './helpers';
  14  | 
  15  | test.describe('Auth — positive', () => {
  16  |     test('login with valid credentials leaves /login', async ({ page }) => {
  17  |         await ui_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  18  |         expect(page.url()).not.toContain('/login');
  19  |     });
  20  | 
  21  |     test('admin lands on /home after UI login', async ({ page }) => {
  22  |         await ui_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  23  |         await expect(page).toHaveURL(/\/home/);
  24  |     });
  25  | 
  26  |     test('member lands on redirect target after UI login', async ({ page }) => {
  27  |         await page.goto('/login?redirect=/settings');
  28  |         await page.getByLabel('Username').fill(TEST_USER.username);
  29  |         await page.getByLabel('Password').fill(TEST_USER.password);
  30  |         await page.getByRole('button', { name: 'Sign in' }).click();
  31  |         await page.waitForURL((url) => url.pathname === '/settings', { timeout: 15_000 });
  32  |         await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  33  |     });
  34  | 
  35  |     test('logout returns to login', async ({ page }) => {
  36  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  37  |         await page.goto('/settings');
  38  |         await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
  39  | 
> 40  |         await page.getByRole('button', { name: /^sign out$/i }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  41  |         await page.waitForURL('**/login', { timeout: 10_000 });
  42  |         expect(page.url()).toContain('/login');
  43  |     });
  44  | 
  45  |     test('api session create then get succeeds', async ({ page }) => {
  46  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  47  |         const res = await api_session_get(page);
  48  |         expect(res.ok()).toBe(true);
  49  |         const body = await res.json();
  50  |         expect(body.ok).toBe(true);
  51  |         expect(body.data?.user?.username ?? body.user?.username).toBe(TEST_ADMIN.username);
  52  |     });
  53  | });
  54  | 
  55  | test.describe('Auth — negative', () => {
  56  |     test('wrong password shows error and stays on login', async ({ page }) => {
  57  |         await page.goto('/login');
  58  |         await page.getByLabel('Username').fill(TEST_ADMIN.username);
  59  |         await page.getByLabel('Password').fill('totally-wrong-password');
  60  |         await page.getByRole('button', { name: 'Sign in' }).click();
  61  |         await expect_alert(page, /invalid|credentials|password/i);
  62  |         expect(page.url()).toContain('/login');
  63  |     });
  64  | 
  65  |     test('suspended user cannot log in', async ({ page }) => {
  66  |         await page.goto('/login');
  67  |         await page.getByLabel('Username').fill(TEST_SUSPENDED.username);
  68  |         await page.getByLabel('Password').fill(TEST_SUSPENDED.password);
  69  |         await page.getByRole('button', { name: 'Sign in' }).click();
  70  |         await expect_alert(page, /suspended|disabled|blocked/i);
  71  |         expect(page.url()).toContain('/login');
  72  |     });
  73  | 
  74  |     test('unknown user shows credentials error', async ({ page }) => {
  75  |         await page.goto('/login');
  76  |         await page.getByLabel('Username').fill('no-such-user-xyz');
  77  |         await page.getByLabel('Password').fill('whatever123');
  78  |         await page.getByRole('button', { name: 'Sign in' }).click();
  79  |         await expect_alert(page, /invalid|credentials|not found|password/i);
  80  |         expect(page.url()).toContain('/login');
  81  |     });
  82  | 
  83  |     test('unauthenticated account page redirects to login', async ({ page }) => {
  84  |         await expect_login_redirect(page, '/settings');
  85  |     });
  86  | 
  87  |     test('unauthenticated tokens page redirects to login', async ({ page }) => {
  88  |         await expect_login_redirect(page, '/tokens');
  89  |     });
  90  | 
  91  |     test('signup is invite-only (no public registration form)', async ({ page }) => {
  92  |         await page.goto('/signup');
  93  |         await expect(page.getByRole('heading', { name: /invite only/i })).toBeVisible();
  94  |         await expect(page.getByRole('main').getByRole('link', { name: /^log in$/i })).toBeVisible();
  95  |         await expect(page.getByLabel(/username/i)).toHaveCount(0);
  96  |     });
  97  | 
  98  |     test('logout clears session — protected page redirects again', async ({ page }) => {
  99  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  100 |         await api_logout(page);
  101 |         await expect_login_redirect(page, '/settings');
  102 |     });
  103 | 
  104 |     test('legacy /v1/auth/login|me|impersonate return 404', async ({ page }) => {
  105 |         for (const path of ['/v1/auth/login', '/v1/auth/me', '/v1/auth/impersonate'] as const) {
  106 |             const res = await api_post(page, path, {});
  107 |             expect(res.status(), `${path} should be gone`).toBe(404);
  108 |         }
  109 |     });
  110 | });
  111 | 
```