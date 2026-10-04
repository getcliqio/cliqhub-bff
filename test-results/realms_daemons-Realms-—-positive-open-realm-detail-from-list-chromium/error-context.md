# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Realms — positive >> open realm detail from list
- Location: e2e/realms_daemons.spec.ts:74:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Filter realms by slug or name')

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
        - generic [ref=e73]: "6"
      - link "No daemons e2e-det-muqwg52d" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-det-muqwg52d
      - link "No daemons e2e-filt-muqwfwkb" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-filt-muqwfwkb
      - link "No daemons e2e-notif-muqwc55t" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-notif-muqwc55t
      - link "No daemons e2e-noch-muqwbwhw" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
        - generic [ref=e89]: e2e-noch-muqwbwhw
      - link "No daemons e2e-ch-muqwaqs7" [ref=e90] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
        - img "No daemons" [ref=e91]
        - generic [ref=e92]: TE
        - generic [ref=e93]: e2e-ch-muqwaqs7
      - link "No daemons default" [ref=e94] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=e95]
        - generic [ref=e96]: TE
        - generic [ref=e97]: default
    - generic [ref=e98]:
      - link "Getting started 1 of 4 done" [ref=e99] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=e105]: 1 / 4
      - link "Docs" [ref=e106] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e109]: ↗
      - button "TE testuser @testuser" [ref=e111] [cursor=pointer]:
        - generic [ref=e112]: TE
        - generic [ref=e113]:
          - generic [ref=e114]: testuser
          - generic [ref=e115]: "@testuser"
  - generic [ref=e120]:
    - banner [ref=e121]:
      - navigation "Breadcrumb" [ref=e122]:
        - link "All my work" [ref=e124] [cursor=pointer]:
          - /url: /home
        - generic [ref=e130]: Realms
      - button "Notifications" [ref=e133] [cursor=pointer]
    - main [ref=e137]:
      - generic [ref=e138]:
        - generic [ref=e139]:
          - generic [ref=e140]:
            - heading "Realms" [level=1] [ref=e141]
            - paragraph [ref=e142]: Groups of machines that run your teams. 6 realms across 1 organization.
          - button "New realm" [ref=e143] [cursor=pointer]
        - textbox "Search realms" [ref=e150]
        - region "testuser" [ref=e151]:
          - generic [ref=e152]:
            - heading "testuser" [level=2] [ref=e153]
            - generic [ref=e154]: admin
            - link "Manage org →" [ref=e155] [cursor=pointer]:
              - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
          - generic [ref=e156]:
            - link "Detail e2e-det-muqwg52d e2e-det-muqwg52d no daemons Active just now" [ref=e157] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
              - generic [ref=e158]:
                - generic [ref=e159]: Detail e2e-det-muqwg52d
                - generic [ref=e160]: e2e-det-muqwg52d
              - generic [ref=e161]: no daemons
              - generic [ref=e162]: Active just now
            - link "Filter Target e2e-filt-muqwfwkb e2e-filt-muqwfwkb no daemons Active just now" [ref=e164] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
              - generic [ref=e165]:
                - generic [ref=e166]: Filter Target e2e-filt-muqwfwkb
                - generic [ref=e167]: e2e-filt-muqwfwkb
              - generic [ref=e168]: no daemons
              - generic [ref=e169]: Active just now
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 3m ago" [ref=e171] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=e172]:
                - generic [ref=e173]: Notif e2e-notif-muqwc55t
                - generic [ref=e174]: e2e-notif-muqwc55t
              - generic [ref=e175]: no daemons
              - generic [ref=e176]: Active 3m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 3m ago" [ref=e178] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=e179]:
                - generic [ref=e180]: Notify e2e-noch-muqwbwhw
                - generic [ref=e181]: e2e-noch-muqwbwhw
              - generic [ref=e182]: no daemons
              - generic [ref=e183]: Active 3m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 4m ago" [ref=e185] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=e186]:
                - generic [ref=e187]: Notify e2e-ch-muqwaqs7
                - generic [ref=e188]: e2e-ch-muqwaqs7
              - generic [ref=e189]: no daemons
              - generic [ref=e190]: Active 4m ago
            - link "default default no daemons Active 15m ago" [ref=e192] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=e193]:
                - generic [ref=e194]: default
                - generic [ref=e195]: default
              - generic [ref=e196]: no daemons
              - generic [ref=e197]: Active 15m ago
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
  23  |         await expect(page.getByRole('button', { name: /^create realm$/i })).toBeVisible();
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
> 77  |         await page.getByLabel('Filter realms by slug or name').fill(realm.slug);
      |                                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  124 |         await page.getByRole('navigation', { name: 'Realm settings' }).getByRole('link', { name: 'Members', exact: true }).click();
  125 |         await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings/security/members`));
  126 |         await page.getByRole('navigation', { name: 'Realm settings' }).getByRole('link', { name: 'Tokens', exact: true }).click();
  127 |         await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings/security/tokens`));
  128 | 
  129 |         await tab_nav.getByRole('link', { name: 'Channels', exact: true }).click();
  130 |         await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/channels`));
  131 |         await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible();
  132 |     });
  133 | 
  134 |     test('mint realm token full-width form', async ({ page }) => {
  135 |         const realm = await api_create_realm(page, 'e2e-tok', 'Detail');
  136 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
  137 |         await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 10_000 });
  138 | 
  139 |         const token_name = `enroll-${realm.slug.slice(-6)}`;
  140 |         await page.getByPlaceholder('laptop-enroll').fill(token_name);
  141 |         await page.getByRole('button', { name: /^mint$/i }).click();
  142 |         await expect(page.getByText(/CLIQ_DAEMON_TOKEN|cliq_dt_/i).first()).toBeVisible({ timeout: 10_000 });
  143 | 
  144 |         await page.getByRole('button', { name: /^done$/i }).click();
  145 |         await expect(page).not.toHaveURL(/form=1/);
  146 |         await expect(page.getByText(token_name)).toBeVisible({ timeout: 10_000 });
  147 |     });
  148 | 
  149 |     test('users tab filter uses member_type in members POST body', async ({ page }) => {
  150 |         const realm = await api_create_realm(page, 'e2e-usr', 'Detail');
  151 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/members'));
  152 |         await expect(page.getByRole('heading', { name: 'Realm members' })).toBeVisible({ timeout: 10_000 });
  153 | 
  154 |         await page.getByLabel('Search members').fill('zzz-no-member');
  155 |         await expect(page.getByText(/no members match this filter/i)).toBeVisible({ timeout: 10_000 });
  156 |     });
  157 | 
  158 |     test('invite form validates empty email', async ({ page }) => {
  159 |         const realm = await api_create_realm(page, 'e2e-add', 'Detail');
  160 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/members'));
  161 |         await expect(page.getByRole('heading', { name: 'Realm members' })).toBeVisible({ timeout: 10_000 });
  162 |         await page.getByRole('button', { name: 'Add member' }).click();
  163 |         await expect(page.getByRole('button', { name: /^add$/i })).toBeDisabled();
  164 |     });
  165 | });
  166 | 
  167 | test.describe('Realms — negative', () => {
  168 |     test('unauthenticated realms redirects to login', async ({ page }) => {
  169 |         await expect_login_redirect(page, '/realms');
  170 |     });
  171 | 
  172 |     test('create without slug/name shows validation error', async ({ page }) => {
  173 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  174 |         await open_create_realm(page);
  175 |         await page.getByRole('button', { name: /^create & continue$/i }).click();
  176 |         await expect(page.getByText(/slug is required|display name is required|required/i)).toBeVisible({ timeout: 5_000 });
  177 |     });
```