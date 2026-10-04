# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Daemons — positive / negative >> mint without token name shows validation error
- Location: e2e/realms_daemons.spec.ts:240:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Mint e2e-mintval-muqwjw7r' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: 'Mint e2e-mintval-muqwjw7r' })

```

```yaml
- complementary "Primary":
  - link "CliqHub CliqHub":
    - /url: /home
    - img "CliqHub"
    - text: CliqHub
  - 'button "Switch view (current: testuser › e2e-mintval-muqwjw7r)"': Viewing realm testuser › e2e-mintval-muqwjw7r
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
  - text: Realms 12
  - link "No daemons e2e-mintval-muqwjw7r":
    - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
    - img "No daemons"
    - text: e2e-mintval-muqwjw7r
  - link "No daemons e2e-dcancel-muqwjk0c":
    - /url: /o/testuser/realms/e2e-dcancel-muqwjk0c/inbox
    - img "No daemons"
    - text: e2e-dcancel-muqwjk0c
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
  - link "All 12 realms →":
    - /url: /realms
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
    - link "e2e-mintval-muqwjw7r":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
    - text: Inbox
  - button "Notifications"
  - button "Refresh"
- main:
  - navigation "Realm sections":
    - img "No daemons"
    - text: no daemons
    - link "Inbox":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
    - link "Runs":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/runs
    - link "Teams":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/teams
    - link "Daemons":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/daemons
    - link "Agents":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/agents
    - link "Settings":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/settings
  - heading "Inbox" [level=1]
  - paragraph: What needs a person in Mint e2e-mintval-muqwjw7r — reviews, input requests and failures from the last 24 hours.
  - button "Reviews 0"
  - button "Needs input 0"
  - button "Failed · 24h 0"
  - text: Running 0
  - region "Needs attention":
    - heading "Needs attention" [level=2]
    - tablist "Filter inbox":
      - tab "All 0" [selected]
      - tab "Reviews 0"
      - tab "Input 0"
      - tab "Failed 0"
    - paragraph: Inbox zero
    - paragraph: No reviews, input requests or recent failures in this realm.
  - region "Running now":
    - heading "Running now" [level=2]
    - link "All runs →":
      - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/runs
    - paragraph: Nothing is running right now.
```

# Test source

```ts
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
> 246 |         await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 15_000 });
      |                                                                       ^ Error: expect(locator).toBeVisible() failed
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
  262 |         const summary_res = await page.request.post('/v1/dashboard/summary', {
  263 |             headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  264 |             data: { org_id },
  265 |         });
  266 |         expect(summary_res.ok()).toBe(true);
  267 |         const summary = await summary_res.json();
  268 |         expect(summary.ok).toBe(true);
  269 | 
  270 |         const list_res = await page.request.post('/v1/daemons/get', {
  271 |             headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  272 |             data: { org_id },
  273 |         });
  274 |         expect(list_res.ok()).toBe(true);
  275 |         const list = await list_res.json();
  276 |         expect(list.ok).toBe(true);
  277 | 
  278 |         const listed = (list.daemons ?? []) as Array<{ status?: string }>;
  279 |         const online = listed.filter((d) => d.status === 'online').length;
  280 |         expect(summary.counts.daemons_total).toBe(listed.length);
  281 |         expect(summary.counts.daemons_online).toBe(online);
  282 |     });
  283 | });
  284 | 
```