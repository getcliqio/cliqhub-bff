# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teams.spec.ts >> Teams — negative >> builder publish controls require session for member path
- Location: e2e/teams.spec.ts:118:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/what team do you want to build/i).or(getByRole('button', { name: /build my team/i })).or(getByPlaceholder(/development team/i)).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/what team do you want to build/i).or(getByRole('button', { name: /build my team/i })).or(getByPlaceholder(/development team/i)).first()

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
  - text: Realms 4
  - link "No daemons default":
    - /url: /o/e2e-roles-muqwdibk/realms/default/inbox
    - img "No daemons"
    - text: default
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
    - text: New team
  - button "Notifications"
- main:
  - text: ✦ cliq builder
  - heading "What should your team do?" [level=1]
  - paragraph: Describe the job. We’ll design the phases, write every role brief and validate it — then you shape it on the canvas.
  - textbox "Describe your team":
    - /placeholder: e.g. Take a Jira ticket to a reviewed pull request…
  - text: Mention reviews, retries, parallel steps, tools — the more concrete, the better. ⌘↵
  - button "✦ Generate team" [disabled]
  - button "Ticket → PR with sign-off"
  - button "Nightly ledger reconciliation"
  - button "Summarise KYC packets"
  - button "Docs from a Confluence spec"
  - paragraph: Or start another way
  - button "✥ Blank canvas Drag phases onto the canvas and wire them up. Open canvas →"
  - 'button "▤ From a template Proven shapes: gates, pipelines, fan-out. Browse templates →"'
  - link "⑂ Fork a team Start from any team in the Marketplace, then make it yours. Pick a team →":
    - /url: /browse
  - text: ⤓ Import Drop a team.yml here
  - button "Choose file"
  - text: ·
  - button "Paste YAML"
  - paragraph: Templates
  - button "Hello World Simplest possible team — one phase, one agent."
  - button "Gate Review Two phases with a gate — work then approve."
  - button "Linear Pipeline Three sequential phases — plan, build, verify."
  - button "Parallel Fan-Out Fan-out pattern — one phase feeds two parallel branches."
  - button "Sub-Team Recursion A team phase that delegates to another installed team."
  - paragraph: Continue a draft
  - link "e2e-builder-1790941382136 1 phases · @cliq":
    - /url: /builder?draft=d4cfd0e9-f964-4d4e-888f-ebf6946cf334
