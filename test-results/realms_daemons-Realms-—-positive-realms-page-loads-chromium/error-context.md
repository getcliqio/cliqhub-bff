# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Realms — positive >> realms page loads
- Location: e2e/realms_daemons.spec.ts:20:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /^create realm$/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /^create realm$/i })

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
  - text: Realms 4
  - link "No daemons e2e-notif-muqwc55t":
    - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
    - img "No daemons"
    - text: e2e-notif-muqwc55t
  - link "No daemons e2e-noch-muqwbwhw":
    - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
    - img "No daemons"
    - text: e2e-noch-muqwbwhw
  - link "No daemons e2e-ch-muqwaqs7":
    - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
    - img "No daemons"
    - text: e2e-ch-muqwaqs7
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
    - text: Realms
  - button "Notifications"
- main:
  - heading "Realms" [level=1]
  - paragraph: Groups of machines that run your teams. 4 realms across 1 organization.
  - button "New realm"
  - textbox "Search realms"
  - region "testuser":
    - heading "testuser" [level=2]
    - text: admin
    - link "Manage org →":
      - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
    - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 2m ago":
      - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
    - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 2m ago":
      - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
    - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 3m ago":
      - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
    - link "default default no daemons Active 13m ago":
      - /url: /o/testuser/realms/default/inbox
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     api_create_realm,
  5   |     api_current_org_id,
  6   |     expect_alert,
  7   |     expect_login_redirect,
  8   |     open_create_realm,
  9   |     realm_url,
  10  |     submit_create_realm,
  11  |     unique_slug,
  12  |     TEST_USER,
  13  | } from './helpers';
  14  | 
  15  | test.describe('Realms — positive', () => {
  16  |     test.beforeEach(async ({ page }) => {
  17  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  18  |     });
  19  | 
  20  |     test('realms page loads', async ({ page }) => {
  21  |         await page.goto('/realms');
  22  |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
> 23  |         await expect(page.getByRole('button', { name: /^create realm$/i })).toBeVisible();
      |                                                                             ^ Error: expect(locator).toBeVisible() failed
  24  |         await expect(page.getByLabel('Filter realms by slug or name')).toBeVisible();
  25  |     });
  26  | 
  27  |     test('create realm full-width flow appears in list', async ({ page }) => {
  28  |         await open_create_realm(page);
  29  | 
  30  |         const slug = unique_slug('e2e-realm');
  31  |         const name = `E2E Realm ${slug}`;
  32  |         await submit_create_realm(page, slug, name);
  33  | 
  34  |         await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 10_000 });
  35  |         await expect(page).toHaveURL(new RegExp(`/realms/${slug}`));
  36  | 
  37  |         // Filter by slug so the new realm is visible even when the list is paginated.
  38  |         await page.goto(`/realms?q=${encodeURIComponent(slug)}`);
  39  |         await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  40  |         await expect(page.getByText(new RegExp(`\\.${slug}$|${slug}`)).first()).toBeVisible();
  41  |     });
  42  | 
  43  |     test('cancel create returns to list', async ({ page }) => {
  44  |         await open_create_realm(page);
  45  |         await page.getByRole('button', { name: /^cancel$/i }).click();
  46  |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
  47  |         await expect(page).not.toHaveURL(/create=1/);
  48  |     });
  49  | 
  50  |     test('filter query is sent in list POST body', async ({ page }) => {
  51  |         const realm = await api_create_realm(page, 'e2e-filt', 'Filter Target');
  52  |         await page.goto('/realms');
  53  |         await expect(page.getByLabel('Filter realms by slug or name')).toBeVisible({ timeout: 10_000 });
  54  | 
  55  |         const filter_req = page.waitForRequest((req) =>
  56  |             req.url().includes('/v1/realms/get')
  57  |             && req.method() === 'POST'
  58  |             && (req.postDataJSON() as { query?: string })?.query === realm.slug,
  59  |         );
  60  |         await page.getByLabel('Filter realms by slug or name').fill(realm.slug);
  61  |         await filter_req;
  62  |         await expect(page.getByText(realm.name)).toBeVisible({ timeout: 10_000 });
  63  | 
  64  |         const empty_req = page.waitForRequest((req) =>
  65  |             req.url().includes('/v1/realms/get')
  66  |             && req.method() === 'POST'
  67  |             && (req.postDataJSON() as { query?: string })?.query === 'zzz-no-such-realm-xyz',
  68  |         );
  69  |         await page.getByLabel('Filter realms by slug or name').fill('zzz-no-such-realm-xyz');
  70  |         await empty_req;
  71  |         await expect(page.getByText(/no realms match these filters/i)).toBeVisible({ timeout: 10_000 });
  72  |     });
  73  | 
  74  |     test('open realm detail from list', async ({ page }) => {
  75  |         const realm = await api_create_realm(page, 'e2e-det', 'Detail');
  76  |         await page.goto('/realms');
  77  |         await page.getByLabel('Filter realms by slug or name').fill(realm.slug);
  78  |         await expect(page.getByText(realm.name)).toBeVisible({ timeout: 10_000 });
  79  | 
  80  |         const failed_api: Array<{ url: string; status: number; body: string }> = [];
  81  |         page.on('response', async (res) => {
  82  |             if (!res.url().includes('/v1/')) return;
  83  |             if (res.status() < 400) return;
  84  |             let body = '';
  85  |             try {
  86  |                 body = await res.text();
  87  |             } catch {
  88  |                 body = '';
  89  |             }
  90  |             failed_api.push({ url: res.url(), status: res.status(), body });
  91  |         });
  92  | 
  93  |         await page.getByText(realm.name).click();
  94  |         await page.waitForURL(new RegExp(`/o/[^/]+/realms/${realm.slug}`), { timeout: 10_000 });
  95  |         await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 10_000 });
  96  |         await expect(page.getByRole('navigation', { name: 'Realm sections' }).getByRole('link', { name: 'Teams' })).toBeVisible();
  97  |         await expect(page.getByText(/Unknown API route/i)).toHaveCount(0);
  98  | 
  99  |         const unknown = failed_api.filter((f) => /Unknown API route/i.test(f.body));
  100 |         expect(
  101 |             unknown,
  102 |             `realm detail must not hit retired routes: ${JSON.stringify(unknown)}`,
  103 |         ).toEqual([]);
  104 |     });
  105 | });
  106 | 
  107 | test.describe('Realm detail — positive', () => {
  108 |     test.beforeEach(async ({ page }) => {
  109 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  110 |     });
  111 | 
  112 |     test('section nav updates the URL', async ({ page }) => {
  113 |         const realm = await api_create_realm(page, 'e2e-tabs', 'Detail');
  114 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'teams'));
  115 |         await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 10_000 });
  116 |         const tab_nav = page.getByRole('navigation', { name: 'Realm sections' });
  117 | 
  118 |         await tab_nav.getByRole('link', { name: 'Notifications', exact: true }).click();
  119 |         await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/notifications`));
  120 |         await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  121 | 
  122 |         await tab_nav.getByRole('link', { name: 'Settings', exact: true }).click();
  123 |         await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings`));
```