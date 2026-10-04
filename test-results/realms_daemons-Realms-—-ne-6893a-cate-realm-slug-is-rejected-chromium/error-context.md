# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Realms — negative >> duplicate realm slug is rejected
- Location: e2e/realms_daemons.spec.ts:179:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^create realm$/i })

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
            - link "Detail e2e-add-muqwhk2e e2e-add-muqwhk2e no daemons Active just now" [ref=e173] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
              - generic [ref=e174]:
                - generic [ref=e175]: Detail e2e-add-muqwhk2e
                - generic [ref=e176]: e2e-add-muqwhk2e
              - generic [ref=e177]: no daemons
              - generic [ref=e178]: Active just now
            - link "Detail e2e-usr-muqwhbpt e2e-usr-muqwhbpt no daemons Active just now" [ref=e180] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
              - generic [ref=e181]:
                - generic [ref=e182]: Detail e2e-usr-muqwhbpt
                - generic [ref=e183]: e2e-usr-muqwhbpt
              - generic [ref=e184]: no daemons
              - generic [ref=e185]: Active just now
            - link "Detail e2e-tok-muqwh3c3 e2e-tok-muqwh3c3 no daemons Active 1m ago" [ref=e187] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
              - generic [ref=e188]:
                - generic [ref=e189]: Detail e2e-tok-muqwh3c3
                - generic [ref=e190]: e2e-tok-muqwh3c3
              - generic [ref=e191]: no daemons
              - generic [ref=e192]: Active 1m ago
            - link "Detail e2e-tabs-muqwgtdg e2e-tabs-muqwgtdg no daemons Active 1m ago" [ref=e194] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
              - generic [ref=e195]:
                - generic [ref=e196]: Detail e2e-tabs-muqwgtdg
                - generic [ref=e197]: e2e-tabs-muqwgtdg
              - generic [ref=e198]: no daemons
              - generic [ref=e199]: Active 1m ago
            - link "Detail e2e-det-muqwg52d e2e-det-muqwg52d no daemons Active 2m ago" [ref=e201] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
              - generic [ref=e202]:
                - generic [ref=e203]: Detail e2e-det-muqwg52d
                - generic [ref=e204]: e2e-det-muqwg52d
              - generic [ref=e205]: no daemons
              - generic [ref=e206]: Active 2m ago
            - link "Filter Target e2e-filt-muqwfwkb e2e-filt-muqwfwkb no daemons Active 2m ago" [ref=e208] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
              - generic [ref=e209]:
                - generic [ref=e210]: Filter Target e2e-filt-muqwfwkb
                - generic [ref=e211]: e2e-filt-muqwfwkb
              - generic [ref=e212]: no daemons
              - generic [ref=e213]: Active 2m ago
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 5m ago" [ref=e215] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=e216]:
                - generic [ref=e217]: Notif e2e-notif-muqwc55t
                - generic [ref=e218]: e2e-notif-muqwc55t
              - generic [ref=e219]: no daemons
              - generic [ref=e220]: Active 5m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 5m ago" [ref=e222] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=e223]:
                - generic [ref=e224]: Notify e2e-noch-muqwbwhw
                - generic [ref=e225]: e2e-noch-muqwbwhw
              - generic [ref=e226]: no daemons
              - generic [ref=e227]: Active 5m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 6m ago" [ref=e229] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=e230]:
                - generic [ref=e231]: Notify e2e-ch-muqwaqs7
                - generic [ref=e232]: e2e-ch-muqwaqs7
              - generic [ref=e233]: no daemons
              - generic [ref=e234]: Active 6m ago
            - link "default default no daemons Active 16m ago" [ref=e236] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=e237]:
                - generic [ref=e238]: default
                - generic [ref=e239]: default
              - generic [ref=e240]: no daemons
              - generic [ref=e241]: Active 16m ago
