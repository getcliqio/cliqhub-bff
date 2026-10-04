# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orgs.spec.ts >> Orgs UI — positive >> members filter query is sent in users POST body
- Location: e2e/orgs.spec.ts:81:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Members' })

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
        - generic [ref=e73]: "4"
      - link "No daemons default" [ref=e74] [cursor=pointer]:
        - /url: /o/e2e-roles-muqwdibk/realms/default/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: ER
        - generic [ref=e77]: default
      - link "No daemons e2e-filt-muqwbfp4" [ref=e78] [cursor=pointer]:
        - /url: /o/cliq/realms/e2e-filt-muqwbfp4/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: CL
        - generic [ref=e81]: e2e-filt-muqwbfp4
      - link "No daemons e2e-slack-muqwaz3n" [ref=e82] [cursor=pointer]:
        - /url: /o/cliq/realms/e2e-slack-muqwaz3n/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: CL
        - generic [ref=e85]: e2e-slack-muqwaz3n
      - link "No daemons default" [ref=e86] [cursor=pointer]:
        - /url: /o/cliq/realms/default/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: CL
        - generic [ref=e89]: default
    - generic [ref=e90]:
      - link "Getting started 1 of 4 done" [ref=e91] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=e97]: 1 / 4
      - link "Docs" [ref=e98] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e101]: ↗
      - button "Admin SITE" [ref=e102] [cursor=pointer]:
        - text: Admin
        - generic [ref=e105]: SITE
      - button "AD admin @admin · site admin" [ref=e107] [cursor=pointer]:
        - generic [ref=e108]: AD
        - generic [ref=e109]:
          - generic [ref=e110]: admin
          - generic [ref=e111]: "@admin · site admin"
  - generic [ref=e116]:
    - banner [ref=e117]:
      - navigation "Breadcrumb" [ref=e118]:
        - link "All my work" [ref=e120] [cursor=pointer]:
          - /url: /home
        - generic [ref=e126]: Organization
      - button "Notifications" [ref=e129] [cursor=pointer]
    - main [ref=e133]:
      - generic [ref=e134]:
        - generic [ref=e135]:
          - generic [ref=e136]: AD
          - generic [ref=e137]:
            - heading "admin" [level=1] [ref=e138]
            - paragraph [ref=e139]: Viewing as CliqHub admin · 1 member · 0 scopes
          - link "Realms →" [ref=e140] [cursor=pointer]:
            - /url: /realms?org=admin
        - tablist "Organization" [ref=e141]:
          - tab "Members" [selected] [ref=e142] [cursor=pointer]
          - tab "Roles" [ref=e143] [cursor=pointer]
          - tab "Scopes" [ref=e144] [cursor=pointer]
          - tab "A2A" [ref=e145] [cursor=pointer]
          - tab "Settings" [ref=e146] [cursor=pointer]
        - generic [ref=e147]:
          - generic [ref=e148]:
            - group "Filter" [ref=e149]:
              - button "All 1" [pressed] [ref=e150] [cursor=pointer]:
                - text: All
                - generic [ref=e151]: "1"
              - button "Owners 0" [ref=e152] [cursor=pointer]:
                - text: Owners
                - generic [ref=e153]: "0"
              - button "Admins 0" [ref=e154] [cursor=pointer]:
                - text: Admins
                - generic [ref=e155]: "0"
              - button "Pending invites 0" [ref=e156] [cursor=pointer]:
                - text: Pending invites
                - generic [ref=e157]: "0"
            - textbox "Filter members" [ref=e158]
          - form "Add or invite" [ref=e159]:
            - textbox "Add or invite" [ref=e160]:
              - /placeholder: Username (adds now) or email (invites)
            - button "Add" [disabled] [ref=e161] [cursor=pointer]
          - table [ref=e164]:
            - rowgroup [ref=e165]:
              - row [ref=e166]:
                - columnheader [ref=e167]:
                  - button "Member" [ref=e168] [cursor=pointer]
                - columnheader [ref=e172]:
                  - button "Role" [ref=e173] [cursor=pointer]
                - columnheader [ref=e177]
            - rowgroup [ref=e178]:
              - row [ref=e179]:
                - cell "admin(you) admin@cliqhub.io" [ref=e180]:
                  - generic [ref=e181]:
                    - generic [ref=e182]: AD
                    - generic [ref=e183]:
                      - text: admin(you)
                      - generic [ref=e184]: admin@cliqhub.io
                - cell "admin" [ref=e185]
                - cell [ref=e186]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     api_post,
  5   |     expect_api_ok,
  6   |     expect_login_redirect,
  7   |     unique_slug,
  8   |     TEST_ADMIN,
  9   |     TEST_USER,
  10  | } from './helpers';
  11  | 
  12  | async function ensure_admin_org(page: import('@playwright/test').Page): Promise<number> {
  13  |     const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
  14  |     const data = (listed.data ?? listed) as { orgs?: Array<{ id: number; slug?: string }> };
  15  |     const orgs = data.orgs ?? [];
  16  |     if (orgs.length > 0) return orgs[0].id;
  17  | 
  18  |     const slug = unique_slug('e2e-org');
  19  |     const created = await expect_api_ok(await api_post(page, '/v1/orgs/new', {
  20  |         slug,
  21  |         display_name: `E2E Org ${slug}`,
  22  |         admin_username: TEST_ADMIN.username,
  23  |     }));
  24  |     const org = ((created.org ?? created.data) as { id?: string | number });
  25  |     expect(org?.id).toBeTruthy();
  26  |     return String(org!.id);
  27  | }
  28  | 
  29  | async function open_first_org(page: import('@playwright/test').Page): Promise<void> {
  30  |     const org_id = await ensure_admin_org(page);
  31  |     await page.goto(`/orgs/${org_id}`);
  32  |     await page.waitForURL(/\/orgs\/[^/]+/);
  33  | }
  34  | 
  35  | test.describe('Orgs UI — positive', () => {
  36  |     test('member can open accounts page', async ({ page }) => {
  37  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  38  |         await page.goto('/organizations');
  39  |         await page.waitForURL(/\/realms/, { timeout: 10_000 });
  40  |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
  41  |     });
  42  | 
  43  |     test('admin can open accounts page', async ({ page }) => {
  44  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  45  |         await page.goto('/organizations');
  46  |         await page.waitForURL(/\/realms/, { timeout: 10_000 });
  47  |         await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
  48  |     });
  49  | 
  50  |     test('org detail tabs update the URL', async ({ page }) => {
  51  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  52  |         await open_first_org(page);
  53  |         await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10_000 });
  54  |         await page.getByRole('button', { name: 'Members' }).click();
  55  |         await expect(page).toHaveURL(/tab=members/);
  56  |         await page.getByRole('button', { name: 'Scopes' }).click();
  57  |         await expect(page).toHaveURL(/tab=scopes/);
  58  |         await page.getByRole('button', { name: 'Settings' }).click();
  59  |         await expect(page).toHaveURL(/tab=settings/);
  60  |         await expect(page.getByText(/org agent settings/i)).toBeVisible();
  61  |     });
  62  | 
  63  |     // Role CRUD + member assignment use /v1/orgs/*_role and /v1/users/update_role;
  64  |     // delete-with-members 409 is covered in unit/integration (org_role_service + BFF orgs).
  65  |     test('list_roles API returns roles for an org', async ({ page }) => {
  66  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  67  |         const slug = unique_slug('e2e-roles');
  68  |         const created = await expect_api_ok(await api_post(page, '/v1/orgs/new', {
  69  |             slug,
  70  |             display_name: `E2E Roles ${slug}`,
  71  |             admin_username: TEST_ADMIN.username,
  72  |         }));
  73  |         const org = ((created.org ?? created.data) as { id?: number });
  74  |         expect(org?.id).toBeTruthy();
  75  |         const listed = await expect_api_ok(await api_post(page, '/v1/orgs/list_roles', { org_id: org!.id }));
  76  |         const data = (listed.data ?? listed) as { roles?: unknown[] };
  77  |         expect(Array.isArray(data.roles)).toBe(true);
  78  |         expect((data.roles ?? []).length).toBeGreaterThan(0);
  79  |     });
  80  | 
  81  |     test('members filter query is sent in users POST body', async ({ page }) => {
  82  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  83  |         await open_first_org(page);
> 84  |         await page.getByRole('button', { name: 'Members' }).click();
      |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  85  |         await expect(page.getByLabel('Filter members')).toBeVisible({ timeout: 10_000 });
  86  | 
  87  |         const filter_req = page.waitForRequest((req) =>
  88  |             req.url().includes('/v1/users/get')
  89  |             && req.method() === 'POST'
  90  |             && (req.postDataJSON() as { query?: string })?.query === 'no-such-member-xyz',
  91  |         );
  92  |         await page.getByLabel('Filter members').fill('no-such-member-xyz');
  93  |         await page.getByRole('button', { name: /^apply$/i }).click();
  94  |         await filter_req;
  95  |         await expect(page).not.toHaveURL(/[?&]q=/);
  96  |     });
  97  | });
  98  | 
  99  | test.describe('Orgs UI — negative', () => {
  100 |     test('unauthenticated orgs redirects to login', async ({ page }) => {
  101 |         await expect_login_redirect(page, '/organizations');
  102 |     });
  103 | 
  104 |     test('member without org admin role has no add-member control', async ({ page }) => {
  105 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  106 |         const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
  107 |         const data = (listed.data ?? listed) as { orgs?: Array<{ id: number; my_role?: string }> };
  108 |         const orgs = data.orgs ?? [];
  109 |         if (orgs.length === 0) {
  110 |             await page.goto('/organizations');
  111 |             await page.waitForURL(/\/realms/, { timeout: 10_000 });
  112 |             await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
  113 |             return;
  114 |         }
  115 |         const is_admin_role = (role?: string) => {
  116 |             const r = (role ?? '').toLowerCase();
  117 |             return r === 'admin' || r === 'site_admin' || r === 'owner';
  118 |         };
  119 |         const non_admin = orgs.find((o) => o.my_role && !is_admin_role(o.my_role));
  120 |         if (!non_admin) {
  121 |             // Seeded testuser is admin/owner of every org (incl. personal) — nothing to assert.
  122 |             return;
  123 |         }
  124 |         await page.goto(`/orgs/${non_admin.id}`);
  125 |         await page.waitForURL(/\/orgs\/[0-9a-f-]{36}|\d+/i);
  126 |         await page.getByRole('button', { name: 'Members' }).click();
  127 |         // Detail page is source of truth if list role lagged.
  128 |         const role_badge = page.locator('main').getByText(/^(admin|site_admin|owner|member)$/i).first();
  129 |         const badge_text = ((await role_badge.textContent().catch(() => '')) ?? '').trim().toLowerCase();
  130 |         if (is_admin_role(badge_text)) {
  131 |             await expect(page.getByLabel('Filter members').or(page.getByText(/members/i)).first()).toBeVisible();
  132 |             return;
  133 |         }
  134 |         await expect(page.getByRole('button', { name: /^invite$/i })).toHaveCount(0);
  135 |     });
  136 | });
  137 | 
```