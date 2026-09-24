import { type APIResponse, type Page, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const TEST_ADMIN = {
    username: 'admin',
    password: 'admin123',
};

export const TEST_USER = {
    username: 'testuser',
    password: 'testpass123!',
};

export const TEST_SUSPENDED = {
    username: 'suspended_user',
    password: 'any-password',
};

const JSON_HEADERS = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

export type Realm_ref = {
    id: string;
    slug: string;
    org_slug: string;
    name: string;
};

/** Unique slug for create flows (lowercase alphanumeric + hyphens). */
export function unique_slug(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`.slice(0, 40);
}

/** Canonical org-scoped realm URL. */
export function realm_url(org_slug: string, realm_slug: string, sub = ''): string {
    const base = `/o/${org_slug}/realms/${realm_slug}`;
    return sub ? `${base}/${sub.replace(/^\//, '')}` : base;
}

/**
 * Log in via the UI login form and wait for navigation.
 */
export async function ui_login(page: Page, username: string, password: string): Promise<void> {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/**
 * Log in via BFF session create through the Vite proxy (same origin as the SPA).
 */
export async function api_login(page: Page, username: string, password: string): Promise<void> {
    const response = await page.request.post('/v1/session/create', {
        data: { username, password },
        headers: JSON_HEADERS,
    });
    expect(response.ok(), `session create failed for ${username}: ${response.status()}`).toBe(true);
}

/**
 * Current session identity via BFF session get.
 */
export async function api_session_get(page: Page): Promise<APIResponse> {
    return page.request.post('/v1/session/get', {
        data: {},
        headers: JSON_HEADERS,
    });
}

/**
 * Act-as (or exit with null) via BFF session update.
 */
export async function api_act_as(
    page: Page,
    act_as_user_id: number | null,
): Promise<APIResponse> {
    return page.request.post('/v1/session/update', {
        data: { act_as_user_id },
        headers: JSON_HEADERS,
    });
}

/**
 * Log out via BFF session delete.
 */
export async function api_logout(page: Page): Promise<void> {
    await page.request.post('/v1/session/delete', { data: {}, headers: JSON_HEADERS });
}

/** POST JSON to BFF with session cookies. */
export async function api_post(
    page: Page,
    path: string,
    data: Record<string, unknown> = {},
): Promise<APIResponse> {
    return page.request.post(path, { data, headers: JSON_HEADERS });
}

export async function expect_api_ok(res: APIResponse): Promise<Record<string, unknown>> {
    const body = await res.json();
    expect(res.ok(), `expected ok status, got ${res.status()} ${JSON.stringify(body)}`).toBe(true);
    expect(body.ok).toBe(true);
    return body as Record<string, unknown>;
}

export async function expect_api_denied(res: APIResponse): Promise<void> {
    expect([401, 403]).toContain(res.status());
}

/** Assert protected page redirects unauthenticated users to login. */
export async function expect_login_redirect(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10_000 });
    expect(page.url()).toContain('/login');
}

/** Assert non-admin is bounced out of /admin. */
export async function expect_admin_blocked(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin/');
}

/**
 * Assert that a role="alert" banner is visible with the given text.
 */
export async function expect_alert(page: Page, text: string | RegExp): Promise<void> {
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).toContainText(text);
}

/**
 * Assert that no role="alert" banner is visible.
 */
export async function expect_no_alert(page: Page): Promise<void> {
    await expect(page.getByRole('alert')).not.toBeVisible();
}

/** Input immediately after a label sibling (no htmlFor). Exact label text. */
export function labeled_input(page: Page, label: string) {
    return page.locator(`xpath=//label[normalize-space()=${JSON.stringify(label)}]/following-sibling::input[1]`);
}

/** Create a realm via API; returns id/slug/org_slug/name. */
export async function api_create_realm(
    page: Page,
    prefix: string,
    name_prefix = 'E2E',
): Promise<Realm_ref> {
    const slug = unique_slug(prefix);
    const name = `${name_prefix} ${slug}`;
    const created = await expect_api_ok(await api_post(page, '/v1/realms/create', { slug, name }));
    const realm = (created.realm ?? created.data) as Partial<Realm_ref> | undefined;
    expect(realm?.id, `realm id missing: ${JSON.stringify(created)}`).toBeTruthy();
    expect(realm?.slug, `realm slug missing: ${JSON.stringify(created)}`).toBeTruthy();
    expect(realm?.org_slug, `realm org_slug missing: ${JSON.stringify(created)}`).toBeTruthy();
    return {
        id: String(realm!.id),
        slug: String(realm!.slug),
        org_slug: String(realm!.org_slug),
        name: String(realm!.name ?? name),
    };
}

/** First realm from list API (for default-realm navigation). */
export async function api_first_realm(page: Page): Promise<Realm_ref> {
    const body = await expect_api_ok(await api_post(page, '/v1/realms/get', {}));
    const realms = (body.realms ?? []) as Array<Partial<Realm_ref>>;
    expect(realms.length).toBeGreaterThan(0);
    const realm = realms[0];
    expect(realm.slug).toBeTruthy();
    expect(realm.org_slug).toBeTruthy();
    return {
        id: String(realm.id ?? ''),
        slug: String(realm.slug),
        org_slug: String(realm.org_slug),
        name: String(realm.name ?? realm.slug),
    };
}

/** Fresh tx_id for /v1/events/submit (inbound dedup middleware). */
export function new_tx_id(): string {
    return randomUUID();
}

/** Open the create-realm wizard from /realms. */
export async function open_create_realm(page: Page): Promise<void> {
    await page.goto('/realms');
    await expect(page.getByRole('heading', { name: 'Realms', level: 1 })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^create realm$/i }).click();
    await expect(page.getByRole('heading', { name: 'Create realm' })).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/create=1/);
}

/**
 * Fill identity step and create the realm, then skip optional wizard steps
 * so the app lands on the new realm detail page.
 */
export async function submit_create_realm(
    page: Page,
    slug: string,
    name: string,
): Promise<void> {
    await page.getByPlaceholder('prod-west').fill(slug);
    await page.getByPlaceholder('Prod West').fill(name);
    await page.getByRole('button', { name: /^create & continue$/i }).click();

    await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^skip$/i }).click();

    await expect(page.getByRole('button', { name: /^skip$/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /^skip$/i }).click();

    const finish = page.getByRole('button', { name: /skip & finish/i });
    await expect(finish).toBeVisible({ timeout: 10_000 });
    await finish.click();
    await page.waitForURL(/\/o\/[^/]+\/realms\/[^/?]+/, { timeout: 15_000 });
}
