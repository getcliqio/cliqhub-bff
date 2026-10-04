# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: telemetry_envelope.spec.ts >> Telemetry envelope — positive >> home dashboard loads and issues get_telemetry summary
- Location: e2e/telemetry_envelope.spec.ts:64:5

# Error details

```
TimeoutError: page.waitForResponse: Timeout 20000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - complementary "Primary" [ref=f1e5]:
    - link [ref=f1e6] [cursor=pointer]:
      - /url: /home
      - img "CliqHub" [ref=f1e7]
      - text: CliqHub
    - 'button "Switch view (current: All my work)" [ref=f1e15] [cursor=pointer]':
      - generic [ref=f1e20]:
        - generic [ref=f1e21]: Viewing
        - generic [ref=f1e22]: All my work
    - navigation "Main" [ref=f1e26]:
      - generic [ref=f1e27]: Work
      - generic [ref=f1e28]:
        - link "Overview" [ref=f1e29] [cursor=pointer]:
          - /url: /home
        - link "Inbox" [ref=f1e34] [cursor=pointer]:
          - /url: /inbox
      - generic [ref=f1e39]: Build
      - generic [ref=f1e40]:
        - link "Teams" [ref=f1e41] [cursor=pointer]:
          - /url: /teams
        - link "Marketplace" [ref=f1e47] [cursor=pointer]:
          - /url: /browse
      - generic [ref=f1e53]: Manage
      - generic [ref=f1e54]:
        - link "Notifications" [ref=f1e55] [cursor=pointer]:
          - /url: /notifications
        - link "Agents" [ref=f1e60] [cursor=pointer]:
          - /url: /agents
        - link "Organization" [ref=f1e65] [cursor=pointer]:
          - /url: /org
    - generic [ref=f1e71]:
      - generic [ref=f1e72]:
        - text: Realms
        - generic [ref=f1e73]: "4"
      - link "No daemons default" [ref=f1e74] [cursor=pointer]:
        - /url: /o/e2e-roles-muqwdibk/realms/default/inbox
        - img "No daemons" [ref=f1e75]
        - generic [ref=f1e76]: ER
        - generic [ref=f1e77]: default
      - link "No daemons e2e-filt-muqwbfp4" [ref=f1e78] [cursor=pointer]:
        - /url: /o/cliq/realms/e2e-filt-muqwbfp4/inbox
        - img "No daemons" [ref=f1e79]
        - generic [ref=f1e80]: CL
        - generic [ref=f1e81]: e2e-filt-muqwbfp4
      - link "No daemons e2e-slack-muqwaz3n" [ref=f1e82] [cursor=pointer]:
        - /url: /o/cliq/realms/e2e-slack-muqwaz3n/inbox
        - img "No daemons" [ref=f1e83]
        - generic [ref=f1e84]: CL
        - generic [ref=f1e85]: e2e-slack-muqwaz3n
      - link "No daemons default" [ref=f1e86] [cursor=pointer]:
        - /url: /o/cliq/realms/default/inbox
        - img "No daemons" [ref=f1e87]
        - generic [ref=f1e88]: CL
        - generic [ref=f1e89]: default
    - generic [ref=f1e90]:
      - link "Getting started 1 of 4 done" [ref=f1e91] [cursor=pointer]:
        - /url: /getting-started
        - text: Getting started
        - generic "1 of 4 done" [ref=f1e97]: 1 / 4
      - link "Docs" [ref=f1e98] [cursor=pointer]:
        - /url: https://docs.getcliq.io
        - text: Docs
        - generic [ref=f1e101]: ↗
      - button "Admin SITE" [ref=f1e102] [cursor=pointer]:
        - text: Admin
        - generic [ref=f1e105]: SITE
      - button "AD admin @admin · site admin" [ref=f1e107] [cursor=pointer]:
        - generic [ref=f1e108]: AD
        - generic [ref=f1e109]:
          - generic [ref=f1e110]: admin
          - generic [ref=f1e111]: "@admin · site admin"
  - generic [ref=f1e116]:
    - banner [ref=f1e117]:
      - navigation "Breadcrumb" [ref=f1e118]:
        - link "All my work" [ref=f1e120] [cursor=pointer]:
          - /url: /home
        - generic [ref=f1e126]: Overview
      - generic [ref=f1e127]:
        - button "Notifications" [ref=f1e129] [cursor=pointer]
        - button "Refresh" [ref=f1e133] [cursor=pointer]
    - main [ref=f1e139]:
      - generic [ref=f1e141]:
        - generic [ref=f1e142]:
          - heading "Good afternoon, admin" [level=1] [ref=f1e143]
          - paragraph [ref=f1e144]: Across 3 orgs and 4 realms you can access.
        - generic [ref=f1e145]:
          - generic [ref=f1e146]:
            - generic [ref=f1e148]: Waiting on you
            - generic [ref=f1e149]: "0"
            - generic [ref=f1e150]: 0 reviews · 0 inputs
          - generic [ref=f1e151]:
            - generic [ref=f1e153]: Running now
            - generic [ref=f1e154]: "0"
            - generic [ref=f1e155]: nothing running
          - generic [ref=f1e156]:
            - generic [ref=f1e158]: Failed · 24h
            - generic [ref=f1e159]: "0"
            - generic [ref=f1e160]: 0 completed
          - generic [ref=f1e161]:
            - generic [ref=f1e163]: Daemons
            - generic [ref=f1e164]:
              - text: "0"
              - generic [ref=f1e165]: /0
            - generic [ref=f1e166]: none enrolled
        - generic [ref=f1e167]:
          - region [ref=f1e168]:
            - generic [ref=f1e169]:
              - heading "Needs you" [level=2] [ref=f1e170]
              - generic [ref=f1e171]: across every org
              - tablist "Filter needs" [ref=f1e172]:
                - tab "All 0" [selected] [ref=f1e173] [cursor=pointer]
                - tab "Reviews 0" [ref=f1e174] [cursor=pointer]
                - tab "Input 0" [ref=f1e175] [cursor=pointer]
            - generic [ref=f1e176]:
              - paragraph [ref=f1e180]: You’re all caught up
              - paragraph [ref=f1e181]: Reviews and input requests will show up here.
          - region [ref=f1e182]:
            - generic [ref=f1e183]:
              - heading "Realms" [level=2] [ref=f1e184]
              - generic [ref=f1e185]: waiting on you first
              - link "All 4 realms →" [ref=f1e186] [cursor=pointer]:
                - /url: /realms
            - link "No daemons default E2E Roles e2e-roles-muqwdibk no daemons" [ref=f1e187] [cursor=pointer]:
              - /url: /o/e2e-roles-muqwdibk/realms/default/inbox
              - img "No daemons" [ref=f1e188]
              - generic [ref=f1e189]:
                - generic [ref=f1e190]: default
                - generic [ref=f1e191]:
                  - generic [ref=f1e192]: ER
                  - text: E2E Roles e2e-roles-muqwdibk
                  - generic [ref=f1e193]: ·
                  - text: no daemons
            - link "No daemons Notify e2e-filt-muqwbfp4 Cliq no daemons" [ref=f1e196] [cursor=pointer]:
              - /url: /o/cliq/realms/e2e-filt-muqwbfp4/inbox
              - img "No daemons" [ref=f1e197]
              - generic [ref=f1e198]:
                - generic [ref=f1e199]: Notify e2e-filt-muqwbfp4
                - generic [ref=f1e200]:
                  - generic [ref=f1e201]: CL
                  - text: Cliq
                  - generic [ref=f1e202]: ·
                  - text: no daemons
            - link "No daemons Notify e2e-slack-muqwaz3n Cliq no daemons" [ref=f1e205] [cursor=pointer]:
              - /url: /o/cliq/realms/e2e-slack-muqwaz3n/inbox
              - img "No daemons" [ref=f1e206]
              - generic [ref=f1e207]:
                - generic [ref=f1e208]: Notify e2e-slack-muqwaz3n
                - generic [ref=f1e209]:
                  - generic [ref=f1e210]: CL
                  - text: Cliq
                  - generic [ref=f1e211]: ·
                  - text: no daemons
            - link "No daemons default Cliq no daemons" [ref=f1e214] [cursor=pointer]:
              - /url: /o/cliq/realms/default/inbox
              - img "No daemons" [ref=f1e215]
              - generic [ref=f1e216]:
                - generic [ref=f1e217]: default
                - generic [ref=f1e218]:
                  - generic [ref=f1e219]: CL
                  - text: Cliq
                  - generic [ref=f1e220]: ·
                  - text: no daemons
        - region [ref=f1e223]:
          - heading "Running now" [level=2] [ref=f1e225]
          - paragraph [ref=f1e226]: Nothing is running right now.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     api_current_org_id,
  5   |     expect_api_ok,
  6   |     api_post,
  7   |     TEST_ADMIN,
  8   |     TEST_USER,
  9   |     wait_for_active_org,
  10  | } from './helpers';
  11  | 
  12  | /**
  13  |  * TEL-ENV — browser + API proof that get_telemetry returns `{ ok, data }`
  14  |  * and home dashboard renders telemetry from that envelope.
  15  |  */
  16  | test.describe('Telemetry envelope — positive', () => {
  17  |     test('get_telemetry summary returns data envelope', async ({ page }) => {
  18  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  19  |         const org_id = await api_current_org_id(page);
  20  |         const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
  21  |             kind: 'summary',
  22  |             org_id,
  23  |             window_days: 7,
  24  |         }));
  25  |         expect(body).toHaveProperty('data');
  26  |         expect(body.data).toEqual(expect.objectContaining({
  27  |             window: expect.any(Object),
  28  |             totals: expect.any(Object),
  29  |             by_day: expect.any(Array),
  30  |             by_hour: expect.any(Array),
  31  |             by_team: expect.any(Array),
  32  |             by_agent_kind: expect.any(Array),
  33  |         }));
  34  |         // Hard-cut — no flat totals sibling outside data.
  35  |         expect(body).not.toHaveProperty('totals');
  36  |         expect(body).not.toHaveProperty('by_day');
  37  |     });
  38  | 
  39  |     test('get_telemetry usage returns data.run / data.phases', async ({ page }) => {
  40  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  41  |         const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
  42  |             kind: 'usage',
  43  |             run_id: '00000000-0000-4000-8000-000000000099',
  44  |         }));
  45  |         expect(body).toHaveProperty('data');
  46  |         const data = body.data as { run: unknown; phases: unknown[] };
  47  |         expect(data).toHaveProperty('run');
  48  |         expect(Array.isArray(data.phases)).toBe(true);
  49  |         expect(body).not.toHaveProperty('run');
  50  |         expect(body).not.toHaveProperty('phases');
  51  |     });
  52  | 
  53  |     test('get_telemetry spans returns data array', async ({ page }) => {
  54  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  55  |         const body = await expect_api_ok(await api_post(page, '/v1/runs/get_telemetry', {
  56  |             kind: 'spans',
  57  |             run_id: '00000000-0000-4000-8000-000000000099',
  58  |         }));
  59  |         expect(body).toHaveProperty('data');
  60  |         expect(Array.isArray(body.data)).toBe(true);
  61  |         expect(body).not.toHaveProperty('spans');
  62  |     });
  63  | 
  64  |     test('home dashboard loads and issues get_telemetry summary', async ({ page }) => {
  65  |         await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
  66  |         await page.goto('/home');
  67  |         await wait_for_active_org(page);
  68  | 
> 69  |         const telemetry = page.waitForResponse(
      |                                ^ TimeoutError: page.waitForResponse: Timeout 20000ms exceeded while waiting for event "response"
  70  |             (res) => res.url().includes('/v1/runs/get_telemetry') && res.request().method() === 'POST',
  71  |             { timeout: 20_000 },
  72  |         );
  73  |         // Reload so the waitForResponse catches the post-hydrate fetch.
  74  |         await page.reload();
  75  |         await wait_for_active_org(page);
  76  |         const res = await telemetry;
  77  |         expect(res.ok()).toBe(true);
  78  |         const json = await res.json();
  79  |         expect(json.ok).toBe(true);
  80  |         expect(json.data).toBeTruthy();
  81  |         expect(json.data.totals).toBeTruthy();
  82  | 
  83  |         // Page rendered (getting-started card and/or fleet telemetry) — no crash.
  84  |         await expect(page.locator('body')).toBeVisible();
  85  |         const crashed = await page.getByText(/something went wrong|unhandled|stack trace/i).isVisible().catch(() => false);
  86  |         expect(crashed).toBe(false);
  87  |         const getting_started = page.getByRole('heading', { name: 'Getting started', exact: true, level: 2 });
  88  |         const home_link = page.getByRole('link', { name: 'Home', exact: true });
  89  |         await expect(home_link).toBeVisible({ timeout: 10_000 });
  90  |         // Prefer the getting-started h2 when present; otherwise home nav proves render.
  91  |         if (await getting_started.isVisible().catch(() => false)) {
  92  |             await expect(getting_started).toBeVisible();
  93  |         }
  94  |     });
  95  | });
  96  | 
  97  | test.describe('Telemetry envelope — negative', () => {
  98  |     test('summary without org_id is rejected', async ({ page }) => {
  99  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  100 |         const res = await api_post(page, '/v1/runs/get_telemetry', { kind: 'summary' });
  101 |         expect(res.status()).toBeGreaterThanOrEqual(400);
  102 |         const body = await res.json();
  103 |         expect(body.ok).toBe(false);
  104 |     });
  105 | });
  106 | 
```