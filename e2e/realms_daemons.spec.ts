import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    api_create_realm,
    api_current_org_id,
    api_post,
    expect_alert,
    expect_api_ok,
    expect_login_redirect,
    realm_url,
    unique_slug,
    TEST_USER,
} from './helpers';

async function open_new_realm(page: Page): Promise<void> {
    await page.goto('/realms');
    await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^new realm$/i }).click();
    await expect(page.getByRole('region', { name: 'New realm' })).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/new=1/);
}

async function fill_new_realm(page: Page, slug: string, name: string): Promise<void> {
    await page.getByLabel('Realm name').fill(name);
    await page.getByLabel('Realm slug').fill(slug);
    await expect(page.getByLabel('Realm slug')).toHaveValue(slug);
    await expect(page.getByRole('button', { name: /^create realm$/i })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole('button', { name: /^create realm$/i }).click();
}

function settings_section(page: Page, label: string) {
    return page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: new RegExp(`^${label}`) });
}

/** The caller's default realm from the session (what root /daemons is meant to open). */
async function api_default_realm(page: Page): Promise<{ org_slug: string; slug: string }> {
    const session = await expect_api_ok(await api_post(page, '/v1/session/get', {}));
    const data = session.data as { default_realm_qualified?: string | null };
    const qualified = String(data.default_realm_qualified ?? '');
    expect(qualified, `default realm missing: ${JSON.stringify(session)}`).toContain('.');
    const dot = qualified.indexOf('.');
    return { org_slug: qualified.slice(0, dot), slug: qualified.slice(dot + 1) };
}

