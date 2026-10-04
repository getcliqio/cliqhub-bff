# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teams.spec.ts >> Teams browse — positive >> my teams filter query is sent in list POST body
- Location: e2e/teams.spec.ts:49:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForRequest: Test timeout of 30000ms exceeded.
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
        - generic [ref=e73]: "13"
      - link "1 of 1 daemons online e2e-run-muqwk9zx" [ref=e74] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-run-muqwk9zx/inbox
        - img "1 of 1 daemons online" [ref=e75]
        - generic [ref=e76]: TE
        - generic [ref=e77]: e2e-run-muqwk9zx
      - link "No daemons e2e-mintval-muqwjw7r" [ref=e78] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-mintval-muqwjw7r/inbox
        - img "No daemons" [ref=e79]
        - generic [ref=e80]: TE
        - generic [ref=e81]: e2e-mintval-muqwjw7r
      - link "No daemons e2e-dcancel-muqwjk0c" [ref=e82] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-dcancel-muqwjk0c/inbox
        - img "No daemons" [ref=e83]
        - generic [ref=e84]: TE
        - generic [ref=e85]: e2e-dcancel-muqwjk0c
      - link "No daemons e2e-add-muqwhk2e" [ref=e86] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-add-muqwhk2e/inbox
        - img "No daemons" [ref=e87]
        - generic [ref=e88]: TE
        - generic [ref=e89]: e2e-add-muqwhk2e
      - link "No daemons e2e-usr-muqwhbpt" [ref=e90] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-usr-muqwhbpt/inbox
        - img "No daemons" [ref=e91]
        - generic [ref=e92]: TE
        - generic [ref=e93]: e2e-usr-muqwhbpt
      - link "No daemons e2e-tok-muqwh3c3" [ref=e94] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tok-muqwh3c3/inbox
        - img "No daemons" [ref=e95]
        - generic [ref=e96]: TE
        - generic [ref=e97]: e2e-tok-muqwh3c3
      - link "No daemons e2e-tabs-muqwgtdg" [ref=e98] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-tabs-muqwgtdg/inbox
        - img "No daemons" [ref=e99]
        - generic [ref=e100]: TE
        - generic [ref=e101]: e2e-tabs-muqwgtdg
      - link "No daemons e2e-det-muqwg52d" [ref=e102] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-det-muqwg52d/inbox
        - img "No daemons" [ref=e103]
        - generic [ref=e104]: TE
        - generic [ref=e105]: e2e-det-muqwg52d
      - link "No daemons e2e-filt-muqwfwkb" [ref=e106] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-filt-muqwfwkb/inbox
        - img "No daemons" [ref=e107]
        - generic [ref=e108]: TE
        - generic [ref=e109]: e2e-filt-muqwfwkb
      - link "No daemons e2e-notif-muqwc55t" [ref=e110] [cursor=pointer]:
        - /url: /o/testuser/realms/e2e-notif-muqwc55t/inbox
        - img "No daemons" [ref=e111]
        - generic [ref=e112]: TE
        - generic [ref=e113]: e2e-notif-muqwc55t
      - link "All 13 realms →" [ref=e114] [cursor=pointer]:
        - /url: /realms
    - generic [ref=e115]:
      - link "Getting started 3 of 4 done" [ref=e116] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "3 of 4 done" [ref=e122]: 3 / 4
      - link "Docs" [ref=e123] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=e126]: ↗
      - button "TE testuser @testuser" [ref=e128] [cursor=pointer]:
        - generic [ref=e129]: TE
        - generic [ref=e130]:
          - generic [ref=e131]: testuser
          - generic [ref=e132]: "@testuser"
  - generic [ref=e137]:
    - banner [ref=e138]:
      - navigation "Breadcrumb" [ref=e139]:
        - link "All my work" [ref=e141] [cursor=pointer]:
          - /url: /home
        - generic [ref=e147]: Teams
      - generic [ref=e148]:
        - button "Notifications" [ref=e150] [cursor=pointer]
        - button "Refresh" [ref=e154] [cursor=pointer]
        - link "New team" [ref=e160] [cursor=pointer]:
          - /url: /builder
    - main [ref=e162]:
      - generic [ref=e163]:
        - generic [ref=e164]:
          - heading "Teams" [level=1] [ref=e165]
          - paragraph [ref=e166]: Teams you and your orgs build and own. Build here, then install into any realm.
        - generic [ref=e167]:
          - group "Status" [ref=e168]:
            - button "All 0" [pressed] [ref=e169] [cursor=pointer]:
              - text: All
              - generic [ref=e170]: "0"
            - button "Published 0" [ref=e171] [cursor=pointer]:
              - text: Published
              - generic [ref=e172]: "0"
            - button "Drafts 0" [ref=e173] [cursor=pointer]:
              - text: Drafts
              - generic [ref=e174]: "0"
          - textbox "Search teams" [active] [ref=e175]:
            - /placeholder: Search teams…
            - text: no-such-team-xyz
        - generic [ref=e176]: No teams match these filters.
        - generic [ref=e178]:
          - generic [ref=e179]: "Phases:"
          - generic [ref=e180]: agent
          - generic [ref=e182]: gate
          - generic [ref=e184]: human review
          - generic [ref=e186]: connector
          - generic [ref=e188]: fetch
          - generic [ref=e190]: script
          - generic [ref=e192]: sub-team
          - generic [ref=e194]:
            - text: Looking for other people’s teams?
            - link "Marketplace →" [ref=e195] [cursor=pointer]:
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
  45  |         await expect(page.getByRole('link', { name: /build a team/i })).toBeVisible();
  46  |         await expect(page.getByLabel('Search teams')).toBeVisible();
  47  |     });
  48  | 
  49  |     test('my teams filter query is sent in list POST body', async ({ page }) => {
  50  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  51  |         await page.goto('/teams');
  52  |         await expect(page.getByLabel('Search teams')).toBeVisible({ timeout: 10_000 });
  53  | 
> 54  |         const filter_req = page.waitForRequest((req) =>
      |                                 ^ Error: page.waitForRequest: Test timeout of 30000ms exceeded.
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