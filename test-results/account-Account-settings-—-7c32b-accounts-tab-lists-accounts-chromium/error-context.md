# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account.spec.ts >> Account settings — positive >> accounts tab lists accounts
- Location: e2e/account.spec.ts:49:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3010/org"
  navigated to "http://localhost:3010/orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3"
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
        - generic [ref=e110]: Organization
      - button "Notifications" [ref=e113] [cursor=pointer]
    - main [ref=e117]:
      - generic [ref=e118]:
        - generic [ref=e119]:
          - generic [ref=e120]: TE
          - generic [ref=e121]:
            - heading "testuser" [level=1] [ref=e122]
            - paragraph [ref=e123]: You’re an admin · 1 member · 1 scope
          - link "Realms →" [ref=e124] [cursor=pointer]:
            - /url: /realms?org=testuser
        - tablist "Organization" [ref=e125]:
          - tab "Members" [selected] [ref=e126] [cursor=pointer]
          - tab "Roles" [ref=e127] [cursor=pointer]
          - tab "Scopes" [ref=e128] [cursor=pointer]
          - tab "A2A" [ref=e129] [cursor=pointer]
          - tab "Settings" [ref=e130] [cursor=pointer]
        - generic [ref=e131]:
          - generic [ref=e132]:
            - group "Filter" [ref=e133]:
              - button "All 1" [pressed] [ref=e134] [cursor=pointer]:
                - text: All
                - generic [ref=e135]: "1"
              - button "Owners 1" [ref=e136] [cursor=pointer]:
                - text: Owners
                - generic [ref=e137]: "1"
              - button "Admins 0" [ref=e138] [cursor=pointer]:
                - text: Admins
                - generic [ref=e139]: "0"
              - button "Pending invites 0" [ref=e140] [cursor=pointer]:
                - text: Pending invites
                - generic [ref=e141]: "0"
            - textbox "Filter members" [ref=e142]
          - form "Add or invite" [ref=e143]:
            - textbox "Add or invite" [ref=e144]:
              - /placeholder: Username (adds now) or email (invites)
            - button "Add" [disabled] [ref=e145] [cursor=pointer]
          - table [ref=e148]:
            - rowgroup [ref=e149]:
              - row [ref=e150]:
                - columnheader [ref=e151]:
                  - button "Member" [ref=e152] [cursor=pointer]
                - columnheader [ref=e156]:
                  - button "Role" [ref=e157] [cursor=pointer]
                - columnheader [ref=e161]
            - rowgroup [ref=e162]:
              - row [ref=e163]:
                - cell "testuser(you) testuser@test.com" [ref=e164]:
                  - generic [ref=e165]:
                    - generic [ref=e166]: TE
                    - generic [ref=e167]:
                      - text: testuser(you)
                      - generic [ref=e168]: testuser@test.com
                - cell "Owner" [ref=e169]
                - cell [ref=e170]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     expect_login_redirect,
  5   |     TEST_USER,
  6   | } from './helpers';
  7   | 
  8   | test.describe('Account settings — positive', () => {
  9   |     test.beforeEach(async ({ page }) => {
  10  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  11  |     });
  12  | 
  13  |     test('settings page loads with profile fields', async ({ page }) => {
  14  |         await page.goto('/settings?tab=profile');
  15  |         await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
  16  |         await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  17  |         await expect(page.getByText('Usernames cannot be changed.')).toBeVisible();
  18  |         await expect(page.getByLabel('Display name')).toBeVisible();
  19  |         await expect(page.getByLabel('Email')).toBeVisible();
  20  |         await expect(page.getByRole('link', { name: 'Security' })).toBeVisible();
  21  |         await expect(page.getByRole('link', { name: 'Access' })).toBeVisible();
  22  |         await expect(page.getByRole('button', { name: 'Personal Settings' })).toBeVisible();
  23  |     });
  24  | 
  25  |     test('update display name saves', async ({ page }) => {
  26  |         await page.goto('/settings?tab=profile');
  27  |         await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
  28  | 
  29  |         const display_input = page.getByLabel('Display name');
  30  |         const email_input = page.getByLabel('Email');
  31  |         const email_value = await email_input.inputValue();
  32  |         if (!email_value.includes('@')) {
  33  |             await email_input.fill('testuser@test.com');
  34  |         }
  35  | 
  36  |         const new_value = `Test User ${Date.now() % 10_000}`;
  37  |         await display_input.fill(new_value);
  38  |         await page.getByRole('button', { name: /save profile/i }).click();
  39  |         await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 8_000 });
  40  |     });
  41  | 
  42  |     test('security tab shows password form', async ({ page }) => {
  43  |         await page.goto('/settings?tab=security');
  44  |         await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
  45  |         await expect(page.getByLabel('Current password')).toBeVisible();
  46  |         await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
  47  |     });
  48  | 
  49  |     test('accounts tab lists accounts', async ({ page }) => {
  50  |         // Legacy /organizations list folded into Realms.
  51  |         await page.goto('/organizations');
> 52  |         await page.waitForURL(/\/realms/, { timeout: 10_000 });
      |                    ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  53  |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
  54  |     });
  55  | });
  56  | 
  57  | test.describe('Account settings — negative', () => {
  58  |     test('unauthenticated access redirects to login', async ({ page }) => {
  59  |         await expect_login_redirect(page, '/settings?tab=profile');
  60  |     });
  61  | 
  62  |     test('wrong current password is rejected', async ({ page }) => {
  63  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  64  |         await page.goto('/settings?tab=security');
  65  |         await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
  66  | 
  67  |         await page.getByLabel('Current password').fill('wrong-current-password');
  68  |         await page.getByLabel('New password', { exact: true }).fill('Newpassword123!');
  69  |         await page.getByLabel('Confirm new password').fill('Newpassword123!');
  70  |         await page.getByRole('button', { name: /update password/i }).click();
  71  |         await expect(page.getByText(/incorrect|wrong|invalid|failed|current|password/i).first()).toBeVisible({ timeout: 8_000 });
  72  |     });
  73  | 
  74  |     test('mismatched confirm password keeps change disabled or errors', async ({ page }) => {
  75  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  76  |         await page.goto('/settings?tab=security');
  77  |         await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
  78  | 
  79  |         await page.getByLabel('Current password').fill(TEST_USER.password);
  80  |         await page.getByLabel('New password', { exact: true }).fill('newpassword123!');
  81  |         await page.getByLabel('Confirm new password').fill('different-password');
  82  | 
  83  |         const change_btn = page.getByRole('button', { name: /update password/i });
  84  |         if (await change_btn.isDisabled()) {
  85  |             await expect(change_btn).toBeDisabled();
  86  |             return;
  87  |         }
  88  |         await change_btn.click();
  89  |         await expect(page.getByText(/match|confirm|invalid|failed/i)).toBeVisible({ timeout: 5_000 });
  90  |     });
  91  | 
  92  |     test('empty display name is rejected', async ({ page }) => {
  93  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  94  |         await page.goto('/settings?tab=profile');
  95  |         await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({ timeout: 10_000 });
  96  | 
  97  |         await page.getByLabel('Display name').fill('   ');
  98  |         const save = page.getByRole('button', { name: /save profile/i });
  99  |         if (await save.isDisabled()) {
  100 |             await expect(save).toBeDisabled();
  101 |             return;
  102 |         }
  103 |         await save.click();
  104 |         await expect(page.getByText('Display name is required')).toBeVisible({ timeout: 5_000 });
  105 |     });
  106 | });
  107 | 
```