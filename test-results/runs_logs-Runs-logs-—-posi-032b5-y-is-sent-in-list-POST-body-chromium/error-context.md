# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs_logs.spec.ts >> Runs / logs — positive >> runs filter query is sent in list POST body
- Location: e2e/runs_logs.spec.ts:24:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  91  |  */
  92  | export async function api_logout(page: Page): Promise<void> {
  93  |     await page.request.post('/v1/session/delete', { data: {}, headers: JSON_HEADERS });
  94  | }
  95  | 
  96  | /** POST JSON to BFF with session cookies. */
  97  | export async function api_post(
  98  |     page: Page,
  99  |     path: string,
  100 |     data: Record<string, unknown> = {},
  101 | ): Promise<APIResponse> {
  102 |     return page.request.post(path, { data, headers: JSON_HEADERS });
  103 | }
  104 | 
  105 | export async function expect_api_ok(res: APIResponse): Promise<Record<string, unknown>> {
  106 |     const body = await res.json();
  107 |     expect(res.ok(), `expected ok status, got ${res.status()} ${JSON.stringify(body)}`).toBe(true);
  108 |     expect(body.ok).toBe(true);
  109 |     return body as Record<string, unknown>;
  110 | }
  111 | 
  112 | export async function expect_api_denied(res: APIResponse): Promise<void> {
  113 |     expect([401, 403]).toContain(res.status());
  114 | }
  115 | 
  116 | /** Assert protected page redirects unauthenticated users to login. */
  117 | export async function expect_login_redirect(page: Page, path: string): Promise<void> {
  118 |     await page.goto(path);
  119 |     await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10_000 });
  120 |     expect(page.url()).toContain('/login');
  121 | }
  122 | 
  123 | /** Assert non-admin is bounced out of /admin. */
  124 | export async function expect_admin_blocked(page: Page, path: string): Promise<void> {
  125 |     await page.goto(path);
  126 |     await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
  127 |     expect(page.url()).not.toContain('/admin/');
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
> 191 |     expect(realms.length).toBeGreaterThan(0);
      |                           ^ Error: expect(received).toBeGreaterThan(expected)
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
  228 |     await page.getByRole('button', { name: /^create realm$/i }).click();
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