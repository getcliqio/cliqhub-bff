import { test, expect } from '@playwright/test';
import { api_login, api_post, expect_api_ok, TEST_ADMIN, TEST_USER } from './helpers';

const MINIMAL_TEAM = {
    name: 'e2e-builder-team',
    description: 'E2E builder canvas fixture',
    phases: [{ name: 'dev', type: 'standard', depends_on: [] }],
    roles: [{
        name: 'dev',
        content: 'You are a developer. Implement the change with tests and clear docs.',
    }],
};

async function open_builder_canvas(page: import('@playwright/test').Page): Promise<void> {
    const me = await expect_api_ok(await api_post(page, '/v1/session/get', {}));
    const me_data = (me.data ?? me) as {
        user?: { username?: string };
        scopes?: Array<{ slug?: string; scope_type?: string }>;
    };
    const username = me_data.user?.username ?? '';
    const scopes = me_data.scopes ?? [];
    // Prefer personal/user scope — first listed scope can be an org the PAT cannot write.
    const scope =
        scopes.find((s) => s.slug === username)?.slug
        ?? scopes.find((s) => s.scope_type === 'user' || s.scope_type === 'personal')?.slug
        ?? scopes[0]?.slug;
    expect(scope, `writable scope missing: ${JSON.stringify(me)}`).toBeTruthy();
    const body = await expect_api_ok(await api_post(page, '/v1/teams/create', {
        name: `e2e-builder-${Date.now()}`,
        scope,
        team_json: JSON.stringify(MINIMAL_TEAM),
    }));
    const draft = (body.data ?? body) as { id?: string; team_id?: string };
    const draft_id = draft.id ?? draft.team_id;
    expect(draft_id, `draft id missing: ${JSON.stringify(body)}`).toBeTruthy();
    await page.goto(`/builder?draft=${draft_id}`);
    // Compact inspector uses title="Add phase" with accessible name "+".
    await expect(page.getByTitle('Add phase')).toBeVisible({ timeout: 15_000 });
}

test.describe('Builder — positive', () => {
    test('builder spark view loads for admin', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await page.goto('/builder');
        await expect(page.getByRole('heading', { name: /build a team/i })).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByText(/what team do you want to build/i)
                .or(page.getByRole('button', { name: /build my team/i }))
                .or(page.getByPlaceholder(/development team/i))
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('builder loads for member', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await page.goto('/builder');
        await expect(page.getByRole('heading', { name: /build a team/i })).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByText(/what team do you want to build/i)
                .or(page.getByRole('button', { name: /build my team/i }))
                .or(page.getByPlaceholder(/development team/i))
                .first(),
        ).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Builder — negative / constraints', () => {
    test('add phase options exclude legacy hug/exec types when canvas open', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_builder_canvas(page);

        await page.getByTitle('Add phase').click();
        const joined = (await page.getByRole('button').allTextContents()).join(' ').toLowerCase();
        expect(joined).toContain('standard');
        expect(joined).toContain('gate');
        expect(joined).toContain('team');
        expect(joined).not.toMatch(/\bhug\b/);
        expect(joined).not.toMatch(/\bexec\b/);
        expect(joined).not.toMatch(/\bpull\b/);
        expect(joined).not.toMatch(/\bpush\b/);
    });
});
