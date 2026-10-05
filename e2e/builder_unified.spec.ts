import { test, expect, type Page } from '@playwright/test';
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

const PALETTE_TILES = ['agent', 'gate', 'human', 'connector', 'script', 'fetch', 'team'];

async function open_builder_canvas(page: Page): Promise<void> {
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
    await expect(page.getByTestId('build-panel')).toBeVisible({ timeout: 15_000 });
}

async function expect_builder_start(page: Page): Promise<void> {
    await page.goto('/builder');
    await expect(page.getByRole('heading', { name: 'What should your team do?', level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Describe your team')).toBeVisible();
    await expect(page.getByRole('button', { name: /generate team/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /blank canvas/i })).toBeVisible();
}

test.describe('Builder — positive', () => {
    test('builder start view loads for admin', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await expect_builder_start(page);
    });

    test('builder loads for member', async ({ page }) => {
        await api_login(page, TEST_USER.username, TEST_USER.password);
        await expect_builder_start(page);
    });
});

test.describe('Builder — negative / constraints', () => {
    test('add-phase palette excludes legacy hug/exec/pull/push types when canvas open', async ({ page }) => {
        await api_login(page, TEST_ADMIN.username, TEST_ADMIN.password);
        await open_builder_canvas(page);

        const panel = page.getByTestId('build-panel');
        await expect(panel.getByText('Add a phase')).toBeVisible();
        for (const kind of PALETTE_TILES) {
            await expect(panel.getByTestId(`tile-${kind}`)).toBeVisible();
        }
        for (const legacy of ['hug', 'exec', 'pull', 'push', 'standard']) {
            await expect(panel.getByTestId(`tile-${legacy}`)).toHaveCount(0);
        }
        const tiles = (await panel.locator('[data-testid^="tile-"]').allTextContents()).join(' ').toLowerCase();
        expect(tiles).not.toMatch(/\bhug\b/);
        expect(tiles).not.toMatch(/\bexec\b/);
        expect(tiles).not.toMatch(/\bpull\b/);
        expect(tiles).not.toMatch(/\bpush\b/);
    });
});
