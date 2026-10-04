# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orgs.spec.ts >> Orgs UI — positive >> org detail tabs update the URL
- Location: e2e/orgs.spec.ts:50:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Overview' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Overview' })

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
  - text: Realms 3
  - link "No daemons e2e-filt-muqwbfp4":
    - /url: /o/cliq/realms/e2e-filt-muqwbfp4/inbox
    - img "No daemons"
    - text: e2e-filt-muqwbfp4
  - link "No daemons e2e-slack-muqwaz3n":
    - /url: /o/cliq/realms/e2e-slack-muqwaz3n/inbox
    - img "No daemons"
    - text: e2e-slack-muqwaz3n
  - link "No daemons default":
    - /url: /o/cliq/realms/default/inbox
    - img "No daemons"
    - text: default
  - link "Getting started 1 of 4 done":
    - /url: /getting-started
    - text: Getting started 1 / 4
  - link "Docs":
    - /url: https://docs.getcliq.io
  - button "Admin SITE"
  - button "AD admin @admin · site admin"
- banner:
  - navigation "Breadcrumb":
    - link "All my work":
      - /url: /home
    - text: Organization
  - button "Notifications"
- main:
  - heading "Cliq" [level=1]
  - paragraph: Viewing as CliqHub admin · 1 member · 1 scope
  - link "Realms →":
    - /url: /realms?org=cliq
  - tablist "Organization":
    - tab "Members" [selected]
    - tab "Roles"
    - tab "Scopes"
    - tab "A2A"
    - tab "Settings"
  - group "Filter":
    - button "All 1" [pressed]
    - button "Owners 1"
    - button "Admins 0"
    - button "Pending invites 0"
  - textbox "Filter members"
  - form "Add or invite":
    - textbox "Add or invite":
      - /placeholder: Username (adds now) or email (invites)
    - button "Add" [disabled]
  - table:
    - rowgroup:
      - row "Member Role":
        - columnheader "Member":
          - button "Member"
        - columnheader "Role":
          - button "Role"
        - columnheader
    - rowgroup:
      - row "admin(you) admin@cliqhub.io Owner":
        - cell "admin(you) admin@cliqhub.io"
        - cell "Owner"
        - cell
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
> 53  |         await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10_000 });
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
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
  84  |         await page.getByRole('button', { name: 'Members' }).click();
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