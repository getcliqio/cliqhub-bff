# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: builder_unified.spec.ts >> Builder — positive >> builder spark view loads for admin
- Location: e2e/builder_unified.spec.ts:42:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /build a team/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: /build a team/i })

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
  - text: Realms 1
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
  - paragraph: No drafts yet — anything you start here autosaves.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { api_login, api_post, expect_api_ok, TEST_ADMIN, TEST_USER } from './helpers';
  3  | 
  4  | const MINIMAL_TEAM = {
  5  |     name: 'e2e-builder-team',
  6  |     description: 'E2E builder canvas fixture',
  7  |     phases: [{ name: 'dev', type: 'standard', depends_on: [] }],
  8  |     roles: [{
  9  |         name: 'dev',
  10 |         content: 'You are a developer. Implement the change with tests and clear docs.',
  11 |     }],
  12 | };
  13 | 
  14 | async function open_builder_canvas(page: import('@playwright/test').Page): Promise<void> {
  15 |     const me = await expect_api_ok(await api_post(page, '/v1/session/get', {}));
  16 |     const me_data = (me.data ?? me) as {
  17 |         user?: { username?: string };
  18 |         scopes?: Array<{ slug?: string; scope_type?: string }>;
  19 |     };
  20 |     const username = me_data.user?.username ?? '';
  21 |     const scopes = me_data.scopes ?? [];
  22 |     // Prefer personal/user scope — first listed scope can be an org the PAT cannot write.
  23 |     const scope =
  24 |         scopes.find((s) => s.slug === username)?.slug
  25 |         ?? scopes.find((s) => s.scope_type === 'user' || s.scope_type === 'personal')?.slug
  26 |         ?? scopes[0]?.slug;
  27 |     expect(scope, `writable scope missing: ${JSON.stringify(me)}`).toBeTruthy();
  28 |     const body = await expect_api_ok(await api_post(page, '/v1/teams/create', {
  29 |         name: `e2e-builder-${Date.now()}`,
  30 |         scope,
  31 |         team_json: JSON.stringify(MINIMAL_TEAM),
  32 |     }));
  33 |     const draft = (body.data ?? body) as { id?: string; team_id?: string };
  34 |     const draft_id = draft.id ?? draft.team_id;
  35 |     expect(draft_id, `draft id missing: ${JSON.stringify(body)}`).toBeTruthy();
  36 |     await page.goto(`/builder?draft=${draft_id}`);
  37 |     // Compact inspector uses title="Add phase" with accessible name "+".
  38 |     await expect(page.getByTitle('Add phase')).toBeVisible({ timeout: 15_000 });
  39 | }
  40 | 
  41 | test.describe('Builder — positive', () => {
  42 |     test('builder spark view loads for admin', async ({ page }) => {
  43 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  44 |         await page.goto('/builder');
> 45 |         await expect(page.getByRole('heading', { name: /build a team/i })).toBeVisible({ timeout: 10_000 });
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  46 |         await expect(
  47 |             page.getByText(/what team do you want to build/i)
  48 |                 .or(page.getByRole('button', { name: /build my team/i }))
  49 |                 .or(page.getByPlaceholder(/development team/i))
  50 |                 .first(),
  51 |         ).toBeVisible({ timeout: 10_000 });
  52 |     });
  53 | 
  54 |     test('builder loads for member', async ({ page }) => {
  55 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  56 |         await page.goto('/builder');
  57 |         await expect(page.getByRole('heading', { name: /build a team/i })).toBeVisible({ timeout: 10_000 });
  58 |         await expect(
  59 |             page.getByText(/what team do you want to build/i)
  60 |                 .or(page.getByRole('button', { name: /build my team/i }))
  61 |                 .or(page.getByPlaceholder(/development team/i))
  62 |                 .first(),
  63 |         ).toBeVisible({ timeout: 10_000 });
  64 |     });
  65 | });
  66 | 
  67 | test.describe('Builder — negative / constraints', () => {
  68 |     test('add phase options exclude legacy hug/exec types when canvas open', async ({ page }) => {
  69 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  70 |         await open_builder_canvas(page);
  71 | 
  72 |         await page.getByTitle('Add phase').click();
  73 |         const joined = (await page.getByRole('button').allTextContents()).join(' ').toLowerCase();
  74 |         expect(joined).toContain('standard');
  75 |         expect(joined).toContain('gate');
  76 |         expect(joined).toContain('team');
  77 |         expect(joined).not.toMatch(/\bhug\b/);
  78 |         expect(joined).not.toMatch(/\bexec\b/);
  79 |         expect(joined).not.toMatch(/\bpull\b/);
  80 |         expect(joined).not.toMatch(/\bpush\b/);
  81 |     });
  82 | });
  83 | 
```