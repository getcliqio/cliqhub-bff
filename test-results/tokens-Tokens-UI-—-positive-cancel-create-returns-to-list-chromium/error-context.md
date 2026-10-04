# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tokens.spec.ts >> Tokens UI — positive >> cancel create returns to list
- Location: e2e/tokens.spec.ts:51:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'User tokens' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'User tokens' })

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
  - link "0 of 1 daemons online e2e-run-muqwk9zx":
    - /url: /o/testuser/realms/e2e-run-muqwk9zx/inbox
    - img "0 of 1 daemons online"
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
    - text: Settings
  - button "Notifications"
- main:
  - heading "Settings" [level=1]
  - paragraph: Your account. Org-wide settings live under Manage › Organization.
  - navigation "Settings":
    - text: Account
    - button "Profile"
    - button "Password"
    - button "Access tokens"
    - text: Publishing
    - button "My scopes"
  - paragraph: For the cliq CLI and scripts — they act as you. Daemons use realm tokens instead (Realm › Settings › Tokens).
  - button "New token"
  - table:
    - rowgroup:
      - row "Name Works in Created Last used":
        - columnheader "Name":
          - button "Name"
        - columnheader "Works in":
          - button "Works in"
        - columnheader "Created":
          - button "Created"
        - columnheader "Last used":
          - button "Last used"
        - columnheader
    - rowgroup:
      - row "session:2026-10-02T11:53:57.791Z testuser Oct 2026 0s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:57.791Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "0s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:53:46.802Z testuser Oct 2026 11s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:46.802Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:53:36.011Z testuser Oct 2026 22s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:36.011Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "22s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:53:35.760Z testuser Oct 2026 23s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:35.760Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "23s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:53:14.318Z testuser Oct 2026 44s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:14.318Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "44s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:53:13.826Z testuser Oct 2026 45s ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:53:13.826Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "45s ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:49.673Z testuser Oct 2026 1m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:49.673Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "1m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:38.162Z testuser Oct 2026 1m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:38.162Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "1m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:07.606Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:07.606Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:02.013Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:02.013Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:01.256Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:01.256Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:01.095Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:01.095Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:00.697Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:00.697Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:52:00.166Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:52:00.166Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:58.691Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:58.691Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:48.038Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:48.038Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:47.563Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:47.563Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:47.081Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:47.081Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:36.344Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:36.344Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:35.740Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:35.740Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:35.266Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:35.266Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:34.551Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:34.551Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:34.315Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:34.315Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:33.833Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:33.833Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:33.343Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:33.343Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:32.838Z testuser Oct 2026 2m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:32.838Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "2m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:16.683Z testuser Oct 2026 3m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:16.683Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "3m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:51:00.867Z testuser Oct 2026 3m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:51:00.867Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "3m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:50:50.303Z testuser Oct 2026 3m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:50:50.303Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "3m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:50:39.632Z testuser Oct 2026 3m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:50:39.632Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "3m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:50:09.279Z testuser Oct 2026 4m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:50:09.279Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "4m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:49:38.889Z testuser Oct 2026 4m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:49:38.889Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "4m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:49:27.627Z testuser Oct 2026 5m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:49:27.627Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "5m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:49:16.796Z testuser Oct 2026 5m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:49:16.796Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "5m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:49:05.939Z testuser Oct 2026 5m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:49:05.939Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "5m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:48:53.019Z testuser Oct 2026 5m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:48:53.019Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "5m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:48:21.524Z testuser Oct 2026 6m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:48:21.524Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "6m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:48:10.500Z testuser Oct 2026 6m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:48:10.500Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "6m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:40.082Z testuser Oct 2026 6m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:40.082Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "6m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:09.750Z testuser Oct 2026 7m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:09.750Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "7m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:04.155Z testuser Oct 2026 7m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:04.155Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "7m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:03.979Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:03.979Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:03.563Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:03.563Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:47:02.846Z testuser Oct 2026 7m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:47:02.846Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "7m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:46:51.018Z testuser Oct 2026 7m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:46:51.018Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "7m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:46:49.721Z testuser Oct 2026 7m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:46:49.721Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "7m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:45:46.336Z testuser Oct 2026 8m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:45:46.336Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "8m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:45:15.701Z testuser Oct 2026 9m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:45:15.701Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "9m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:45:15.027Z testuser Oct 2026 9m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:45:15.027Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "9m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:45:03.785Z testuser Oct 2026 9m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:45:03.785Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "9m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:44:31.406Z testuser Oct 2026 9m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:44:31.406Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "9m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:44:09.746Z testuser Oct 2026 10m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:44:09.746Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "10m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:44:09.154Z testuser Oct 2026 10m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:44:09.154Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "10m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:28.044Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:28.044Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:22.486Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:22.486Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:21.816Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:21.816Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:21.331Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:21.331Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:21.153Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:21.153Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:20.602Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:20.602Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:20.382Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:20.382Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:43:18.711Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:43:18.711Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:42:51.173Z testuser Oct 2026 11m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:42:51.173Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "11m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:42:02.079Z testuser Oct 2026 12m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:42:02.079Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "12m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:41:49.462Z testuser Oct 2026 unused Rotate… Revoke…":
        - cell "session:2026-10-02T11:41:49.462Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "unused"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:41:48.976Z testuser Oct 2026 12m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:41:48.976Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "12m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:41:48.358Z testuser Oct 2026 12m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:41:48.358Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "12m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:40:02.713Z testuser Oct 2026 14m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:40:02.713Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "14m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:39:52.114Z testuser Oct 2026 14m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:39:52.114Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "14m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:39:41.484Z testuser Oct 2026 14m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:39:41.484Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "14m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:39:30.516Z testuser Oct 2026 14m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:39:30.516Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "14m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:39:19.684Z testuser Oct 2026 15m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:39:19.684Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "15m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:38:49.254Z testuser Oct 2026 15m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:38:49.254Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "15m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
      - row "session:2026-10-02T11:38:43.383Z testuser Oct 2026 15m ago Rotate… Revoke…":
        - cell "session:2026-10-02T11:38:43.383Z"
        - cell "testuser"
        - cell "Oct 2026"
        - cell "15m ago"
        - cell "Rotate… Revoke…":
          - button "Rotate…"
          - button "Revoke…"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import {
  3   |     api_login,
  4   |     expect_login_redirect,
  5   |     unique_slug,
  6   |     TEST_USER,
  7   | } from './helpers';
  8   | 
  9   | async function open_create_token(page: import('@playwright/test').Page): Promise<void> {
  10  |     await page.goto('/tokens');
> 11  |     await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  12  |     await page.getByRole('button', { name: /^create token$/i }).click();
  13  |     await expect(page.getByRole('heading', { name: 'Create user token' })).toBeVisible({ timeout: 5_000 });
  14  |     await expect(page).toHaveURL(/create=1/);
  15  | }
  16  | 
  17  | async function submit_create_token(
  18  |     page: import('@playwright/test').Page,
  19  |     name: string,
  20  | ): Promise<void> {
  21  |     await page.getByLabel('Token name').fill(name);
  22  |     await page.getByRole('button', { name: /^create token$/i }).click();
  23  | }
  24  | 
  25  | test.describe('Tokens UI — positive', () => {
  26  |     test.beforeEach(async ({ page }) => {
  27  |         await api_login(page, TEST_USER.username, TEST_USER.password);
  28  |     });
  29  | 
  30  |     test('tokens page loads', async ({ page }) => {
  31  |         await page.goto('/tokens');
  32  |         await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
  33  |         await expect(page.getByRole('button', { name: /^create token$/i })).toBeVisible();
  34  |         await expect(page.getByLabel('Filter tokens')).toBeVisible();
  35  |         await expect(page.getByText('User token (PAT)')).toBeVisible();
  36  |     });
  37  | 
  38  |     test('create token full-width flow shows one-time secret', async ({ page }) => {
  39  |         await open_create_token(page);
  40  | 
  41  |         const name = unique_slug('e2e-tok');
  42  |         await submit_create_token(page, name);
  43  | 
  44  |         await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible({ timeout: 10_000 });
  45  |         await expect(page).not.toHaveURL(/create=1/);
  46  |         await expect(page.getByText(/won't be able to see it again|copy this token/i)).toBeVisible({ timeout: 10_000 });
  47  |         await expect(page.getByText(name)).toBeVisible();
  48  |         await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
  49  |     });
  50  | 
  51  |     test('cancel create returns to list', async ({ page }) => {
  52  |         await open_create_token(page);
  53  |         await page.getByRole('button', { name: /^cancel$/i }).click();
  54  |         await expect(page.getByRole('heading', { name: 'User tokens' })).toBeVisible();
  55  |         await expect(page).not.toHaveURL(/create=1/);
  56  |     });
  57  | 
  58  |     test('filter query is sent in list POST body', async ({ page }) => {
  59  |         await open_create_token(page);
  60  |         const name = unique_slug('e2e-filt');
  61  |         await submit_create_token(page, name);
  62  |         await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  63  | 
  64  |         const filter_req = page.waitForRequest((req) =>
  65  |             req.url().includes('/v1/auth/get_tokens')
  66  |             && req.method() === 'POST'
  67  |             && (req.postDataJSON() as { query?: string })?.query === name,
  68  |         );
  69  |         await page.getByLabel('Filter tokens').fill(name);
  70  |         await page.getByRole('button', { name: /^apply$/i }).click();
  71  |         await filter_req;
  72  |         await expect(page).not.toHaveURL(/[?&]q=/);
  73  |         await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  74  |     });
  75  | 
  76  |     test('revoke removes token from list', async ({ page }) => {
  77  |         await open_create_token(page);
  78  |         const name = unique_slug('e2e-rev');
  79  |         await submit_create_token(page, name);
  80  |         await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  81  | 
  82  |         const row = page.locator('tr').filter({ has: page.getByText(name, { exact: true }) });
  83  |         await row.getByRole('button', { name: 'Revoke' }).click();
  84  |         await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 8_000 });
  85  |     });
  86  | 
  87  |     test('rotate shows a new one-time secret', async ({ page }) => {
  88  |         await open_create_token(page);
  89  |         const name = unique_slug('e2e-rot');
  90  |         await submit_create_token(page, name);
  91  |         await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });
  92  | 
  93  |         const row = page.locator('tr').filter({ has: page.getByText(name, { exact: true }) });
  94  |         await row.getByRole('button', { name: 'Rotate' }).click();
  95  |         await expect(page.getByText(/won't be able to see it again|copy this token/i)).toBeVisible({ timeout: 10_000 });
  96  |     });
  97  | });
  98  | 
  99  | test.describe('Tokens UI — negative', () => {
  100 |     test('unauthenticated access redirects to login', async ({ page }) => {
  101 |         await expect_login_redirect(page, '/tokens');
  102 |     });
  103 | 
  104 |     test('create without name shows validation error', async ({ page }) => {
  105 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  106 |         await open_create_token(page);
  107 |         await page.getByRole('button', { name: /^create token$/i }).click();
  108 |         await expect(page.getByText(/token name is required/i)).toBeVisible({ timeout: 5_000 });
  109 |     });
  110 | 
  111 |     test('secret is not shown again after reload', async ({ page }) => {
```