# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Daemons — positive / negative >> list POST includes realm_id when page loads
- Location: e2e/realms_daemons.spec.ts:213:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3010/realms"
============================================================
```

```
Error: page.waitForRequest: Test ended.
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
        - generic [ref=e73]: "10"
      - link "No daemons e2e-add-muqwhk2e" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-add-muqwhk2e
      - link "No daemons e2e-usr-muqwhbpt" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-usr-muqwhbpt
      - link "No daemons e2e-tok-muqwh3c3" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-tok-muqwh3c3
      - link "No daemons e2e-tabs-muqwgtdg" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
        - generic [ref=e89]: e2e-tabs-muqwgtdg
      - link "No daemons e2e-det-muqwg52d" [ref=e90] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
        - img "No daemons" [ref=e91]
        - generic [ref=e92]: TE
        - generic [ref=e93]: e2e-det-muqwg52d
      - link "No daemons e2e-filt-muqwfwkb" [ref=e94] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
        - img "No daemons" [ref=e95]
        - generic [ref=e96]: TE
        - generic [ref=e97]: e2e-filt-muqwfwkb
      - link "No daemons e2e-notif-muqwc55t" [ref=e98] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e99]
        - generic [ref=e100]: TE
        - generic [ref=e101]: e2e-notif-muqwc55t
      - link "No daemons e2e-noch-muqwbwhw" [ref=e102] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
        - img "No daemons" [ref=e103]
        - generic [ref=e104]: TE
        - generic [ref=e105]: e2e-noch-muqwbwhw
      - link "No daemons e2e-ch-muqwaqs7" [ref=e106] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
        - img "No daemons" [ref=e107]
        - generic [ref=e108]: TE
        - generic [ref=e109]: e2e-ch-muqwaqs7
      - link "No daemons default" [ref=e110] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=e111]
        - generic [ref=e112]: TE
        - generic [ref=e113]: default
    - generic [ref=e114]:
      - link "Getting started 1 of 4 done" [ref=e115] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=e121]: 1 / 4
      - link "Docs" [ref=e122] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e125]: ↗
      - button "TE testuser @testuser" [ref=e127] [cursor=pointer]:
        - generic [ref=e128]: TE
        - generic [ref=e129]:
          - generic [ref=e130]: testuser
          - generic [ref=e131]: "@testuser"
  - generic [ref=e136]:
    - banner [ref=e137]:
      - navigation "Breadcrumb" [ref=e138]:
        - link "All my work" [ref=e140] [cursor=pointer]:
          - /url: /home
        - generic [ref=e146]: Realms
      - button "Notifications" [ref=e149] [cursor=pointer]
    - main [ref=e153]:
      - generic [ref=e154]:
        - generic [ref=e155]:
          - generic [ref=e156]:
            - heading "Realms" [level=1] [ref=e157]
            - paragraph [ref=e158]: Groups of machines that run your teams. 10 realms across 1 organization.
          - button "New realm" [ref=e159] [cursor=pointer]
        - textbox "Search realms" [ref=e166]
        - region "testuser" [ref=e167]:
          - generic [ref=e168]:
            - heading "testuser" [level=2] [ref=e169]
            - generic [ref=e170]: admin
            - link "Manage org →" [ref=e171] [cursor=pointer]:
              - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
          - generic [ref=e172]:
            - link "Detail e2e-add-muqwhk2e e2e-add-muqwhk2e no daemons Active 1m ago" [ref=e173] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
              - generic [ref=e174]:
                - generic [ref=e175]: Detail e2e-add-muqwhk2e
                - generic [ref=e176]: e2e-add-muqwhk2e
              - generic [ref=e177]: no daemons
              - generic [ref=e178]: Active 1m ago
            - link "Detail e2e-usr-muqwhbpt e2e-usr-muqwhbpt no daemons Active 2m ago" [ref=e180] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
              - generic [ref=e181]:
                - generic [ref=e182]: Detail e2e-usr-muqwhbpt
                - generic [ref=e183]: e2e-usr-muqwhbpt
              - generic [ref=e184]: no daemons
              - generic [ref=e185]: Active 2m ago
            - link "Detail e2e-tok-muqwh3c3 e2e-tok-muqwh3c3 no daemons Active 2m ago" [ref=e187] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
              - generic [ref=e188]:
                - generic [ref=e189]: Detail e2e-tok-muqwh3c3
                - generic [ref=e190]: e2e-tok-muqwh3c3
              - generic [ref=e191]: no daemons
              - generic [ref=e192]: Active 2m ago
            - link "Detail e2e-tabs-muqwgtdg e2e-tabs-muqwgtdg no daemons Active 2m ago" [ref=e194] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
              - generic [ref=e195]:
                - generic [ref=e196]: Detail e2e-tabs-muqwgtdg
                - generic [ref=e197]: e2e-tabs-muqwgtdg
              - generic [ref=e198]: no daemons
              - generic [ref=e199]: Active 2m ago
            - link "Detail e2e-det-muqwg52d e2e-det-muqwg52d no daemons Active 2m ago" [ref=e201] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
              - generic [ref=e202]:
                - generic [ref=e203]: Detail e2e-det-muqwg52d
                - generic [ref=e204]: e2e-det-muqwg52d
              - generic [ref=e205]: no daemons
              - generic [ref=e206]: Active 2m ago
            - link "Filter Target e2e-filt-muqwfwkb e2e-filt-muqwfwkb no daemons Active 3m ago" [ref=e208] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
              - generic [ref=e209]:
                - generic [ref=e210]: Filter Target e2e-filt-muqwfwkb
                - generic [ref=e211]: e2e-filt-muqwfwkb
              - generic [ref=e212]: no daemons
              - generic [ref=e213]: Active 3m ago
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 6m ago" [ref=e215] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=e216]:
                - generic [ref=e217]: Notif e2e-notif-muqwc55t
                - generic [ref=e218]: e2e-notif-muqwc55t
              - generic [ref=e219]: no daemons
              - generic [ref=e220]: Active 6m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 6m ago" [ref=e222] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=e223]:
                - generic [ref=e224]: Notify e2e-noch-muqwbwhw
                - generic [ref=e225]: e2e-noch-muqwbwhw
              - generic [ref=e226]: no daemons
              - generic [ref=e227]: Active 6m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 7m ago" [ref=e229] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=e230]:
                - generic [ref=e231]: Notify e2e-ch-muqwaqs7
                - generic [ref=e232]: e2e-ch-muqwaqs7
              - generic [ref=e233]: no daemons
              - generic [ref=e234]: Active 7m ago
            - link "default default no daemons Active 17m ago" [ref=e236] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=e237]:
                - generic [ref=e238]: default
                - generic [ref=e239]: default
              - generic [ref=e240]: no daemons
              - generic [ref=e241]: Active 17m ago
```

# Test source

```ts
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
> 216 |         const list_req = page.waitForRequest((req) =>
      |                               ^ Error: page.waitForRequest: Test ended.
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