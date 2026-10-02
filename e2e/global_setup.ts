/**
 * Seed e2e fixture users on the e2e database.
 *
 * Login only reads the database, so active fixture users are seeded with their org,
 * org scope and default realm through scripts/seed_admin.mjs (Core models/services):
 *   admin    → org `cliq`, realm cliq.default (same as local dev)
 *   testuser → org `testuser`, realm testuser.default
 * The suspended user only needs a row.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { e2e_database_url } from './e2e_database';
import { TEST_ADMIN, TEST_SUSPENDED, TEST_USER } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));
const core_root = path.resolve(here, '../../cliqhub-core');
const seed_script = path.resolve(here, '../../scripts/seed_admin.mjs');

function seed_user(opts: {
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'user';
    org_slug: string;
    org_name: string;
}): void {
    execFileSync(process.execPath, [seed_script], {
        cwd: core_root,
        stdio: ['ignore', 'ignore', 'inherit'],
        env: {
            ...process.env,
            DATABASE_URL: e2e_database_url,
            ADMIN_USERNAME: opts.username,
            ADMIN_PASSWORD: opts.password,
            ADMIN_EMAIL: opts.email,
            ADMIN_ROLE: opts.role,
            ORG_SLUG: opts.org_slug,
            ORG_NAME: opts.org_name,
        },
    });
}

async function upsert_suspended_user(pool: pg.Pool): Promise<void> {
    const password_hash = await bcrypt.hash(TEST_SUSPENDED.password, 10);
    const suspended_at = new Date().toISOString();
    const updated = await pool.query(
        `UPDATE cliq.users SET password_hash = $1, suspended_at = $2 WHERE username = $3`,
        [password_hash, suspended_at, TEST_SUSPENDED.username],
    );
    if (updated.rowCount) return;
    await pool.query(
        `INSERT INTO cliq.users (id, username, email, password_hash, display_name, role, suspended_at, created_at)
         VALUES ($1, $2, $3, $4, $2, 'user', $5, NOW())`,
        [randomUUID(), TEST_SUSPENDED.username, 'suspended@test.com', password_hash, suspended_at],
    );
}

export default async function global_setup(): Promise<void> {
    seed_user({
        username: TEST_ADMIN.username,
        password: TEST_ADMIN.password,
        email: 'admin@cliqhub.io',
        role: 'admin',
        org_slug: 'cliq',
        org_name: 'Cliq',
    });
    seed_user({
        username: TEST_USER.username,
        password: TEST_USER.password,
        email: 'testuser@test.com',
        role: 'user',
        org_slug: TEST_USER.username,
        org_name: TEST_USER.username,
    });

    const pool = new pg.Pool({ connectionString: e2e_database_url, ssl: false });
    try {
        await upsert_suspended_user(pool);
    } finally {
        await pool.end();
    }
}
