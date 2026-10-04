# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realms_daemons.spec.ts >> Daemons — positive / negative >> dashboard daemon counts match daemons list for the same user
- Location: e2e/realms_daemons.spec.ts:257:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  262 |         const summary_res = await page.request.post('/v1/dashboard/summary', {
  263 |             headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  264 |             data: { org_id },
  265 |         });
> 266 |         expect(summary_res.ok()).toBe(true);
      |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
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