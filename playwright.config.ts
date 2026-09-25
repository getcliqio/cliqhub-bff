import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Prefer free local ports — :3000/:4000 are often taken by other projects. */
const APP_URL = process.env.APP_URL || 'http://localhost:3010';
const BFF_URL = process.env.BFF_URL || 'http://localhost:3001';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4100';
/** E2E must use local Postgres — never the Railway URL from service .env files. */
const DATABASE_URL = process.env.E2E_DATABASE_URL
    || 'postgresql://cliqhub:cliqhub@localhost:5432/cliqhub';

function port_from_url(url: string, fallback: number): number {
    try {
        const port = Number(new URL(url).port);
        if (Number.isFinite(port) && port > 0) return port;
        return fallback;
    } catch {
        return fallback;
    }
}

/** Load KEY=VALUE pairs from a .env file without overriding `overrides`. */
function load_dotenv(file_path: string, overrides: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = { ...overrides };
    if (!fs.existsSync(file_path)) return out;

    for (const line of fs.readFileSync(file_path, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (out[key] !== undefined) continue;
        out[key] = value;
    }
    return out;
}

const app_port = port_from_url(APP_URL, 3010);
const bff_port = port_from_url(BFF_URL, 3001);
const backend_port = port_from_url(BACKEND_URL, 4100);

/** Split-repo layout: Core + BFF + Frontend are sibling checkouts. */
const core_root = path.resolve(__dirname, '../cliqhub-core');
const frontend_root = path.resolve(__dirname, '../cliqhub-frontend');

const backend_env = load_dotenv(
    path.join(core_root, '.env'),
    {
        PORT: String(backend_port),
        DATABASE_URL,
        ALLOWED_ORIGINS: `${APP_URL},${BFF_URL},http://localhost:3000,http://localhost:3001,http://localhost:3010`,
        NODE_ENV: 'development',
        // E2E fixtures use stable ids; remint races with concurrent boots.
        CLIQHUB_SKIP_UUID_REMINT: '1',
    },
);

const bff_env = load_dotenv(
    path.join(__dirname, '.env'),
    {
        PORT: String(bff_port),
        BACKEND_URL,
        CLIQ_API_URL: BACKEND_URL,
        DATABASE_URL,
        NODE_ENV: 'development',
    },
);

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    timeout: 30_000,
    globalSetup: './e2e/global_setup.ts',

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

    webServer: [
        {
            // No --env-file: that fights our local DATABASE_URL override.
            command: 'node dist/server.js',
            url: `${BACKEND_URL}/v1/health`,
            // Never reuse: local .env often points at Railway; e2e must use E2E_DATABASE_URL.
            reuseExistingServer: false,
            timeout: 90_000,
            cwd: core_root,
            env: { ...process.env, ...backend_env },
        },
        {
            command: 'node dist/server.js',
            url: `${BFF_URL}/bff-health`,
            reuseExistingServer: false,
            timeout: 90_000,
            cwd: __dirname,
            env: { ...process.env, ...bff_env },
        },
        {
            command: `npx vite --port ${app_port} --strictPort`,
            url: APP_URL,
            reuseExistingServer: false,
            timeout: 90_000,
            cwd: frontend_root,
        },
    ],
});
