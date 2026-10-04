# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: telemetry_envelope.spec.ts >> Telemetry envelope — positive >> get_telemetry usage returns data.run / data.phases
- Location: e2e/telemetry_envelope.spec.ts:39:5

# Error details

```
Error: expected ok status, got 404 {"ok":false,"error":{"code":"not_found","message":"Not found"}}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  7   |     password: 'admin@123',
  8   | };
  9   | 
  10  | export const TEST_USER = {
  11  |     username: 'testuser',
  12  |     password: 'testpass123!',
  13  | };
  14  | 
  15  | export const TEST_SUSPENDED = {
  16  |     username: 'suspended_user',
  17  |     password: 'any-password',
  18  | };
  19  | 
  20  | const JSON_HEADERS = {
  21  |     'Content-Type': 'application/json',
  22  |     'X-Requested-With': 'XMLHttpRequest',
  23  | };
  24  | 
  25  | export type Realm_ref = {
  26  |     id: string;
  27  |     slug: string;
  28  |     org_slug: string;
  29  |     name: string;
  30  | };
  31  | 
  32  | /** Unique slug for create flows (lowercase alphanumeric + hyphens). */
  33  | export function unique_slug(prefix: string): string {
  34  |     return `${prefix}-${Date.now().toString(36)}`.slice(0, 40);
  35  | }
  36  | 
  37  | /** Canonical org-scoped realm URL. */
  38  | export function realm_url(org_slug: string, realm_slug: string, sub = ''): string {
  39  |     const base = `/o/${org_slug}/realms/${realm_slug}`;
  40  |     return sub ? `${base}/${sub.replace(/^\//, '')}` : base;
  41  | }
  42  | 
  43  | /**
  44  |  * Log in via the UI login form and wait for navigation.
  45  |  */
  46  | export async function ui_login(page: Page, username: string, password: string): Promise<void> {
  47  |     await page.goto('/login');
  48  |     await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  49  |     await page.getByLabel('Username').fill(username);
  50  |     await page.getByLabel('Password').fill(password);
  51  |     await page.getByRole('button', { name: 'Sign in' }).click();
  52  |     await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
  53  | }
  54  | 
  55  | /**
  56  |  * Log in via BFF session create through the Vite proxy (same origin as the SPA).
  57  |  */
  58  | export async function api_login(page: Page, username: string, password: string): Promise<void> {
  59  |     const response = await page.request.post('/v1/session/create', {
  60  |         data: { username, password },
  61  |         headers: JSON_HEADERS,
  62  |     });
  63  |     expect(response.ok(), `session create failed for ${username}: ${response.status()}`).toBe(true);
  64  | }
  65  | 
  66  | /**
  67  |  * Current session identity via BFF session get.
  68  |  */
  69  | export async function api_session_get(page: Page): Promise<APIResponse> {
  70  |     return page.request.post('/v1/session/get', {
  71  |         data: {},
  72  |         headers: JSON_HEADERS,
  73  |     });
  74  | }
  75  | 
  76  | /**
  77  |  * Act-as (or exit with null) via BFF session update.
  78  |  */
  79  | export async function api_act_as(
  80  |     page: Page,
  81  |     act_as_user_id: number | null,
  82  | ): Promise<APIResponse> {
  83  |     return page.request.post('/v1/session/update', {
  84  |         data: { act_as_user_id },
  85  |         headers: JSON_HEADERS,
  86  |     });
  87  | }
  88  | 
  89  | /**
  90  |  * Log out via BFF session delete.
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
> 107 |     expect(res.ok(), `expected ok status, got ${res.status()} ${JSON.stringify(body)}`).toBe(true);
      |                                                                                         ^ Error: expected ok status, got 404 {"ok":false,"error":{"code":"not_found","message":"Not found"}}
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
```