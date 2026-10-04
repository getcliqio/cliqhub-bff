# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account.spec.ts >> Account settings — negative >> wrong current password is rejected
- Location: e2e/account.spec.ts:62:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Change password' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Change password' })

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
    - text: Settings
  - button "Notifications"
- main:
  - heading "Settings" [level=1]
  - paragraph: Your account. Org-wide settings live under Manage › Organization.
  - navigation "Settings":
    - text: Account
    - button "Profile"
    - button "Password"
    - button "Access tokens"
    - text: Publishing
    - button "My scopes"
  - form "Change password":
    - text: Current password
    - textbox "Current password"
    - text: New password (8+ characters)
    - textbox "New password (8+ characters)"
    - text: Confirm new password
    - textbox "Confirm new password"
    - button "Change password" [disabled]
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
  52  |         await page.waitForURL(/\/realms/, { timeout: 10_000 });
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
> 65  |         await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10_000 });
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
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