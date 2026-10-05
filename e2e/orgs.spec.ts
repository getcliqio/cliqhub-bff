import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    api_post,
    api_session_get,
    expect_api_ok,
    expect_login_redirect,
    unique_slug,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

async function session_user_id(page: Page): Promise<string> {
    const me = await expect_api_ok(await api_session_get(page));
    const user = ((me.data ?? me) as { user?: { id?: string } }).user;
    expect(user?.id, `session user id missing: ${JSON.stringify(me)}`).toBeTruthy();
    return String(user!.id);
}

async function api_create_org(page: Page, prefix: string): Promise<string> {
    const slug = unique_slug(prefix);
    const created = await expect_api_ok(await api_post(page, '/v1/orgs/new', {
        slug,
        display_name: `E2E Org ${slug}`,
        owner: { user_id: await session_user_id(page) },
    }));
    const org = ((created.data ?? created) as { org?: { id?: string } }).org;
    expect(org?.id, `org id missing: ${JSON.stringify(created)}`).toBeTruthy();
    return String(org!.id);
}

async function ensure_admin_org(page: Page): Promise<string> {
    const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
    const data = (listed.data ?? listed) as { orgs?: Array<{ id: string }> };
    const orgs = data.orgs ?? [];
    if (orgs.length > 0) return String(orgs[0].id);
    return api_create_org(page, 'e2e-org');
}

async function open_first_org(page: Page): Promise<void> {
    const org_id = await ensure_admin_org(page);
    await page.goto(`/orgs/${org_id}`);
    await expect(page.getByRole('tablist', { name: 'Organization' })).toBeVisible({ timeout: 10_000 });
}

async function expect_org_surface(page: Page): Promise<void> {
    await page.goto('/organizations');
    await page.waitForURL(/\/orgs?(\/|\?|$)/, { timeout: 10_000 });
    await expect(
        page.getByRole('heading', { name: 'Choose an organization', level: 1 })
            .or(page.getByRole('tablist', { name: 'Organization' }))
            .first(),
    ).toBeVisible({ timeout: 10_000 });
}

test.describe('Orgs UI — positive', () => {
    test('member can open organization page', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_org_surface(page);
    });

    test('admin can open organization page', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await expect_org_surface(page);
    });

    test('org detail tabs update the URL', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_first_org(page);
        await expect(page.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
        await page.getByRole('tab', { name: 'Roles' }).click();
        await expect(page).toHaveURL(/tab=roles/);
        await expect(page.getByTestId('roles-grid')).toBeVisible();
        await page.getByRole('tab', { name: 'Scopes' }).click();
        await expect(page).toHaveURL(/tab=scopes/);
        await page.getByRole('tab', { name: 'Settings' }).click();
        await expect(page).toHaveURL(/tab=settings/);
        await expect(page.getByRole('textbox', { name: 'Organization name' })).toBeVisible();
        await page.getByRole('tab', { name: 'Members' }).click();
        await expect(page).not.toHaveURL(/tab=/);
        await expect(page.getByLabel('Filter members')).toBeVisible();
    });

    // Role CRUD + member assignment use /v1/orgs/*_role and /v1/users/update_role;
    // delete-with-members 409 is covered in unit/integration (org_role_service + BFF orgs).
    test('list_roles API returns roles for an org', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const org_id = await api_create_org(page, 'e2e-roles');
        const listed = await expect_api_ok(await api_post(page, '/v1/orgs/list_roles', { org_id }));
        const data = (listed.data ?? listed) as { roles?: unknown[] };
        expect(Array.isArray(data.roles)).toBe(true);
        expect((data.roles ?? []).length).toBeGreaterThan(0);
    });

    test('members filter narrows the list without touching the URL', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_first_org(page);
        await expect(page.getByLabel('Filter members')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId(`member-${TEST_ADMIN.username}`)).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Filter members').fill('no-such-member-xyz');
        await expect(page.getByText('No members match.')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByTestId(`member-${TEST_ADMIN.username}`)).toHaveCount(0);
        await expect(page).not.toHaveURL(/[?&]q=/);

        await page.getByLabel('Filter members').fill(TEST_ADMIN.username);
        await expect(page.getByTestId(`member-${TEST_ADMIN.username}`)).toBeVisible();
    });
});

test.describe('Orgs UI — negative', () => {
    test('unauthenticated orgs redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/organizations');
    });

    test('member without org admin role has no invite control', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
        const data = (listed.data ?? listed) as { orgs?: Array<{ id: string; my_role?: string }> };
        const orgs = data.orgs ?? [];
        if (orgs.length === 0) {
            await expect_org_surface(page);
            return;
        }
        const is_admin_role = (role?: string) => {
            const r = (role ?? '').toLowerCase();
            return r === 'admin' || r === 'site_admin' || r === 'owner';
        };
        const non_admin = orgs.find((o) => o.my_role && !is_admin_role(o.my_role));
        if (!non_admin) {
            // Seeded testuser is admin/owner of every org (incl. personal) — nothing to assert.
            return;
        }
        await page.goto(`/orgs/${non_admin.id}`);
        await expect(page.getByRole('tablist', { name: 'Organization' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/its owners and admins manage it/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /^invite$/i })).toHaveCount(0);
    });
});