test.describe('Realms — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('realms page loads', async ({ page }) => {
        await page.goto('/realms');
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: /^new realm$/i })).toBeVisible();
        await expect(page.getByLabel('Search realms')).toBeVisible();
    });

    test('new realm wizard creates a realm that appears in the list', async ({ page }) => {
        await open_new_realm(page);

        const slug = unique_slug('e2e-realm');
        const name = `E2E Realm ${slug}`;
        await fill_new_realm(page, slug, name);

        await expect(page.getByRole('group', { name: 'Teams' })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: /^skip$/i }).click();
        await page.getByRole('button', { name: `Open ${name} →` }).click();
        await page.waitForURL(new RegExp(`/o/[^/]+/realms/${slug}/inbox`), { timeout: 15_000 });
        await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({ timeout: 10_000 });

        await page.goto(`/realms?q=${encodeURIComponent(slug)}`);
        const card = page.getByTestId(`realm-${slug}`);
        await expect(card).toBeVisible({ timeout: 10_000 });
        await expect(card).toContainText(name);
    });

    test('cancel create returns to list', async ({ page }) => {
        await open_new_realm(page);
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('region', { name: 'New realm' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
        await expect(page).not.toHaveURL(/new=1/);
    });

    test('search filters the realm list and is kept in the URL', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-filt', 'Filter Target');
        await page.goto('/realms');
        await expect(page.getByLabel('Search realms')).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Search realms').fill(realm.slug);
        await expect(page).toHaveURL(new RegExp(`[?&]q=${realm.slug}`));
        await expect(page.getByTestId(`realm-${realm.slug}`)).toContainText(realm.name, { timeout: 10_000 });

        await page.getByLabel('Search realms').fill('zzz-no-such-realm-xyz');
        await expect(page).toHaveURL(/[?&]q=zzz-no-such-realm-xyz/);
        await expect(page.getByText(/no realms match/i)).toBeVisible({ timeout: 10_000 });
    });

    test('open realm detail from list', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-det', 'Detail');
        await page.goto(`/realms?q=${encodeURIComponent(realm.slug)}`);
        const card = page.getByTestId(`realm-${realm.slug}`);
        await expect(card).toBeVisible({ timeout: 10_000 });

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

        await card.click();
        await page.waitForURL(new RegExp(`/o/[^/]+/realms/${realm.slug}/inbox`), { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible({ timeout: 10_000 });
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
        const tab_nav = page.getByRole('navigation', { name: 'Realm sections' });
        await expect(tab_nav).toBeVisible({ timeout: 10_000 });

        await tab_nav.getByRole('link', { name: 'Runs', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/runs`));

        await tab_nav.getByRole('link', { name: 'Daemons', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/daemons`));

        await tab_nav.getByRole('link', { name: 'Settings', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings`));
        await expect(page.getByRole('heading', { name: 'Members', level: 2 })).toBeVisible({ timeout: 10_000 });
        await settings_section(page, 'Access tokens').click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings\\?section=tokens`));
        await settings_section(page, 'Members').click();
        await expect(page).not.toHaveURL(/section=/);

        await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: /notifications/i }).click();
        await expect(page).toHaveURL(new RegExp(`/notifications\\?org=${realm.org_slug}`));
        await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible({ timeout: 10_000 });
    });

    test('legacy security URLs redirect to realm settings sections', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-legacy', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/tokens'));
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings\\?section=tokens`), { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Access tokens', level: 2 })).toBeVisible({ timeout: 10_000 });

        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings/security/members'));
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings$`), { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Members', level: 2 })).toBeVisible({ timeout: 10_000 });
    });

    test('create realm access token', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-tok', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings?section=tokens'));
        await expect(page.getByRole('heading', { name: 'Access tokens', level: 2 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('CLIQ_DAEMON_TOKEN')).toBeVisible();

        const token_name = `enroll-${realm.slug.slice(-6)}`;
        await page.getByLabel('Token name').fill(token_name);
        await page.getByRole('button', { name: /^create token$/i }).click();
        await expect(page.getByTestId('new-token')).not.toBeEmpty({ timeout: 10_000 });
        await expect(page.getByRole('row').filter({ hasText: token_name })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel('Token name')).toHaveValue('');
    });

    test('members section lists you and finds no stranger', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-usr', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings'));
        await expect(page.getByRole('heading', { name: 'Members', level: 2 })).toBeVisible({ timeout: 10_000 });
        const you_row = page.locator('[data-testid^="member-"]').filter({ hasText: /you/ });
        await expect(you_row).toHaveCount(1, { timeout: 10_000 });
        await expect(you_row).toContainText('admin');

        const users_req = page.waitForRequest((req) =>
            req.url().includes('/v1/users/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { realm_id?: string; query?: string })?.query === 'zzz-no-member',
        );
        await page.getByLabel('Find a person').fill('zzz-no-member');
        await users_req;
        await expect(page.getByRole('listbox', { name: 'People' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Add member' })).toBeDisabled();
    });

    test('add member validates the person', async ({ page }) => {
        const realm = await api_create_realm(page, 'e2e-add', 'Detail');
        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings'));
        await expect(page.getByRole('heading', { name: 'Members', level: 2 })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'Add member' })).toBeDisabled();

        await page.getByLabel('Find a person').fill('not-an-email');
        await expect(page.getByRole('button', { name: /invite by email/i })).toHaveCount(0);
        await page.getByLabel('Find a person').fill('someone@example.com');
        await expect(page.getByRole('button', { name: /invite by email/i })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add member' })).toBeDisabled();
    });
});

test.describe('Realms — negative', () => {
    test('unauthenticated realms redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/realms');
    });

    test('create without a name is blocked', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await open_new_realm(page);
        await expect(page.getByLabel('Realm name')).toHaveValue('');
        await expect(page.getByRole('button', { name: /^create realm$/i })).toBeDisabled();
        await page.getByLabel('Realm name').fill('   ');
        await expect(page.getByRole('button', { name: /^create realm$/i })).toBeDisabled();
    });

    test('duplicate realm slug is rejected', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const existing = await api_create_realm(page, 'e2e-dup', 'First');

        await open_new_realm(page);
        await fill_new_realm(page, existing.slug, `Second ${existing.slug}`);
        await expect_alert(page, /already exists/i);
        await expect(page.getByRole('button', { name: /^create realm$/i })).toBeVisible();
    });
});

