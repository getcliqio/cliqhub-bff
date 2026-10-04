# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin UI — positive >> audit page loads
- Location: e2e/admin.spec.ts:66:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /admin · audit/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: /admin · audit/i })

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
    - text: Audit log
- main:
  - heading "Audit log" [level=1]
  - paragraph: Every privileged action on the hub — who, what, on whom.
  - group "Time range":
    - button "Any time" [pressed]
    - button "24h"
    - button "7 days"
    - button "30 days"
  - combobox "Target type":
    - 'option "Target: any" [selected]'
    - option "user"
    - option "org"
    - option "scope"
    - option "team"
    - option "agent"
  - textbox "Action":
    - /placeholder: Action, e.g. user.suspend
  - textbox "Target id"
  - button "Apply"
  - table:
    - rowgroup:
      - row "When Who Action Target Details":
        - columnheader "When":
          - button "When"
        - columnheader "Who"
        - columnheader "Action":
          - button "Action"
        - columnheader "Target"
        - columnheader "Details"
    - rowgroup:
      - row "No matching entries.":
        - cell "No matching entries."
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     api_post,
  5   |     expect_admin_blocked,
  6   |     expect_api_denied,
  7   |     expect_api_ok,
  8   |     unique_slug,
  9   |     TEST_ADMIN,
  10  |     TEST_USER,
  11  | } from './helpers';
  12  | 
  13  | const STRONG_PASSWORD = 'Longpass1!';
  14  | 
  15  | test.describe('Admin UI — positive', () => {
  16  |     test.beforeEach(async ({ page }) => {
  17  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  18  |     });
  19  | 
  20  |     test('admin index redirects to accounts', async ({ page }) => {
  21  |         await page.goto('/admin');
  22  |         await expect(page).toHaveURL(/\/admin\/accounts/, { timeout: 10_000 });
  23  |         await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
  24  |     });
  25  | 
  26  |     test('users list and search', async ({ page }) => {
  27  |         await page.goto('/admin/users');
  28  |         await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
  29  |         await expect(page.getByText(/\d+ total/)).toBeVisible({ timeout: 10_000 });
  30  |         await page.getByLabel('Filter accounts').fill(TEST_ADMIN.username);
  31  |         await page.getByRole('button', { name: 'Apply' }).click();
  32  |         await expect(page.getByText(TEST_ADMIN.username).first()).toBeVisible({ timeout: 8_000 });
  33  |     });
  34  | 
  35  |     test('create user dialog and success', async ({ page }) => {
  36  |         await page.goto('/admin/users');
  37  |         await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
  38  |         await page.getByRole('button', { name: 'Invite user' }).click();
  39  |         await expect(page.getByText('New account')).toBeVisible({ timeout: 5_000 });
  40  | 
  41  |         const username = unique_slug('e2eu');
  42  |         await page.getByPlaceholder('username', { exact: true }).fill(username);
  43  |         await page.getByPlaceholder('email', { exact: true }).fill(`${username}@example.com`);
  44  |         await page.getByPlaceholder('password', { exact: true }).fill(STRONG_PASSWORD);
  45  |         await page.getByRole('button', { name: /^create$/i }).click();
  46  |         await expect(page.getByText(username).first()).toBeVisible({ timeout: 10_000 });
  47  |     });
  48  | 
  49  |     test('orgs page loads and create dialog opens', async ({ page }) => {
  50  |         await page.goto('/admin/orgs');
  51  |         await expect(page.getByRole('heading', { name: /admin · organizations/i })).toBeVisible({ timeout: 10_000 });
  52  |         await page.getByRole('button', { name: /create org/i }).click();
  53  |         await expect(page.getByText(/new organization/i)).toBeVisible({ timeout: 5_000 });
  54  |     });
  55  | 
  56  |     test('scopes page loads', async ({ page }) => {
  57  |         await page.goto('/admin/scopes');
  58  |         await expect(page.getByRole('heading', { name: /admin · scopes/i })).toBeVisible({ timeout: 10_000 });
  59  |     });
  60  | 
  61  |     test('teams page loads', async ({ page }) => {
  62  |         await page.goto('/admin/teams');
  63  |         await expect(page.getByRole('heading', { name: /admin · teams/i })).toBeVisible({ timeout: 10_000 });
  64  |     });
  65  | 
  66  |     test('audit page loads', async ({ page }) => {
  67  |         await page.goto('/admin/audit');
> 68  |         await expect(page.getByRole('heading', { name: /admin · audit/i })).toBeVisible({ timeout: 10_000 });
      |                                                                             ^ Error: expect(locator).toBeVisible() failed
  69  |     });
  70  | 
  71  |     test('resource-path APIs work for admin', async ({ page }) => {
  72  |         await expect_api_ok(await api_post(page, '/v1/users/get', { limit: 5, offset: 0 }));
  73  |         await expect_api_ok(await api_post(page, '/v1/reports/audit', { limit: 5, offset: 0 }));
  74  |         await expect_api_ok(await api_post(page, '/v1/scopes/get', { limit: 5, offset: 0 }));
  75  |         await expect_api_ok(await api_post(page, '/v1/orgs/get', { limit: 5, offset: 0 }));
  76  |     });
  77  | });
  78  | 
  79  | test.describe('Admin UI — negative', () => {
  80  |     test('member is blocked from admin users', async ({ page }) => {
  81  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  82  |         await expect_admin_blocked(page, '/admin/users');
  83  |     });
  84  | 
  85  |     test('member is blocked from admin index', async ({ page }) => {
  86  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  87  |         await expect_admin_blocked(page, '/admin');
  88  |     });
  89  | 
  90  |     test('member cannot call privileged APIs', async ({ page }) => {
  91  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  92  |         await expect_api_denied(await api_post(page, '/v1/users/new', {
  93  |             username: unique_slug('denied'),
  94  |             email: `denied-${Date.now()}@example.com`,
  95  |             password: STRONG_PASSWORD,
  96  |         }));
  97  |         await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
  98  |         await expect_api_denied(await api_post(page, '/v1/orgs/new', {
  99  |             slug: unique_slug('deniedorg'),
  100 |             admin_username: TEST_USER.username,
  101 |         }));
  102 |     });
  103 | 
  104 |     test('legacy /v1/admin/* is 404', async ({ page }) => {
  105 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  106 |         const res = await api_post(page, '/v1/admin/stats', {});
  107 |         expect(res.status()).toBe(404);
  108 |     });
  109 | 
  110 |     test('unauthenticated admin API is denied', async ({ page }) => {
  111 |         await expect_api_denied(await api_post(page, '/v1/users/get', {}));
  112 |         await expect_api_denied(await api_post(page, '/v1/reports/audit', {}));
  113 |     });
  114 | 
  115 |     test('create user with invalid username shows error', async ({ page }) => {
  116 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  117 |         await page.goto('/admin/users');
  118 |         await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible({ timeout: 10_000 });
  119 |         await page.getByRole('button', { name: 'Invite user' }).click();
  120 | 
  121 |         await page.getByPlaceholder('username', { exact: true }).fill('123bad');
  122 |         await page.getByPlaceholder('email', { exact: true }).fill('bad@example.com');
  123 |         await page.getByPlaceholder('password', { exact: true }).fill(STRONG_PASSWORD);
  124 |         await page.getByRole('button', { name: /^create$/i }).click();
  125 |         await expect(page.getByText(/username|slug|letter|invalid|start with/i).first()).toBeVisible({ timeout: 8_000 });
  126 |     });
  127 | });
  128 | 
```