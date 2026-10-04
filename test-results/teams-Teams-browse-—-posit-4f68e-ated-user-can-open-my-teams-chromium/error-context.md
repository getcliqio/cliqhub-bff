# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teams.spec.ts >> Teams browse — positive >> authenticated user can open my teams
- Location: e2e/teams.spec.ts:41:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /build a team/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: /build a team/i })

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
  - text: Realms 13
  - link "1 of 1 daemons online e2e-run-muqwk9zx":
    - /url: /o/testuser/realms/e2e-run-muqwk9zx/inbox
    - img "1 of 1 daemons online"
    - text: e2e-run-muqwk9zx
  - link "No daemons e2e-mintval-muqwjw7r":
    - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
    - img "No daemons"
    - text: e2e-mintval-muqwjw7r
  - link "No daemons e2e-dcancel-muqwjk0c":
    - /url: /o/testuser/realms/e2e-dcancel-muqwjk0c/inbox
    - img "No daemons"
    - text: e2e-dcancel-muqwjk0c
  - link "No daemons e2e-add-muqwhk2e":
    - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
    - img "No daemons"
    - text: e2e-add-muqwhk2e
  - link "No daemons e2e-usr-muqwhbpt":
    - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
    - img "No daemons"
    - text: e2e-usr-muqwhbpt
  - link "No daemons e2e-tok-muqwh3c3":
    - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
    - img "No daemons"
    - text: e2e-tok-muqwh3c3
  - link "No daemons e2e-tabs-muqwgtdg":
    - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
    - img "No daemons"
    - text: e2e-tabs-muqwgtdg
  - link "No daemons e2e-det-muqwg52d":
    - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
    - img "No daemons"
    - text: e2e-det-muqwg52d
  - link "No daemons e2e-filt-muqwfwkb":
    - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
    - img "No daemons"
    - text: e2e-filt-muqwfwkb
  - link "No daemons e2e-notif-muqwc55t":
    - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
    - img "No daemons"
    - text: e2e-notif-muqwc55t
  - link "All 13 realms →":
    - /url: /realms
  - link "Getting started 3 of 4 done":
    - /url: /getting-started
    - text: Getting started 3 / 4
  - link "Docs":
    - /url: https://docs.getcliq.io
  - button "TE testuser @testuser"
- banner:
  - navigation "Breadcrumb":
    - link "All my work":
      - /url: /home
    - text: Teams
  - button "Notifications"
  - button "Refresh"
  - link "New team":
    - /url: /builder
- main:
  - heading "Teams" [level=1]
  - paragraph: Teams you and your orgs build and own. Build here, then install into any realm.
  - group "Status":
    - button "All 2" [pressed]
    - button "Published 1"
    - button "Drafts 1"
  - textbox "Search teams":
    - /placeholder: Search teams…
  - table:
    - rowgroup:
      - row "Team Phases Status Latest Installed in":
        - columnheader "Team":
          - button "Team"
        - columnheader "Phases"
        - columnheader "Status":
          - button "Status"
        - columnheader "Latest"
        - columnheader "Installed in"
        - columnheader
    - rowgroup:
      - 'row "e2e-builder-1790941382136@cliq — 1 phases: agent Draft 0.1.0 not installed Open"':
        - cell "e2e-builder-1790941382136@cliq —":
          - link "e2e-builder-1790941382136":
            - /url: /teams/cliq/e2e-builder-1790941382136
          - text: "@cliq —"
        - 'cell "1 phases: agent"'
        - cell "Draft"
        - cell "0.1.0"
        - cell "not installed"
        - cell "Open":
          - link "Open":
            - /url: /teams/cliq/e2e-builder-1790941382136
      - 'row "hello-world@cliq Prints a greeting for the provided name, produces a review artifact, and waits for human approval. 3 phases: script, human review, script Published 2.0.0 default e2e-add-muqwhk2e e2e-ch-muqwaqs7 e2e-dcancel-muqwjk0c +9 Open Install ▾"':
        - cell "hello-world@cliq Prints a greeting for the provided name, produces a review artifact, and waits for human approval.":
          - link "hello-world":
            - /url: /teams/cliq/hello-world
          - text: "@cliq Prints a greeting for the provided name, produces a review artifact, and waits for human approval."
        - 'cell "3 phases: script, human review, script"'
        - cell "Published"
        - cell "2.0.0"
        - cell "default e2e-add-muqwhk2e e2e-ch-muqwaqs7 e2e-dcancel-muqwjk0c +9"
        - cell "Open Install ▾":
          - link "Open":
            - /url: /teams/cliq/hello-world
          - button "Install ▾"
  - text: "Phases: agent gate human review connector fetch script sub-team Looking for other people’s teams?"
  - link "Marketplace →":
    - /url: /browse
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     expect_login_redirect,
  5   |     TEST_ADMIN,
  6   |     TEST_USER,
  7   | } from './helpers';
  8   | 
  9   | const BROWSE_SEARCH = 'Search teams, agents, workflows…';
  10  | 
  11  | test.describe('Teams browse — positive', () => {
  12  |     test('browse page shows heading and result state', async ({ page }) => {
  13  |         await page.goto('/browse');
  14  |         await expect(page.getByRole('heading', { name: /find the perfect team/i })).toBeVisible();
  15  |         await expect(
  16  |             page.getByRole('heading', { name: /trending this week/i })
  17  |                 .or(page.getByText(/all teams/i))
  18  |                 .or(page.getByText(/results for/i))
  19  |                 .or(page.getByText(/no teams/i))
  20  |                 .first(),
  21  |         ).toBeVisible({ timeout: 10_000 });
  22  |     });
  23  | 
  24  |     test('search query is sent in list POST body', async ({ page }) => {
  25  |         await page.goto('/browse');
  26  |         await expect(page.getByPlaceholder(BROWSE_SEARCH)).toBeVisible({ timeout: 10_000 });
  27  | 
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
> 45  |         await expect(page.getByRole('link', { name: /build a team/i })).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
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
  128 |         ).toBeVisible({ timeout: 10_000 });
  129 |     });
  130 | });
  131 | 
```