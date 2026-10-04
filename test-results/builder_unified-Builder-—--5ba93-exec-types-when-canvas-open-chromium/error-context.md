# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: builder_unified.spec.ts >> Builder — negative / constraints >> add phase options exclude legacy hug/exec types when canvas open
- Location: e2e/builder_unified.spec.ts:68:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTitle('Add phase')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTitle('Add phase')

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
    - text: e2e-builder-team
  - button "Notifications"
  - tablist "View":
    - tab "Canvas" [selected]
    - tab "YAML"
    - tab "Changes"
  - button "↓ Export"
  - button "New"
  - button "Publish…"
- main:
  - complementary:
    - tablist "Build or AI":
      - tab "Build" [selected]
      - tab "✦ AI"
    - text: Add a phase drag or click
    - button "Agent an AI agent with a role brief"
    - button "Gate checks · pass or route back"
    - button "Human review a person signs off"
    - button "Connector Jira, Drive, S3, Zendesk…"
    - button "Script runs shell commands"
    - button "Fetch download or post to URLs"
    - button "Sub-team calls another team"
    - text: Outline 1 phases
    - list:
      - listitem:
        - button "dev"
  - text: ✓ Valid workflow 1 role brief
  - button "Undo" [disabled]: ↶
  - application "Workflow canvas":
    - img
    - button "Run inputs click to edit none — runs start straight away"
    - button "dev, Agent":
      - text: dev agent
      - button "Connect dev to a phase that runs after it"
    - button "Add a phase after dev": +
  - button "Zoom in": +
  - button "Reset zoom": 100%
  - button "Zoom out": −
  - button "✦ Ask AI to change anything ⌘K"
  - complementary:
    - text: Team
    - paragraph: Click empty canvas to come back here.
    - region "Name & description":
      - heading "Name & description" [level=3]
      - textbox "Team name": e2e-builder-team
      - textbox "Description":
        - /placeholder: What this team does, in a sentence.
        - text: E2E builder canvas fixture
    - region "Use it for":
      - heading "Use it for ✦ Suggest" [level=3]:
        - text: Use it for
        - button "✦ Suggest"
      - button "+ add"
    - region "Not for":
      - heading "Not for" [level=3]
      - button "+ add"
    - region "Inputs":
      - heading "Inputs the form Run asks for" [level=3]
      - button "+ add input"
      - paragraph: Phases use them as $(inputs.name).
    - region "Tags":
      - heading "Tags" [level=3]
      - textbox "Tags":
        - /placeholder: engineering, tdd
    - region "Agents used":
      - heading "Agents used from the phases" [level=3]
      - text: No phases yet.
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
> 38 |     await expect(page.getByTitle('Add phase')).toBeVisible({ timeout: 15_000 });
     |                                                ^ Error: expect(locator).toBeVisible() failed
  39 | }
  40 | 
  41 | test.describe('Builder — positive', () => {
  42 |     test('builder spark view loads for admin', async ({ page }) => {
  43 |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  44 |         await page.goto('/builder');
  45 |         await expect(page.getByRole('heading', { name: /build a team/i })).toBeVisible({ timeout: 10_000 });
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