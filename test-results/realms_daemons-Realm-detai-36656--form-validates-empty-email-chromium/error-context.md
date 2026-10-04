# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Realm detail — positive >> invite form validates empty email
- Location: e2e/realms_daemons.spec.ts:158:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Realm members' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Realm members' })

```

```yaml
- complementary "Primary":
  - link "CliqHub CliqHub":
    - /url: /home
    - img "CliqHub"
    - text: CliqHub
  - 'button "Switch view (current: testuser › e2e-add-muqwhk2e)"': Viewing realm testuser › e2e-add-muqwhk2e
  - link "Leave realm (view its org)":
    - /url: /home?org=testuser
  - navigation "Main":
    - text: Work
    - link "Overview":
      - /url: /home?org=testuser
    - link "Inbox":
      - /url: /inbox?org=testuser
    - text: Build
    - link "Teams":
      - /url: /teams?org=testuser
    - link "Marketplace":
      - /url: /browse
    - text: Manage
    - link "Notifications":
      - /url: /notifications?org=testuser
    - link "Agents":
      - /url: /agents?org=testuser
    - link "Organization":
      - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
  - text: Realms 10
  - link "No daemons e2e-add-muqwhk2e":
    - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
    - img "No daemons"
    - text: e2e-add-muqwhk2e
  - link "No daemons e2e-usr-muqwhbpt":
    - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
    - img "No daemons"
    - text: e2e-usr-muqwhbpt
  - link "No daemons e2e-tok-muqwh3c3":
    - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
    - img "No daemons"
    - text: e2e-tok-muqwh3c3
  - link "No daemons e2e-tabs-muqwgtdg":
    - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
    - img "No daemons"
    - text: e2e-tabs-muqwgtdg
  - link "No daemons e2e-det-muqwg52d":
    - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
    - img "No daemons"
    - text: e2e-det-muqwg52d
  - link "No daemons e2e-filt-muqwfwkb":
    - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
    - img "No daemons"
    - text: e2e-filt-muqwfwkb
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
    - link "testuser":
      - /url: /home?org=testuser
    - link "e2e-add-muqwhk2e":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
    - text: Settings
  - button "Notifications"
  - button "Refresh"
- main:
  - navigation "Realm sections":
    - img "No daemons"
    - text: no daemons
    - link "Inbox":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
    - link "Runs":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/runs
    - link "Teams":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/teams
    - link "Daemons":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/daemons
    - link "Agents":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/agents
    - link "Settings":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/settings
  - navigation "Settings sections":
    - text: Realm
    - button "General"
    - button "Members 1"
    - button "Access tokens"
    - button "A2A & mesh"
    - text: Set up in Manage
    - link "Agents":
      - /url: /o/testuser/realms/e2e-add-muqwhk2e/agents
    - link "Notifications":
      - /url: /notifications?org=testuser
    - button "Danger zone"
  - heading "Members" [level=2]
  - paragraph: People and service accounts in e2e-add-muqwhk2e. Org owners and admins can always manage this realm.
  - group "Add member":
    - textbox "Find a person":
      - /placeholder: Name, username or email…
    - combobox "Role for new member":
      - option "Admin"
      - option "Operator" [selected]
      - option "Member"
    - button "Add member" [disabled]
  - table:
    - rowgroup:
      - row "Member Realm role":
        - columnheader "Member":
          - button "Member"
        - columnheader "Realm role":
          - button "Realm role"
        - columnheader
    - rowgroup:
      - row "b39d1a56-73e2-4509-9c32-2b5b5f68d80byou admin":
        - cell "b39d1a56-73e2-4509-9c32-2b5b5f68d80byou"
        - cell "admin"
        - cell
  - paragraph: "Admin: change settings, members and rules · Operator: run teams and provide input · Member: view"
