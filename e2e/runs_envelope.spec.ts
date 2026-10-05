/**
 * RUN-ENV — browser + API proof that RunController returns `{ ok, data }`.
 */
import { test, expect, type Page } from '@playwright/test';
import {
    api_login,
    api_post,
    expect_api_ok,
    realm_url,
    TEST_USER,
} from './helpers';

type Realm_row = { id: string; slug: string; org_slug: string; org_id: string };

/** First realm from `realms/get` (`data.items` PagedData), with its org id from `orgs/get`. */
async function first_realm(page: Page): Promise<Realm_row> {
    const body = await expect_api_ok(await api_post(page, '/v1/realms/get', {}));
    const items = ((body.data as { items?: Array<Partial<Realm_row>> } | undefined)?.items) ?? [];
    expect(items.length, `expected a realm: ${JSON.stringify(body)}`).toBeGreaterThan(0);
    const realm = items[0]!;
    expect(realm.slug).toBeTruthy();
    expect(realm.org_slug).toBeTruthy();

    const listed = await expect_api_ok(await api_post(page, '/v1/orgs/get', { mine: true }));
    const orgs = ((listed.data as { orgs?: Array<{ id?: string; slug?: string }> } | undefined)?.orgs) ?? [];
    const org = orgs.find((o) => o.slug === realm.org_slug);
    expect(org?.id, `org ${realm.org_slug} missing: ${JSON.stringify(listed)}`).toBeTruthy();
    return {
        id: String(realm.id ?? ''),
        slug: String(realm.slug),
        org_slug: String(realm.org_slug),
        org_id: String(org!.id),
    };
}

test.describe('Runs envelope — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('runs/get returns data.items PagedData', async ({ page }) => {
        const realm = await first_realm(page);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get', {
            org_id: realm.org_id,
            realm_id: realm.id,
            limit: 10,
            offset: 0,
        }));
        const data = body.data as { items: unknown; total: unknown; offset: unknown; limit: unknown };
        expect(data).toBeTruthy();
        expect(Array.isArray(data.items)).toBe(true);
        expect(typeof data.total).toBe('number');
        expect(data.offset).toBe(0);
        expect(data.limit).toBe(10);
        expect(body.runs).toBeUndefined();
    });

    test('runs page loads and issues enveloped realm_runs read', async ({ page }) => {
        const realm = await first_realm(page);
        const runs_res = page.waitForResponse((res) =>
            res.url().includes('/v1/realm_runs/get')
            && res.request().method() === 'POST'
            && res.status() === 200,
        );
        await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
        const res = await runs_res;
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(Array.isArray(json.data?.items)).toBe(true);
        expect(typeof json.data?.total).toBe('number');
        expect(json.data?.realm?.id).toBe(realm.id);
        expect(json.runs).toBeUndefined();
        expect(json.items).toBeUndefined();
    });
});

test.describe('Runs envelope — negative', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('org-scoped get without org_id is rejected', async ({ page }) => {
        const res = await api_post(page, '/v1/runs/get', { limit: 5 });
        expect(res.status()).toBe(422);
    });
});
