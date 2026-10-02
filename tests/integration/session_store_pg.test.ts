/**
 * Sessions on a real Postgres (skipped when none is reachable): signing in,
 * restarting the BFF and coming back keeps the user signed in, and an older
 * `bff.sessions` table is upgraded in place, never rebuilt.
 *
 * Local run: a Postgres at CLIQ_BFF_TEST_DATABASE_URL
 * (default postgresql://cliqhub:cliqhub@localhost:5432/bfftest).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import pg from 'pg';
import { build_container } from '../../src/container.js';
import { create_app } from '../../src/app.js';
import { SessionStore } from '../../src/repositories/session_store.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { CoreCompatService } from '../../src/services/core_compat_service.js';
import { test_config } from '../helpers/test_container.js';

const database_url = process.env.CLIQ_BFF_TEST_DATABASE_URL ?? 'postgresql://cliqhub:cliqhub@localhost:5432/bfftest';
if (!/localhost|127\.0\.0\.1/.test(database_url)) throw new Error('session_store_pg tests run against a local Postgres only');

async function reachable(): Promise<boolean> {
    const c = new pg.Client({ connectionString: database_url, connectionTimeoutMillis: 1000 });
    try { await c.connect(); await c.end(); return true; } catch { return false; }
}
const has_pg = await reachable();

const USER = {
    id: '11111111-1111-4111-8111-111111111111', username: 'sapan', display_name: 'S', email: 's@x.test',
    role: 'user', suspended_at: null, suspended_reason: '', created_at: '2026-01-01T00:00:00Z', preferences: {},
};
const XRW = ['X-Requested-With', 'XMLHttpRequest'] as const;

/** One BFF process: its own store (pool) over the shared database. */
async function boot() {
    const config = { ...test_config(), database_url };
    const store = new SessionStore(config);
    await store.init();
    const core_compat = new CoreCompatService('http://core.test', 60_000, (async () => new Response('{}')) as typeof fetch);
    const container = build_container({ config, session_store: store, core_client: new CoreClient(config.core_api_url), core_compat });
    return { app: create_app(container), store };
}

describe.skipIf(!has_pg)('sessions on Postgres', () => {
    const admin = new pg.Pool({ connectionString: database_url });

    beforeAll(async () => {
        await admin.query('DROP SCHEMA IF EXISTS bff CASCADE');
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (String(url).endsWith('/internal/auth/authenticate_user')) {
                return new Response(JSON.stringify({ ok: true, data: { user: USER, token: 'cliq_tok_test', scopes: [], org_slugs: [], orgs: [] } }));
            }
            return new Response(JSON.stringify({ ok: true, data: {} }));
        }));
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        await admin.query('DROP SCHEMA IF EXISTS bff CASCADE');
        await admin.end();
    });

    it('a signed-in user stays signed in across a BFF restart', async () => {
        const first = await boot();
        const login = await request(first.app).post('/v1/session/create').set(...XRW).send({ username: 'sapan', password: 'pw' });
        expect(login.status).toBe(200);
        const cookie = String(login.headers['set-cookie'][0]).split(';')[0];
        await first.store.close();

        const second = await boot(); // restart: new process, same database
        const me = await request(second.app).post('/v1/session/get').set('Cookie', cookie).set(...XRW).send({});
        expect(me.status).toBe(200);
        expect(me.body.data.user.username).toBe('sapan');
        await second.store.close();
    });

    it('an older table (missing columns) is upgraded in place — rows kept', async () => {
        await admin.query('DROP SCHEMA IF EXISTS bff CASCADE');
        await admin.query('CREATE SCHEMA bff');
        await admin.query(`CREATE TABLE bff.sessions (
            session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, act_as_user_id TEXT NOT NULL, username TEXT NOT NULL,
            email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', actor_role TEXT NOT NULL DEFAULT 'user',
            actor_username TEXT NOT NULL, user_token TEXT NOT NULL, target_token TEXT NOT NULL,
            scopes_json TEXT NOT NULL DEFAULT '[]', org_slugs_json TEXT NOT NULL DEFAULT '[]',
            created_at BIGINT NOT NULL, last_active BIGINT NOT NULL, expires_at BIGINT NOT NULL)`);
        const now = Math.floor(Date.now() / 1000);
        await admin.query(
            `INSERT INTO bff.sessions VALUES ('sid-old', $1, $1, 'sapan', 's@x.test', 'user', 'user', 'sapan', 't', 't', '[]', '[]', $2, $2, $3)`,
            [USER.id, now, now + 3600],
        );

        const bff = await boot();
        const found = await bff.store.find('sid-old');
        expect(found?.username).toBe('sapan');
        expect(found?.orgs_json).toBe('[]');
        expect(found?.default_realm_id).toBeNull();
        await bff.store.close();
    });
});
