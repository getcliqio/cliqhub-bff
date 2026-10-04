# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth — negative >> signup is invite-only (no public registration form)
- Location: e2e/auth.spec.ts:91:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('main').getByRole('link', { name: /^log in$/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('main').getByRole('link', { name: /^log in$/i })

```

```yaml
- region "About CliqHub":
  - link "CliqHub CliqHub":
    - /url: /
    - img "CliqHub"
    - text: CliqHub
  - heading "Ready-made AI teams. Your requirements. Your machines." [level=1]
  - paragraph: Run multi-agent teams on your own daemons, with human review where it matters and a full record of every phase.
  - list "Example team":
    - listitem: architect
    - listitem: review
    - listitem: implement
    - listitem: check
    - listitem: pr
  - list:
    - listitem: "— See every run live: phases, gates, cost."
    - listitem: — Approve, send back or reject from one inbox.
    - listitem: — Your code and keys stay on your daemons.
- main:
  - heading "Invite only" [level=1]
  - paragraph: CliqHub is in private beta. Accounts are created from an organization invitation — open the link in your invite email to set up your account.
  - link "I have an account — sign in":
    - /url: /login
  - paragraph: Invited to a realm but don’t have an account? Ask whoever invited you to invite you to their organization.
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
  40  |         await page.getByRole('button', { name: /^sign out$/i }).click();
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
> 94  |         await expect(page.getByRole('main').getByRole('link', { name: /^log in$/i })).toBeVisible();
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
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