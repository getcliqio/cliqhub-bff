/**
 * Ensure e2e fixture users exist with known passwords on the local DB.
 */

import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const LOCAL_DATABASE_URL = 'postgresql://cliqhub:cliqhub@localhost:5432/cliqhub';

const TEST_ADMIN = { username: 'admin', password: 'admin123' };
const TEST_USER = { username: 'testuser', password: 'testpass123!' };

async function upsert_user(
    pool: pg.Pool,
    opts: {
        username: string;
        password: string;
        email: string;
        role: string;
        suspended: boolean;
    },
): Promise<void> {
    const password_hash = await bcrypt.hash(opts.password, 10);
    const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [opts.username],
    );
    if (existing.rows.length > 0) {
        await pool.query(
            `UPDATE users
             SET password_hash = $1,
                 role = $2,
                 email = $3,
                 suspended_at = $4
             WHERE username = $5`,
            [
                password_hash,
                opts.role,
                opts.email,
                opts.suspended ? new Date().toISOString() : null,
                opts.username,
            ],
        );
        return;
    }

    await pool.query(
        `INSERT INTO users (id, username, email, password_hash, display_name, role, suspended_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
            randomUUID(),
            opts.username,
            opts.email,
            password_hash,
            opts.username,
            opts.role,
            opts.suspended ? new Date().toISOString() : null,
        ],
    );
}

export default async function global_setup(): Promise<void> {
    const database_url = process.env.E2E_DATABASE_URL || LOCAL_DATABASE_URL;
    const pool = new pg.Pool({ connectionString: database_url, ssl: false });

    try {
        await upsert_user(pool, {
            username: TEST_ADMIN.username,
            password: TEST_ADMIN.password,
            email: 'admin@cliqhub.io',
            role: 'admin',
            suspended: false,
        });
        await upsert_user(pool, {
            username: TEST_USER.username,
            password: TEST_USER.password,
            email: 'testuser@test.com',
            role: 'user',
            suspended: false,
        });
        await upsert_user(pool, {
            username: 'suspended_user',
            password: 'any-password',
            email: 'suspended@test.com',
            role: 'user',
            suspended: true,
        });
    } finally {
        await pool.end();
    }
}
