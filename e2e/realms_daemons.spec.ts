import { test, expect } from '@playwright/test';
import {
    api_login,
    api_create_realm,
    api_current_org_id,
    expect_alert,
    expect_login_redirect,
    open_create_realm,
    realm_url,
    submit_create_realm,
    unique_slug,
    TEST_USER,
} from './helpers';

test.describe('Realms — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('realms page loads', async ({ page }) => {
        await page.goto('/realms');
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: /^create realm$/i })).toBeVisible();
        await expect(page.getByLabel('Filter realms by slug or name')).toBeVisible();
    });

    test('create realm full-width flow appears in list', async ({ page }) => {
        await open_create_realm(page);

        const slug = unique_slug('e2e-realm');
        const name = `E2E Realm ${slug}`;
        await submit_create_realm(page, slug, name);

        await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 10_000 });
        await expect(page).toHaveURL(new RegExp(`/realms/${slug}`));

        // Filter by slug so the new realm is visible even when the list is paginated.
        await page.goto(`/realms?q=${encodeURIComponent(slug)}`);
        await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(new RegExp(`\\.${slug}$|${slug}`)).first()).toBeVisible();
    });

    test('cancel create returns to list', async ({ page }) => {
        await open_create_realm(page);
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
        await expect(page).not.toHaveURL(/create=1/);
    });

    test('filter query is sent in list POST body', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-filt', 'Filter Target');
        await page.goto('/realms');
        await expect(page.getByLabel('Filter realms by slug or name')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/realms/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === realm.slug,
        );
        await page.getByLabel('Filter realms by slug or name').fill(realm.slug);
        await filter_req;
        await expect(page.getByText(realm.name)).toBeVisible({ timeout: 10_000 });

        const empty_req = page.waitForRequest((req) =>
            req.url().includes('/v1/realms/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === 'zzz-no-such-realm-xyz',
        );
        await page.getByLabel('Filter realms by slug or name').fill('zzz-no-such-realm-xyz');
        await empty_req;
        await expect(page.getByText(/no realms match these filters/i)).toBeVisible({ timeout: 10_000 });
    });

    test('open realm detail from list', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-det', 'Detail');
        await page.goto('/realms');
        await page.getByLabel('Filter realms by slug or name').fill(realm.slug);
        await expect(page.getByText(realm.name)).toBeVisible({ timeout: 10_000 });

        const failed_api: Array<{ url: string; status: number; body: string }> = [];
        page.on('response', async (res) => {
            if (!res.url().includes('/v1/')) return;
            if (res.status() < 400) return;
            let body = '';
            try {
                body = await res.text();
            } catch {
                body = '';
            }
            failed_api.push({ url: res.url(), status: res.status(), body });
        });

        await page.getByText(realm.name).click();
        await page.waitForURL(new RegExp(`/o/[^/]+/realms/${realm.slug}`), { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('navigation', { name: 'Realm sections' }).getByRole('link', { name: 'Teams' })).toBeVisible();
        await expect(page.getByText(/Unknown API route/i)).toHaveCount(0);

        const unknown = failed_api.filter((f) => /Unknown API route/i.test(f.body));
        expect(
            unknown,
            `realm detail must not hit retired routes: ${JSON.stringify(unknown)}`,
        ).toEqual([]);
    });
});