test.describe('Daemons — positive / negative', () => {
    test('root /daemons opens the default realm daemons', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_default_realm(page);
        await page.goto('/daemons');
        await page.waitForURL(new RegExp(`/o/${realm.org_slug}/realms/${realm.slug}/daemons`), { timeout: 10_000 });
    });

    test('daemons page loads for member', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_default_realm(page);
        await page.goto(realm_url(realm.org_slug, realm.slug, 'daemons'));
        await expect(
            page.getByRole('navigation', { name: 'Realm sections' }).getByRole('link', { name: 'Daemons', exact: true }),
        ).toHaveAttribute('aria-current', 'page', { timeout: 10_000 });
        await expect(
            page.getByText(/no daemons in this realm yet/i)
                .or(page.locator('[data-testid^="daemon-"]').first()),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('group', { name: 'Status' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    });

    test('list POST includes the realm when page loads', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_default_realm(page);

        const list_req = page.waitForRequest((req) => {
            if (!req.url().includes('/v1/realm_daemons/get') || req.method() !== 'POST') return false;
            const body = req.postDataJSON() as { org_slug?: string; slug?: string };
            return body?.org_slug === realm.org_slug && body?.slug === realm.slug;
        });
        await page.goto(realm_url(realm.org_slug, realm.slug, 'daemons'));
        await list_req;
    });

    test('add a machine link opens realm access tokens', async ({ page }) => {
        test.setTimeout(60_000);
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_create_realm(page, 'e2e-dlink', 'Daemons');

        await page.goto(realm_url(realm.org_slug, realm.slug, 'daemons'));
        await expect(page.getByText(/no daemons in this realm yet/i)).toBeVisible({ timeout: 15_000 });
        await page.getByRole('link', { name: 'Settings › Access tokens' }).click();
        await expect(page).toHaveURL(new RegExp(`/realms/${realm.slug}/settings\\?section=tokens`));
        await expect(page.getByRole('heading', { name: 'Access tokens', level: 2 })).toBeVisible({ timeout: 10_000 });
    });

    test('token without a name cannot be created', async ({ page }) => {
        test.setTimeout(60_000);
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_create_realm(page, 'e2e-mintval', 'Mint');

        await page.goto(realm_url(realm.org_slug, realm.slug, 'settings?section=tokens'));
        await expect(page.getByRole('heading', { name: 'Access tokens', level: 2 })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByLabel('Token name')).toHaveValue('');
        await expect(page.getByRole('button', { name: /^create token$/i })).toBeDisabled();
        await page.getByLabel('Token name').fill('   ');
        await expect(page.getByRole('button', { name: /^create token$/i })).toBeDisabled();
    });

    test('unauthenticated daemons redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/daemons');
    });

    test('overview daemon counts match daemons list for the same user', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const org_id = await api_current_org_id(page);

        const overview = await expect_api_ok(await api_post(page, '/v1/overview/get', { org_ids: [org_id] }));
        const overview_data = overview.data as { orgs: Array<{ id: string; counts: { daemons_total: number; daemons_online: number } }> };
        const org = overview_data.orgs.find((o) => o.id === org_id);
        expect(org, `org ${org_id} missing from overview: ${JSON.stringify(overview)}`).toBeTruthy();

        const listed = await expect_api_ok(await api_post(page, '/v1/daemons/get', { org_id, limit: 200 }));
        const list_data = listed.data as { items: Array<{ status?: string }>; total: number };
        const online = list_data.items.filter((d) => d.status === 'online').length;
        expect(org!.counts.daemons_total).toBe(list_data.total);
        expect(org!.counts.daemons_online).toBe(online);
    });
});
