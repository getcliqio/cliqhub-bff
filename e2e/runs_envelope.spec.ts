/**
 * RUN-ENV — browser + API proof that RunController returns `{ ok, data }`.
 */
import { test, expect } from '@playwright/test';
import {
    api_login,
    api_first_realm,
    api_post,
    expect_api_ok,
    realm_url,
    TEST_USER,
} from './helpers';

test.describe('Runs envelope — positive', () => {
    test.beforeEach(async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
    });

    test('runs/get returns data.items PagedData', async ({ page }) => {
        const realm = await api_first_realm(page);
        const body = await expect_api_ok(await api_post(page, '/v1/runs/get', {
            org_id: realm.org_id,
            realm_id: realm.id,
            limit: 10,
            offset: 0,
        }));
        expect(body.data).toBeTruthy();
        expect(Array.isArray(body.data.items)).toBe(true);
        expect(typeof body.data.total).toBe('number');
        expect(body.data.offset).toBe(0);
        expect(body.data.limit).toBe(10);
        // Flat keys must not appear next to ok.
        expect(body.runs).toBeUndefined();
    });

    test('runs page loads and issues enveloped get', async ({ page }) => {
        const realm = await api_first_realm(page);
        const runs_res = page.waitForResponse((res) =>
            res.url().includes('/v1/runs/get')
            && res.request().method() === 'POST'
            && res.status() === 200,
        );
        await page.goto(realm_url(realm.org_slug, realm.slug, 'runs'));
        await expect(page.getByLabel('Search runs')).toBeVisible({ timeout: 10_000 });
        const res = await runs_res;
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data?.items ?? json.data).toBeTruthy();
        expect(json.runs).toBeUndefined();
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
