# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth — negative >> unknown user shows credentials error
- Location: e2e/auth.spec.ts:74:5

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input value="" required="" id="password" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-[10px] border border-[var(--g-line)] bg-[var(--g-panel)] px-3.5 text-[14px] text-[var(--g-ink)] outline-none transition placeholder:text-[var(--g-ink-3)] focus:border-[var(--g-acc-line)] focus:ring-4 focus:ring-[var(--g-acc-soft)] aria-[invalid=true]:border-[var(--g-bad-line)] pr-11"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-pressed="false" aria-label="Show password" class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[var(--g-ink-3)] hover:bg-[var(--g-hover)] hover:text-[var(--g-ink)]">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - region "About CliqHub" [ref=e4]:
    - link [ref=e5] [cursor=pointer]:
      - /url: /
      - img "CliqHub" [ref=e6]
      - text: CliqHub
    - generic [ref=e13]:
      - heading "Ready-made AI teams. Your requirements. Your machines." [level=1] [ref=e14]: Ready-made AI teams.Your requirements.Your machines.
      - paragraph [ref=e15]: Run multi-agent teams on your own daemons, with human review where it matters and a full record of every phase.
      - list "Example team" [ref=e16]:
        - listitem [ref=e17]:
          - generic [ref=e18]: architect
        - listitem [ref=e22]:
          - generic [ref=e23]: review
        - listitem [ref=e27]:
          - generic [ref=e28]: implement
        - listitem [ref=e32]:
          - generic [ref=e33]: check
        - listitem [ref=e37]:
          - generic [ref=e38]: pr
    - list [ref=e40]:
      - listitem [ref=e41]:
        - generic [ref=e42]: —
        - text: "See every run live: phases, gates, cost."
      - listitem [ref=e43]:
        - generic [ref=e44]: —
        - text: Approve, send back or reject from one inbox.
      - listitem [ref=e45]:
        - generic [ref=e46]: —
        - text: Your code and keys stay on your daemons.
  - main [ref=e47]:
    - generic [ref=e49]:
      - heading "Sign in" [level=2] [ref=e50]
      - paragraph [ref=e51]: Welcome back. Use your CliqHub username.
      - generic [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]: Username
          - textbox "Username" [active] [ref=e55]: no-such-user-xyz
        - generic [ref=e56]:
          - generic [ref=e57]: Password
          - generic [ref=e58]:
            - textbox "Password" [ref=e59]
            - button "Show password" [ref=e60] [cursor=pointer]
        - button "Sign in" [disabled] [ref=e64] [cursor=pointer]
      - paragraph [ref=e65]: Need access? Ask a CliqHub admin for an invite.
      - generic [ref=e66]:
        - generic [ref=e69]:
          - text: Using the CLI? Run
          - code [ref=e70]: cliq login
        - link "Docs" [ref=e71] [cursor=pointer]:
          - /url: https://docs.getcliq.io
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
> 77  |         await page.getByLabel('Password').fill('whatever123');
      |                                           ^ Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
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