```

# Test source

```ts
  128 | }
  129 | 
  130 | /**
  131 |  * Assert that a role="alert" banner is visible with the given text.
  132 |  */
  133 | export async function expect_alert(page: Page, text: string | RegExp): Promise<void> {
  134 |     const alert = page.getByRole('alert');
  135 |     await expect(alert).toBeVisible({ timeout: 5_000 });
  136 |     await expect(alert).toContainText(text);
  137 | }
  138 | 
  139 | /**
  140 |  * Assert that no role="alert" banner is visible.
  141 |  */
  142 | export async function expect_no_alert(page: Page): Promise<void> {
  143 |     await expect(page.getByRole('alert')).not.toBeVisible();
  144 | }
  145 | 
  146 | /** Input immediately after a label sibling (no htmlFor). Exact label text. */
  147 | export function labeled_input(page: Page, label: string) {
  148 |     return page.locator(`xpath=//label[normalize-space()=${JSON.stringify(label)}]/following-sibling::input[1]`);
  149 | }
  150 | 
  151 | /** Current user's first org UUID (body org_id for realms/create). */
  152 | export async function api_current_org_id(page: Page): Promise<string> {
  153 |     const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
  154 |     const data = (listed.data ?? listed) as { orgs?: Array<{ id?: string | number }> };
  155 |     const orgs = data.orgs ?? [];
  156 |     expect(orgs.length, `expected at least one org: ${JSON.stringify(listed)}`).toBeGreaterThan(0);
  157 |     expect(orgs[0]?.id, `org id missing: ${JSON.stringify(listed)}`).toBeTruthy();
  158 |     return String(orgs[0]!.id);
  159 | }
  160 | 
  161 | /** Create a realm via API; returns id/slug/org_slug/name. */
  162 | export async function api_create_realm(
  163 |     page: Page,
  164 |     prefix: string,
  165 |     name_prefix = 'E2E',
  166 | ): Promise<Realm_ref> {
  167 |     const slug = unique_slug(prefix);
  168 |     const name = `${name_prefix} ${slug}`;
  169 |     const org_id = await api_current_org_id(page);
  170 |     const created = await expect_api_ok(await api_post(page, '/v1/realms/create', {
  171 |         org_id,
  172 |         slug,
  173 |         name,
  174 |     }));
  175 |     const realm = (created.realm ?? created.data) as Partial<Realm_ref> | undefined;
  176 |     expect(realm?.id, `realm id missing: ${JSON.stringify(created)}`).toBeTruthy();
  177 |     expect(realm?.slug, `realm slug missing: ${JSON.stringify(created)}`).toBeTruthy();
  178 |     expect(realm?.org_slug, `realm org_slug missing: ${JSON.stringify(created)}`).toBeTruthy();
  179 |     return {
  180 |         id: String(realm!.id),
  181 |         slug: String(realm!.slug),
  182 |         org_slug: String(realm!.org_slug),
  183 |         name: String(realm!.name ?? name),
  184 |     };
  185 | }
  186 | 
  187 | /** First realm from list API (for default-realm navigation). */
  188 | export async function api_first_realm(page: Page): Promise<Realm_ref> {
  189 |     const body = await expect_api_ok(await api_post(page, '/v1/realms/get', {}));
  190 |     const realms = (body.realms ?? []) as Array<Partial<Realm_ref>>;
  191 |     expect(realms.length).toBeGreaterThan(0);
  192 |     const realm = realms[0];
  193 |     expect(realm.slug).toBeTruthy();
  194 |     expect(realm.org_slug).toBeTruthy();
  195 |     return {
  196 |         id: String(realm.id ?? ''),
  197 |         slug: String(realm.slug),
  198 |         org_slug: String(realm.org_slug),
  199 |         name: String(realm.name ?? realm.slug),
  200 |     };
  201 | }
  202 | 
  203 | /** Fresh tx_id for /v1/events/submit (inbound dedup middleware). */
  204 | export function new_tx_id(): string {
  205 |     return randomUUID();
  206 | }
  207 | 
  208 | /** Wait until OrgProvider has hydrated `cliqhub_current_org_id` (body org_id SoT). */
  209 | export async function wait_for_active_org(page: Page): Promise<void> {
  210 |     await page.waitForFunction(
  211 |         () => {
  212 |             try {
  213 |                 const id = globalThis.localStorage?.getItem('cliqhub_current_org_id');
  214 |                 return Boolean(id && id.length > 0);
  215 |             } catch {
  216 |                 return false;
  217 |             }
  218 |         },
  219 |         { timeout: 15_000 },
  220 |     );
  221 | }
  222 | 
  223 | /** Open the create-realm wizard from /realms. */
  224 | export async function open_create_realm(page: Page): Promise<void> {
  225 |     await page.goto('/realms');
  226 |     await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
  227 |     await wait_for_active_org(page);
> 228 |     await page.getByRole('button', { name: /^create realm$/i }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  229 |     await expect(page.getByRole('heading', { name: 'Create realm' })).toBeVisible({ timeout: 5_000 });
  230 |     await expect(page).toHaveURL(/create=1/);
  231 |     // Create is disabled until current_id is set.
  232 |     await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
  233 | }
  234 | 
  235 | /**
  236 |  * Fill identity step and create the realm, then skip optional wizard steps
  237 |  * so the app lands on the new realm detail page.
  238 |  */
  239 | export async function submit_create_realm(
  240 |     page: Page,
  241 |     slug: string,
  242 |     name: string,
  243 | ): Promise<void> {
  244 |     await page.getByPlaceholder('prod-west').fill(slug);
  245 |     await page.getByPlaceholder('Prod West').fill(name);
  246 |     await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
  247 |     await page.getByRole('button', { name: /^create & continue$/i }).click();
  248 | 
  249 |     await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
  250 |     await page.getByRole('button', { name: /^skip$/i }).click();
  251 | 
  252 |     await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
  253 |     await page.getByRole('button', { name: /^skip$/i }).click();
  254 | 
  255 |     const finish = page.getByRole('button', { name: /skip & finish/i });
  256 |     await expect(finish).toBeVisible({ timeout: 10_000 });
  257 |     await finish.click();
  258 |     await page.waitForURL(/\/o\/[^/]+\/realms\/[^/?]+/, { timeout: 15_000 });
  259 | }
  260 | 
```