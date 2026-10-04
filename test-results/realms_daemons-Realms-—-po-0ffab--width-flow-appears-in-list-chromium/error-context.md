# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Realms — positive >> create realm full-width flow appears in list
- Location: e2e/realms_daemons.spec.ts:27:5

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
        - generic [ref=e73]: "4"
      - link "No daemons e2e-notif-muqwc55t" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-notif-muqwc55t
      - link "No daemons e2e-noch-muqwbwhw" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-noch-muqwbwhw
      - link "No daemons e2e-ch-muqwaqs7" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-ch-muqwaqs7
      - link "No daemons default" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/default/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
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
      - button "TE testuser @testuser" [ref=e103] [cursor=pointer]:
        - generic [ref=e104]: TE
        - generic [ref=e105]:
          - generic [ref=e106]: testuser
          - generic [ref=e107]: "@testuser"
  - generic [ref=e112]:
    - banner [ref=e113]:
      - navigation "Breadcrumb" [ref=e114]:
        - link "All my work" [ref=e116] [cursor=pointer]:
          - /url: /home
        - generic [ref=e122]: Realms
      - button "Notifications" [ref=e125] [cursor=pointer]
    - main [ref=e129]:
      - generic [ref=e130]:
        - generic [ref=e131]:
          - generic [ref=e132]:
            - heading "Realms" [level=1] [ref=e133]
            - paragraph [ref=e134]: Groups of machines that run your teams. 4 realms across 1 organization.
          - button "New realm" [ref=e135] [cursor=pointer]
        - textbox "Search realms" [ref=e142]
        - region "testuser" [ref=e143]:
          - generic [ref=e144]:
            - heading "testuser" [level=2] [ref=e145]
            - generic [ref=e146]: admin
            - link "Manage org →" [ref=e147] [cursor=pointer]:
              - /url: /orgs/6ecab195-3328-467b-9a44-6dd6e32b3fc3
          - generic [ref=e148]:
            - link "Notif e2e-notif-muqwc55t e2e-notif-muqwc55t no daemons Active 2m ago" [ref=e149] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
              - generic [ref=e150]:
                - generic [ref=e151]: Notif e2e-notif-muqwc55t
                - generic [ref=e152]: e2e-notif-muqwc55t
              - generic [ref=e153]: no daemons
              - generic [ref=e154]: Active 2m ago
            - link "Notify e2e-noch-muqwbwhw e2e-noch-muqwbwhw no daemons Active 2m ago" [ref=e156] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-noch-muqwbwhw/inbox
              - generic [ref=e157]:
                - generic [ref=e158]: Notify e2e-noch-muqwbwhw
                - generic [ref=e159]: e2e-noch-muqwbwhw
              - generic [ref=e160]: no daemons
              - generic [ref=e161]: Active 2m ago
            - link "Notify e2e-ch-muqwaqs7 e2e-ch-muqwaqs7 no daemons Active 3m ago" [ref=e163] [cursor=pointer]:
              - /url: /o/testuser/realms/e2e-ch-muqwaqs7/inbox
              - generic [ref=e164]:
                - generic [ref=e165]: Notify e2e-ch-muqwaqs7
                - generic [ref=e166]: e2e-ch-muqwaqs7
              - generic [ref=e167]: no daemons
              - generic [ref=e168]: Active 3m ago
            - link "default default no daemons Active 14m ago" [ref=e170] [cursor=pointer]:
              - /url: /o/testuser/realms/default/inbox
              - generic [ref=e171]:
                - generic [ref=e172]: default
                - generic [ref=e173]: default
              - generic [ref=e174]: no daemons
              - generic [ref=e175]: Active 14m ago
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