```

# Test source

```ts
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
> 161 |         await expect(page.getByRole('heading', { name: 'Realm members' })).toBeVisible({ timeout: 10_000 });
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
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
  178 | 
  179 |     test('duplicate realm slug is rejected', async ({ page }) => {
  180 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  181 | 
  182 |         const slug = unique_slug('e2e-dup');
  183 |         await open_create_realm(page);
  184 |         await page.getByPlaceholder('prod-west').fill(slug);
  185 |         await page.getByPlaceholder('Prod West').fill(`First ${slug}`);
  186 |         await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
  187 |         await page.getByRole('button', { name: /^create & continue$/i }).click();
  188 |         await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
  189 |         await page.getByRole('button', { name: 'Close wizard' }).click();
  190 | 
  191 |         await open_create_realm(page);
  192 |         await page.getByPlaceholder('prod-west').fill(slug);
  193 |         await page.getByPlaceholder('Prod West').fill(`Second ${slug}`);
  194 |         await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
  195 |         await page.getByRole('button', { name: /^create & continue$/i }).click();
  196 |         await expect_alert(page, /already exists/i);
  197 |     });
  198 | });
  199 | 
  200 | test.describe('Daemons — positive / negative', () => {
  201 |     test('daemons page loads for member', async ({ page }) => {
  202 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  203 |         await page.goto('/daemons');
  204 |         await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
  205 |         await expect(page.getByRole('heading', { name: 'Daemons' })).toBeVisible({ timeout: 10_000 });
  206 |         await expect(
  207 |             page.getByText(/no active daemons in this realm/i)
  208 |                 .or(page.locator('ul.grid li').first()),
  209 |         ).toBeVisible({ timeout: 10_000 });
  210 |         await expect(page.getByRole('button', { name: /^refresh$/i })).toBeVisible();
  211 |     });
  212 | 
  213 |     test('list POST includes realm_id when page loads', async ({ page }) => {
  214 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  215 | 
  216 |         const list_req = page.waitForRequest((req) =>
  217 |             req.url().includes('/v1/daemons/get')
  218 |             && req.method() === 'POST'
  219 |             && Boolean((req.postDataJSON() as { realm_id?: string })?.realm_id),
  220 |         );
  221 |         await page.goto('/daemons');
  222 |         await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
  223 |         await list_req;
  224 |     });
  225 | 
  226 |     test('mint token form cancel returns to list', async ({ page }) => {
  227 |         test.setTimeout(60_000);
  228 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  229 |         const realm = await api_create_realm(page, 'e2e-dcancel', 'Cancel');
  230 | 
  231 |         await page.goto(realm_url(realm.org_slug, realm.slug));
  232 |         await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 15_000 });
  233 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
  234 |         await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 15_000 });
  235 |         await page.getByRole('button', { name: /^cancel$/i }).click();
  236 |         await expect(page.getByRole('heading', { name: 'Realm tokens' })).toBeVisible({ timeout: 10_000 });
  237 |         await expect(page).not.toHaveURL(/form=1/);
  238 |     });
  239 | 
  240 |     test('mint without token name shows validation error', async ({ page }) => {
  241 |         test.setTimeout(60_000);
  242 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  243 |         const realm = await api_create_realm(page, 'e2e-mintval', 'Mint');
  244 | 
  245 |         await page.goto(realm_url(realm.org_slug, realm.slug));
  246 |         await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 15_000 });
  247 |         await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
  248 |         await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 15_000 });
  249 |         await page.getByRole('button', { name: /^mint$/i }).click();
  250 |         await expect(page.getByText(/token name is required/i)).toBeVisible({ timeout: 5_000 });
  251 |     });
  252 | 
  253 |     test('unauthenticated daemons redirects to login', async ({ page }) => {
  254 |         await expect_login_redirect(page, '/daemons');
  255 |     });
  256 | 
  257 |     test('dashboard daemon counts match daemons list for the same user', async ({ page }) => {
  258 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  259 |         // DASH-ORG / DAE-ORG invent: body org_id required (never invent from header).
  260 |         const org_id = await api_current_org_id(page);
  261 | 
```