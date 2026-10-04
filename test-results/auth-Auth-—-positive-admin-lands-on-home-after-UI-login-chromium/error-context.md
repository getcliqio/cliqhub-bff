# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth — positive >> admin lands on /home after UI login
- Location: e2e/auth.spec.ts:21:5

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input value="" required="" id="password" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-[10px] border border-[var(--g-line)] bg-[var(--g-panel)] px-3.5 text-[14px] text-[var(--g-ink)] outline-none transition placeholder:text-[var(--g-ink-3)] focus:border-[var(--g-acc-line)] focus:ring-4 focus:ring-[var(--g-acc-soft)] aria-[invalid=true]:border-[var(--g-bad-line)] pr-11"/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-pressed="false" aria-label="Show password" class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[var(--g-ink-3)] hover:bg-[var(--g-hover)] hover:text-[var(--g-ink)]">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - region "About CliqHub" [ref=e4]:
    - link [ref=e5] [cursor=pointer]:
      - /url: /
      - img "CliqHub" [ref=e6]
      - text: CliqHub
    - generic [ref=e13]:
      - heading "Ready-made AI teams. Your requirements. Your machines." [level=1] [ref=e14]: Ready-made AI teams.Your requirements.Your machines.
      - paragraph [ref=e15]: Run multi-agent teams on your own daemons, with human review where it matters and a full record of every phase.
      - list "Example team" [ref=e16]:
        - listitem [ref=e17]:
          - generic [ref=e18]: architect
        - listitem [ref=e22]:
          - generic [ref=e23]: review
        - listitem [ref=e27]:
          - generic [ref=e28]: implement
        - listitem [ref=e32]:
          - generic [ref=e33]: check
        - listitem [ref=e37]:
          - generic [ref=e38]: pr
    - list [ref=e40]:
      - listitem [ref=e41]:
        - generic [ref=e42]: —
        - text: "See every run live: phases, gates, cost."
      - listitem [ref=e43]:
        - generic [ref=e44]: —
        - text: Approve, send back or reject from one inbox.
      - listitem [ref=e45]:
        - generic [ref=e46]: —
        - text: Your code and keys stay on your daemons.
  - main [ref=e47]:
    - generic [ref=e49]:
      - heading "Sign in" [level=2] [ref=e50]
      - paragraph [ref=e51]: Welcome back. Use your CliqHub username.
      - generic [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]: Username
          - textbox "Username" [active] [ref=e55]: admin
        - generic [ref=e56]:
          - generic [ref=e57]: Password
          - generic [ref=e58]:
            - textbox "Password" [ref=e59]
            - button "Show password" [ref=e60] [cursor=pointer]
        - button "Sign in" [disabled] [ref=e64] [cursor=pointer]
      - paragraph [ref=e65]: Need access? Ask a CliqHub admin for an invite.
      - generic [ref=e66]:
        - generic [ref=e69]:
          - text: Using the CLI? Run
          - code [ref=e70]: cliq login
        - link "Docs" [ref=e71] [cursor=pointer]:
          - /url: https://docs.getcliq.io
```

# Test source

```ts
  1   | import { type APIResponse, type Page, expect } from '@playwright/test';
  2   | import { randomUUID } from 'node:crypto';
  3   | 
  4   | /** Same credentials as scripts/seed_admin.mjs, so e2e runs do not reset the local admin password. */
  5   | export const TEST_ADMIN = {
  6   |     username: 'admin',
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
> 50  |     await page.getByLabel('Password').fill(password);
      |                                       ^ Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
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
```