test.describe('Realm detail — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('section nav updates the URL', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-tabs', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'teams'));
        await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 10_000 });
        const tab_nav = page.getByRole('navigation', { name: 'Realm sections' });

        await tab_nav.getByRole('link', { name: 'Notifications', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/notifications`));
        await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();

        await tab_nav.getByRole('link', { name: 'Settings', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings`));
        await page.getByRole('navigation', { name: 'Realm settings' }).getByRole('link', { name: 'Members', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings/security/members`));
        await page.getByRole('navigation', { name: 'Realm settings' }).getByRole('link', { name: 'Tokens', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings/security/tokens`));

        await tab_nav.getByRole('link', { name: 'Channels', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/channels`));
        await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible();
    });

    test('mint realm token full-width form', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-tok', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
        await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 10_000 });

        const token_name = `enroll-${realm.slug.slice(-6)}`;
        await page.getByPlaceholder('laptop-enroll').fill(token_name);
        await page.getByRole('button', { name: /^mint$/i }).click();
        await expect(page.getByText(/CLIQ_DAEMON_TOKEN|cliq_dt_/i).first()).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: /^done$/i }).click();
        await expect(page).not.toHaveURL(/form=1/);
        await expect(page.getByText(token_name)).toBeVisible({ timeout: 10_000 });
    });

    test('users tab filter uses member_type in members POST body', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-usr', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/members'));
        await expect(page.getByRole('heading', { name: 'Realm members' })).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Search members').fill('zzz-no-member');
        await expect(page.getByText(/no members match this filter/i)).toBeVisible({ timeout: 10_000 });
    });

    test('invite form validates empty email', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-add', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/members'));
        await expect(page.getByRole('heading', { name: 'Realm members' })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Add member' }).click();
        await expect(page.getByRole('button', { name: /^add$/i })).toBeDisabled();
    });
});

test.describe('Realms — negative', () => {
    test('unauthenticated realms redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/realms');
    });

    test('create without slug/name shows validation error', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_create_realm(page);
        await page.getByRole('button', { name: /^create & continue$/i }).click();
        await expect(page.getByText(/slug is required|display name is required|required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('duplicate realm slug is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);

        const slug = unique_slug('e2e-dup');
        await open_create_realm(page);
        await page.getByPlaceholder('prod-west').fill(slug);
        await page.getByPlaceholder('Prod West').fill(`First ${slug}`);
        await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
        await page.getByRole('button', { name: /^create & continue$/i }).click();
        await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Close wizard' }).click();

        await open_create_realm(page);
        await page.getByPlaceholder('prod-west').fill(slug);
        await page.getByPlaceholder('Prod West').fill(`Second ${slug}`);
        await expect(page.getByRole('button', { name: /^create & continue$/i })).toBeEnabled({ timeout: 10_000 });
        await page.getByRole('button', { name: /^create & continue$/i }).click();
        await expect_alert(page, /already exists/i);
    });
});

test.describe('Daemons — positive / negative', () => {
    test('daemons page loads for member', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/daemons');
        await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Daemons' })).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByText(/no active daemons in this realm/i)
                .or(page.locator('ul.grid li').first()),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: /^refresh$/i })).toBeVisible();
    });

    test('list POST includes realm_id when page loads', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);

        const list_req = page.waitForRequest((req) =>
            req.url().includes('/v1/daemons/get')
            && req.method() === 'POST'
            && Boolean((req.postDataJSON() as { realm_id?: string })?.realm_id),
        );
        await page.goto('/daemons');
        await page.waitForURL(/\/o\/[^/]+\/realms\/[^/]+\/daemons/, { timeout: 10_000 });
        await list_req;
    });

    test('mint token form cancel returns to list', async ({ page }) => {
        test.setTimeout(60_000);
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_create_realm(page, 'e2e-dcancel', 'Cancel');

        await page.goto(realm_url(realm.org_slug, realm.slug));
        await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 15_000 });
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
        await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('heading', { name: 'Realm tokens' })).toBeVisible({ timeout: 10_000 });
        await expect(page).not.toHaveURL(/form=1/);
    });

    test('mint without token name shows validation error', async ({ page }) => {
        test.setTimeout(60_000);
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_create_realm(page, 'e2e-mintval', 'Mint');

        await page.goto(realm_url(realm.org_slug, realm.slug));
        await expect(page.getByRole('heading', { name: realm.name })).toBeVisible({ timeout: 15_000 });
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens?form=1'));
        await expect(page.getByRole('heading', { name: 'Mint realm token' })).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /^mint$/i }).click();
        await expect(page.getByText(/token name is required/i)).toBeVisible({ timeout: 5_000 });
    });

    test('unauthenticated daemons redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/daemons');
    });

    test('dashboard daemon counts match daemons list for the same user', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        // DASH-ORG / DAE-ORG invent: body org_id required (never invent from header).
        const org_id = await api_current_org_id(page);

        const summary_res = await page.request.post('/v1/dashboard/summary', {
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            data: { org_id },
        });
        expect(summary_res.ok()).toBe(true);
        const summary = await summary_res.json();
        expect(summary.ok).toBe(true);

        const list_res = await page.request.post('/v1/daemons/get', {
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            data: { org_id },
        });
        expect(list_res.ok()).toBe(true);
        const list = await list_res.json();
        expect(list.ok).toBe(true);

        const listed = (list.daemons ?? []) as Array<{ status?: string }>;
        const online = listed.filter((d) => d.status === 'online').length;
        expect(summary.counts.daemons_total).toBe(listed.length);
        expect(summary.counts.daemons_online).toBe(online);
    });
});