```

# Test source

```ts
  28  |         const filter_req = page.waitForRequest((req) =>
  29  |             req.url().includes('/v1/teams/get')
  30  |             && req.method() === 'POST'
  31  |             && (req.postDataJSON() as { query?: string })?.query === 'tdd',
  32  |         );
  33  |         await page.getByPlaceholder(BROWSE_SEARCH).fill('tdd');
  34  |         await page.getByRole('button', { name: /^search$/i }).click();
  35  |         await filter_req;
  36  |         await expect(
  37  |             page.getByText(/results for.+tdd/i).or(page.getByText(/no teams/i)).first(),
  38  |         ).toBeVisible({ timeout: 10_000 });
  39  |     });
  40  | 
  41  |     test('authenticated user can open my teams', async ({ page }) => {
  42  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  43  |         await page.goto('/teams');
  44  |         await expect(page.getByRole('heading', { name: /^teams$/i })).toBeVisible({ timeout: 10_000 });
  45  |         await expect(page.getByRole('link', { name: /build a team/i })).toBeVisible();
  46  |         await expect(page.getByLabel('Search teams')).toBeVisible();
  47  |     });
  48  | 
  49  |     test('my teams filter query is sent in list POST body', async ({ page }) => {
  50  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  51  |         await page.goto('/teams');
  52  |         await expect(page.getByLabel('Search teams')).toBeVisible({ timeout: 10_000 });
  53  | 
  54  |         const filter_req = page.waitForRequest((req) =>
  55  |             req.url().includes('/v1/teams/get')
  56  |             && req.method() === 'POST'
  57  |             && (req.postDataJSON() as { query?: string; mine?: boolean })?.query === 'no-such-team-xyz'
  58  |             && (req.postDataJSON() as { mine?: boolean })?.mine === true,
  59  |         );
  60  |         await page.getByLabel('Search teams').fill('no-such-team-xyz');
  61  |         await filter_req;
  62  |     });
  63  | 
  64  |     test('scopes page loads with filter', async ({ page }) => {
  65  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  66  |         await page.goto('/scopes');
  67  |         await expect(page.getByRole('heading', { name: 'Scopes' })).toBeVisible({ timeout: 10_000 });
  68  |         await expect(page.getByLabel('Filter scopes')).toBeVisible();
  69  |     });
  70  | 
  71  |     test('scopes filter query is sent in list POST body', async ({ page }) => {
  72  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  73  |         await page.goto('/scopes');
  74  |         await expect(page.getByLabel('Filter scopes')).toBeVisible({ timeout: 10_000 });
  75  | 
  76  |         const filter_req = page.waitForRequest((req) =>
  77  |             req.url().includes('/v1/scopes/get')
  78  |             && req.method() === 'POST'
  79  |             && (req.postDataJSON() as { query?: string; mine?: boolean })?.query === 'no-such-scope-xyz'
  80  |             && (req.postDataJSON() as { mine?: boolean })?.mine === true,
  81  |         );
  82  |         await page.getByLabel('Filter scopes').fill('no-such-scope-xyz');
  83  |         await page.getByRole('button', { name: /^apply$/i }).click();
  84  |         await filter_req;
  85  |         await expect(page).not.toHaveURL(/[?&]q=/);
  86  |         await expect(page.getByText(/no scopes match this filter/i)).toBeVisible({ timeout: 10_000 });
  87  |     });
  88  | 
  89  |     test('team detail opens from browse when teams exist', async ({ page }) => {
  90  |         await page.goto('/browse');
  91  |         await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible({ timeout: 15_000 });
  92  |         const first_team = page.locator('a:has(h3)').first();
  93  |         await expect(first_team).toBeVisible({ timeout: 15_000 });
  94  |         await first_team.click();
  95  |         await page.waitForURL(/\/browse\/[^/]+\/[^/]+/);
  96  |         await expect(page.getByText(/install|download|version/i).first()).toBeVisible({ timeout: 10_000 });
  97  |     });
  98  | });
  99  | 
  100 | test.describe('Teams — negative', () => {
  101 |     test('my teams requires authentication', async ({ page }) => {
  102 |         await expect_login_redirect(page, '/teams');
  103 |     });
  104 | 
  105 |     test('account team detail requires authentication', async ({ page }) => {
  106 |         await expect_login_redirect(page, '/teams/cliq/example');
  107 |     });
  108 | 
  109 |     test('empty search keyword still renders browse shell', async ({ page }) => {
  110 |         await page.goto('/browse');
  111 |         await page.getByPlaceholder(BROWSE_SEARCH).fill('zzz-no-match-e2e-xyz');
  112 |         await page.getByRole('button', { name: /^search$/i }).click();
  113 |         await expect(
  114 |             page.getByText(/no teams|results for|0 teams/i).first(),
  115 |         ).toBeVisible({ timeout: 10_000 });
  116 |     });
  117 | 
  118 |     test('builder publish controls require session for member path', async ({ page }) => {
  119 |         await page.goto('/builder');
  120 |         await expect(page.locator('body')).toBeVisible();
  121 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  122 |         await page.goto('/builder');
  123 |         await expect(
  124 |             page.getByText(/what team do you want to build/i)
  125 |                 .or(page.getByRole('button', { name: /build my team/i }))
  126 |                 .or(page.getByPlaceholder(/development team/i))
  127 |                 .first(),
> 128 |         ).toBeVisible({ timeout: 10_000 });
      |           ^ Error: expect(locator).toBeVisible() failed
  129 |     });
  130 | });
  131 | 
```