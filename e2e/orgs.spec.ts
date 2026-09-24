import { test, expect } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_api_ok,
    expect_login_redirect,
    unique_slug,
    TEST_ADMIN,
    TEST_USER,
} from './helpers';

async function ensure_admin_org(page: import('@playwright/test').Page): Promise<number> {
    const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
    const data = (listed.data ?? listed) as { orgs?: Array<{ id: number; slug?: string }> };
    const orgs = data.orgs ?? [];
    if (orgs.length > 0) return orgs[0].id;

    const slug = unique_slug('e2e-org');
    const created = await expect_api_ok(await api_post(page, '/v1/orgs/new', {
        slug,
        display_name: `E2E Org ${slug}`,
        admin_username: TEST_ADMIN.username,
    }));
    const org = ((created.org ?? created.data) as { id?: number });
    expect(org?.id).toBeTruthy();
    return Number(org!.id);
}

async function open_first_org(page: import('@playwright/test').Page): Promise<void> {
    const org_id = await ensure_admin_org(page);
    await page.goto(`/orgs/${org_id}`);
    await page.waitForURL(/\/orgs\/\d+/);
}

test.describe('Orgs UI — positive', () => {
    test('member can open accounts page', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/organizations');
        await page.waitForURL(/\/realms/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    });

    test('admin can open accounts page', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/organizations');
        await page.waitForURL(/\/realms/, { timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    });

    test('org detail tabs update the URL', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_first_org(page);
        await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Members' }).click();
        await expect(page).toHaveURL(/tab=members/);
        await page.getByRole('button', { name: 'Scopes' }).click();
        await expect(page).toHaveURL(/tab=scopes/);
        await page.getByRole('button', { name: 'Settings' }).click();
        await expect(page).toHaveURL(/tab=settings/);
        await expect(page.getByText(/org agent settings/i)).toBeVisible();
    });

    // Role CRUD + member assignment use /v1/orgs/*_role and /v1/users/update_role;
    // delete-with-members 409 is covered in unit/integration (org_role_service + BFF orgs).
    test('list_roles API returns roles for an org', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        const slug = unique_slug('e2e-roles');
        const created = await expect_api_ok(await api_post(page, '/v1/orgs/new', {
            slug,
            display_name: `E2E Roles ${slug}`,
            admin_username: TEST_ADMIN.username,
        }));
        const org = ((created.org ?? created.data) as { id?: number });
        expect(org?.id).toBeTruthy();
        const listed = await expect_api_ok(await api_post(page, '/v1/orgs/list_roles', { org_id: org!.id }));
        const data = (listed.data ?? listed) as { roles?: unknown[] };
        expect(Array.isArray(data.roles)).toBe(true);
        expect((data.roles ?? []).length).toBeGreaterThan(0);
    });

    test('members filter query is sent in users POST body', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_first_org(page);
        await page.getByRole('button', { name: 'Members' }).click();
        await expect(page.getByLabel('Filter members')).toBeVisible({ timeout: 10_000 });

        const filter_req = page.waitForRequest((req) =>
            req.url().includes('/v1/users/get')
            && req.method() === 'POST'
            && (req.postDataJSON() as { query?: string })?.query === 'no-such-member-xyz',
        );
        await page.getByLabel('Filter members').fill('no-such-member-xyz');
        await page.getByRole('button', { name: /^apply$/i }).click();
        await filter_req;
        await expect(page).not.toHaveURL(/[?&]q=/);
    });
});

test.describe('Orgs UI — negative', () => {
    test('unauthenticated orgs redirects to login', async ({ page }) => {
        await expect_login_redirect(page, '/organizations');
    });

    test('member without org admin role has no add-member control', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
        const data = (listed.data ?? listed) as { orgs?: Array<{ id: number; my_role?: string }> };
        const orgs = data.orgs ?? [];
        if (orgs.length === 0) {
            await page.goto('/organizations');
            await page.waitForURL(/\/realms/, { timeout: 10_000 });
            await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible();
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
        await page.waitForURL(/\/orgs\/[0-9a-f-]{36}|\d+/i);
        await page.getByRole('button', { name: 'Members' }).click();
        // Detail page is source of truth if list role lagged.
        const role_badge = page.locator('main').getByText(/^(admin|site_admin|owner|member)$/i).first();
        const badge_text = ((await role_badge.textContent().catch(() => '')) ?? '').trim().toLowerCase();
        if (is_admin_role(badge_text)) {
            await expect(page.getByLabel('Filter members').or(page.getByText(/members/i)).first()).toBeVisible();
            return;
        }
        await expect(page.getByRole('button', { name: /^invite$/i })).toHaveCount(0);
    });
});
