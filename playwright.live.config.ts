import { defineConfig, devices } from '@playwright/test';

/**
 * Run against deployed https://cliqhub.io (no local webServer).
 * Usage: npx playwright test --config=playwright.live.config.ts
 */
const APP_URL = process.env.APP_URL || 'https://cliqhub.io';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 1,
	workers: 1,
	reporter: 'list',
	timeout: 45_000,
	globalSetup: './e2e/global_setup_live.ts',

	use: {
		baseURL: APP_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		extraHTTPHeaders: {
			'X-Requested-With': 'XMLHttpRequest',
		},
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
