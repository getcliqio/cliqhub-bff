/**
 * RUN-ENV lifecycle — enqueue → claim → execute → complete → browser detail.
 *
 * Boots an HTTP stub daemon Hub can reach, mints a realm token, registers the
 * daemon, seeds an installed team, enqueues a run, completes it on execute,
 * then proves SPA list/detail read the `{ ok, data }` envelopes.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { test, expect } from '@playwright/test';
import {
    api_login,
    api_create_realm,
    api_post,
    expect_api_ok,
    realm_url,
    TEST_USER,
} from './helpers';

const HUB_URL = (process.env.BACKEND_URL || 'http://localhost:4100').replace(/\/$/, '');
const DATABASE_URL = process.env.E2E_DATABASE_URL
    || 'postgresql://cliqhub:cliqhub@localhost:5432/cliqhub_e2e';

const MANIFEST = 'name: e2e-run\nversion: "1.0.0"\nphases: []\n';

type Stub_state = {
    server: http.Server;
    url: string;
    daemon_id: string;
    token: string;
    offers: number;
    executes: Array<Record<string, unknown>>;
    completed_run_ids: string[];
};

async function hub_post(
    path: string,
    token: string,
    body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
    const res = await fetch(`${HUB_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { status: res.status, json };
}

async function start_stub(token: string, daemon_id: string): Promise<Stub_state> {
    const state: Stub_state = {
        server: null as unknown as http.Server,
        url: '',
        daemon_id,
        token,
        offers: 0,
        executes: [],
        completed_run_ids: [],
    };

    state.server = http.createServer(async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        const json = raw ? JSON.parse(raw) as Record<string, unknown> : {};

        if (req.method === 'POST' && req.url === '/v1/offer_job') {
            state.offers += 1;
            const queue_item_id = String(json.queue_item_id ?? '');
            const claim = await hub_post('/v1/runs/claim', state.token, {
                queue_item_id,
                daemon_id: state.daemon_id,
            });
            const claimed = claim.status === 200;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ok: true,
                claimed,
                daemon_id: state.daemon_id,
                hub_status: claim.status,
            }));
            return;
        }

        if (req.method === 'POST' && req.url === '/v1/execute') {
            state.executes.push(json);
            const run_id = String(json.run_id ?? '');
            if (run_id) {
                // Simulate a successful local run and mirror complete to Hub.
                // with_dedup requires tx_id on /v1/runs/complete.
                const complete = await hub_post('/v1/runs/complete', state.token, {
                    tx_id: randomUUID(),
                    run_id,
                    state: 'completed',
                });
                if (complete.status < 200 || complete.status >= 300) {
                    // Surface Hub reject so the e2e failure is actionable.
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ok: false,
                        error: 'complete_failed',
                        hub_status: complete.status,
                        hub_body: complete.json,
                    }));
                    return;
                }
                state.completed_run_ids.push(run_id);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, accepted: true, run_id }));
            return;
        }

        res.writeHead(404);
        res.end();
    });

    await new Promise<void>((resolve) => {
        state.server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = state.server.address() as AddressInfo;
    state.url = `http://127.0.0.1:${addr.port}`;
    return state;
}

async function stop_stub(stub: Stub_state): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        stub.server.close((err) => (err ? reject(err) : resolve()));
    });
}

async function seed_daemon_team(daemon_id: string): Promise<string> {
    const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
    const team_id = randomUUID();
    const now = Date.now();
    try {
        const scope = await pool.query(
            `SELECT id FROM cliq.scopes WHERE slug = 'cliq' LIMIT 1`,
        );
        expect(scope.rows[0]?.id, 'cliq scope missing in e2e DB').toBeTruthy();
        const scope_id = String(scope.rows[0].id);
        await pool.query(
            `INSERT INTO cliq.teams
                (id, daemon_id, scope_id, slug, version, description, manifest, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
            [
                team_id,
                daemon_id,
                scope_id,
                `e2e-run-${team_id.slice(0, 8)}`,
                '1.0.0',
                'e2e lifecycle team',
                MANIFEST,
                now,
            ],
        );
        return team_id;
    } finally {
        await pool.end();
    }
}

test.describe('Runs lifecycle — enqueue claim execute complete', () => {
    test('stub daemon runs a job and SPA shows completed enveloped detail', async ({ page }) => {
        test.setTimeout(120_000);

        await api_login(page, TEST_USER.username, TEST_USER.password);
        const realm = await api_create_realm(page, 'e2e-run', 'RunLife');

        const minted = await expect_api_ok(await api_post(page, '/v1/auth/generate_token', {
            type: 'realm',
            name: `e2e-daemon-${Date.now()}`,
            realm_ids: [realm.id],
        }));
        const mint_data = (minted.data ?? minted) as { token?: string };
        expect(mint_data.token, `token missing: ${JSON.stringify(minted)}`).toBeTruthy();
        const daemon_token = String(mint_data.token);

        const daemon_id = `e2e-d-${randomUUID().slice(0, 8)}`;
        const stub = await start_stub(daemon_token, daemon_id);
        try {
            const registered = await hub_post('/v1/daemons/register', daemon_token, {
                realm_id: realm.id,
                daemon_id,
                hostname: 'e2e-stub',
                public_url: stub.url,
                name: 'e2e-stub-daemon',
                port: Number(new URL(stub.url).port),
            });
            expect(
                registered.status,
                `register failed: ${registered.status} ${JSON.stringify(registered.json)}`,
            ).toBe(200);
            expect(registered.json.ok).toBe(true);

            const hb = await hub_post('/v1/daemons/heartbeat', daemon_token, { daemon_id });
            expect(hb.status, `heartbeat failed: ${JSON.stringify(hb.json)}`).toBe(200);

            const team_id = await seed_daemon_team(daemon_id);
            const workspace_path = `/tmp/e2e-run-${randomUUID().slice(0, 8)}`;
            const run_name = `e2e-lifecycle-${Date.now()}`;

            const enqueue_body = await expect_api_ok(await api_post(page, '/v1/runs/enqueue', {
                realm_id: realm.id,
                team_id,
                workspace_path,
                manifest_yaml: MANIFEST,
                run_name,
                payload: {
                    team_id,
                    workspace_path,
                    manifest_yaml: MANIFEST,
                    run_name,
                },
            }));
            const enqueue_data = (enqueue_body.data ?? enqueue_body) as {
                item?: { run_id?: string; status?: string; claimed_by?: string };
                run_id?: string;
            };
            const run_id = String(
                enqueue_data.item?.run_id
                ?? enqueue_data.run_id
                ?? '',
            );
            expect(run_id, `enqueue did not create run: ${JSON.stringify(enqueue_body)}`).toBeTruthy();
            expect(stub.offers).toBeGreaterThanOrEqual(1);

            // Outbox delivers /v1/execute; stub completes the run.
            await expect.poll(async () => {
                const body = await expect_api_ok(await api_post(page, '/v1/runs/get_by_id', { run_id }));
                const run = (body.data ?? body.run ?? body) as { state?: string; run_id?: string };
                return run.state ?? '';
            }, { timeout: 45_000 }).toBe('completed');

            expect(stub.executes.length).toBeGreaterThanOrEqual(1);
            expect(stub.completed_run_ids).toContain(run_id);

            const detail_api = await expect_api_ok(await api_post(page, '/v1/runs/get_by_id', { run_id }));
            expect(detail_api).toHaveProperty('data');
            expect(detail_api).not.toHaveProperty('run');
            const run_data = detail_api.data as { run_id: string; state: string; run_name?: string | null };
            expect(run_data.run_id).toBe(run_id);
            expect(run_data.state).toBe('completed');

            const detail_wait = page.waitForResponse((res) =>
                res.url().includes('/v1/runs/get_by_id')
                && res.request().method() === 'POST'
                && res.status() === 200,
            );
            const [detail_http] = await Promise.all([
                detail_wait,
                page.goto(realm_url(realm.org_slug, realm.slug, `runs/${run_id}`)),
            ]);
            const detail_json = await detail_http.json();
            expect(detail_json.ok).toBe(true);
            expect(detail_json.data?.run_id ?? detail_json.data).toBeTruthy();
            expect(detail_json.run).toBeUndefined();

            await expect(page.getByRole('heading', { name: run_name })).toBeVisible({
                timeout: 15_000,
            });
            // Badge text is lowercase in DOM; CSS uppercases for display.
            await expect(page.locator('span.uppercase', { hasText: /^completed$/i })).toBeVisible({
                timeout: 10_000,
            });

            const list_wait = page.waitForResponse((res) =>
                res.url().includes('/v1/runs/get')
                && !res.url().includes('get_by_id')
                && !res.url().includes('get_status')
                && !res.url().includes('get_telemetry')
                && res.request().method() === 'POST'
                && res.status() === 200,
            );
            const [list_http] = await Promise.all([
                list_wait,
                page.goto(realm_url(realm.org_slug, realm.slug, 'runs')),
            ]);
            const list_json = await list_http.json();
            expect(list_json.ok).toBe(true);
            expect(Array.isArray(list_json.data?.items)).toBe(true);
            expect(list_json.runs).toBeUndefined();
            const listed = (list_json.data.items as Array<{ run_id: string }>).some(
                (r) => r.run_id === run_id,
            );
            expect(listed).toBe(true);
        } finally {
            await stop_stub(stub);
        }
    });
});
