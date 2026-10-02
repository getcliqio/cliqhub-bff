import pg from 'pg';

/** The dev database seeded by scripts/seed_admin.mjs; e2e must never write to it. */
const DEV_DATABASE_NAME = 'cliqhub';

export const e2e_database_url = process.env.E2E_DATABASE_URL
    || 'postgresql://cliqhub:cliqhub@localhost:5432/cliqhub_e2e';

function database_name(url: string): string {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

/** Refuse the dev DB, then create the e2e database when missing (needs CREATEDB on the role). */
export async function ensure_e2e_database(url: string): Promise<void> {
    const name = database_name(url);
    if (name === DEV_DATABASE_NAME) {
        throw new Error(`Refusing to run e2e against the dev database "${DEV_DATABASE_NAME}". Set E2E_DATABASE_URL to a dedicated database.`);
    }
    const admin_url = new URL(url);
    admin_url.pathname = '/postgres';
    const client = new pg.Client({ connectionString: admin_url.toString() });
    await client.connect();
    try {
        const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
        if (found.rowCount === 0) {
            await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
        }
    } finally {
        await client.end();
    }
}
