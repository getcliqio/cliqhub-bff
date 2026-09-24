import pg from 'pg';
import { randomUUID } from 'node:crypto';
import type { EnvConfig } from '../config/env.js';

/**
 * BFF browser session row.
 *
 * Dual-token model (always both present):
 *   user_id / user_token       — who authenticated (immutable for this login)
 *   act_as_user_id / target_token — who Core runs as (Bearer for all data-plane calls)
 * At login both tokens are equal; act-as swaps only target_token + act_as_user_id.
 *
 * default_realm_* is persisted so POST /v1/session/get can return it for SPA
 * redirects (/daemons, /runs → /o/{org}/realms/{slug}/...). actor_default_realm_*
 * is the login-time snapshot used to restore defaults on exit act-as.
 */
export interface SessionRecord {
    session_id: string;
    user_id: string;
    act_as_user_id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    /** Site-admin role of the authenticated user — used to authorize act-as. */
    actor_role: 'user' | 'admin';
    actor_username: string;
    user_token: string;
    target_token: string;
    scopes_json: string;
    org_slugs_json: string;
    /** Current effective default realm (target when acting-as). */
    default_realm_id: string | null;
    default_realm_slug: string | null;
    default_realm_qualified: string | null;
    /** Immutable login-time defaults for exit act-as restore. */
    actor_default_realm_id: string | null;
    actor_default_realm_slug: string | null;
    actor_default_realm_qualified: string | null;
    /** JSON array of orgs with default_realm_slug — returned by session/get. */
    orgs_json: string;
    created_at: number;
    last_active: number;
    expires_at: number;
}

export type SessionCreateInput = Omit<SessionRecord, 'session_id'>;

export type SessionActAsUpdate = {
    act_as_user_id: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
    target_token: string;
    scopes_json: string;
    org_slugs_json: string;
    default_realm_id: string | null;
    default_realm_slug: string | null;
    default_realm_qualified: string | null;
    orgs_json: string;
};

export class SessionStore {
    private _pool: pg.Pool;
    private _idle_seconds: number;

    constructor(config: EnvConfig) {
        this._pool = new pg.Pool({
            connectionString: config.database_url,
            max: 5,
            idleTimeoutMillis: 30_000,
        });
        this._pool.on('error', (err) => {
            console.error(
                JSON.stringify({
                    ts: new Date().toISOString(),
                    level: 'ERROR',
                    component: 'bff-session-pool',
                    msg: 'idle_client_error',
                    ctx: { code: (err as NodeJS.ErrnoException).code, message: err.message },
                }),
            );
        });
        this._idle_seconds = config.session_idle_seconds;
    }

    static from_pool(pool: pg.Pool, config: EnvConfig): SessionStore {
        const store = Object.create(SessionStore.prototype) as SessionStore;
        store._pool = pool;
        store._idle_seconds = config.session_idle_seconds;
        return store;
    }

    /**
     * Hard-cut schema: wipe legacy single-token rows and recreate.
     */
    async init(): Promise<void> {
        await this._pool.query('CREATE SCHEMA IF NOT EXISTS bff');
        await this._pool.query('DROP TABLE IF EXISTS bff.sessions');
        await this._pool.query(`
            CREATE TABLE bff.sessions (
                session_id                    TEXT PRIMARY KEY,
                user_id                       TEXT NOT NULL,
                act_as_user_id                TEXT NOT NULL,
                username                      TEXT NOT NULL,
                email                         TEXT NOT NULL,
                role                          TEXT NOT NULL DEFAULT 'user',
                actor_role                    TEXT NOT NULL DEFAULT 'user',
                actor_username                TEXT NOT NULL,
                user_token                    TEXT NOT NULL,
                target_token                  TEXT NOT NULL,
                scopes_json                   TEXT NOT NULL DEFAULT '[]',
                org_slugs_json                TEXT NOT NULL DEFAULT '[]',
                default_realm_id              TEXT,
                default_realm_slug            TEXT,
                default_realm_qualified       TEXT,
                actor_default_realm_id        TEXT,
                actor_default_realm_slug      TEXT,
                actor_default_realm_qualified TEXT,
                orgs_json                     TEXT NOT NULL DEFAULT '[]',
                created_at                    BIGINT NOT NULL,
                last_active                   BIGINT NOT NULL,
                expires_at                    BIGINT NOT NULL
            );
            CREATE INDEX idx_sessions_expires ON bff.sessions(expires_at);
            CREATE INDEX idx_sessions_user ON bff.sessions(user_id);
        `);
    }

    async create(record: SessionCreateInput): Promise<string> {
        const session_id = randomUUID();
        await this._pool.query(
            `INSERT INTO bff.sessions
                (session_id, user_id, act_as_user_id, username, email, role,
                 actor_role, actor_username, user_token, target_token,
                 scopes_json, org_slugs_json,
                 default_realm_id, default_realm_slug, default_realm_qualified,
                 actor_default_realm_id, actor_default_realm_slug, actor_default_realm_qualified,
                 orgs_json, created_at, last_active, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
            [
                session_id,
                record.user_id,
                record.act_as_user_id,
                record.username,
                record.email,
                record.role,
                record.actor_role,
                record.actor_username,
                record.user_token,
                record.target_token,
                record.scopes_json,
                record.org_slugs_json,
                record.default_realm_id,
                record.default_realm_slug,
                record.default_realm_qualified,
                record.actor_default_realm_id,
                record.actor_default_realm_slug,
                record.actor_default_realm_qualified,
                record.orgs_json,
                record.created_at,
                record.last_active,
                record.expires_at,
            ],
        );
        return session_id;
    }

    async find(session_id: string): Promise<SessionRecord | null> {
        const { rows } = await this._pool.query(
            'SELECT * FROM bff.sessions WHERE session_id = $1',
            [session_id],
        );

        if (rows.length === 0) return null;

        const row = rows[0] as SessionRecord;
        const now = Math.floor(Date.now() / 1000);

        if (Number(row.expires_at) < now) {
            await this.destroy(session_id);
            return null;
        }

        if (now - Number(row.last_active) > this._idle_seconds) {
            await this.destroy(session_id);
            return null;
        }

        return this._normalize(row);
    }

    async touch(session_id: string): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this._pool.query(
            'UPDATE bff.sessions SET last_active = $1 WHERE session_id = $2',
            [now, session_id],
        );
    }

    async destroy(session_id: string): Promise<void> {
        await this._pool.query(
            'DELETE FROM bff.sessions WHERE session_id = $1',
            [session_id],
        );
    }

    /**
     * Act-as: mutate only target identity + target_token. user_token / user_id unchanged.
     * Also swaps default_realm_* to the target's (actor_default_* stays immutable).
     */
    async update_act_as(session_id: string, fields: SessionActAsUpdate): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this._pool.query(
            `UPDATE bff.sessions SET
                act_as_user_id = $1,
                username = $2,
                email = $3,
                role = $4,
                target_token = $5,
                scopes_json = $6,
                org_slugs_json = $7,
                default_realm_id = $8,
                default_realm_slug = $9,
                default_realm_qualified = $10,
                orgs_json = $11,
                last_active = $12
             WHERE session_id = $13`,
            [
                fields.act_as_user_id,
                fields.username,
                fields.email,
                fields.role,
                fields.target_token,
                fields.scopes_json,
                fields.org_slugs_json,
                fields.default_realm_id,
                fields.default_realm_slug,
                fields.default_realm_qualified,
                fields.orgs_json,
                now,
                session_id,
            ],
        );
    }

    /**
     * Exit act-as: restore target_token = user_token, act_as identity to the actor,
     * and default_realm_* from the immutable actor_default_realm_* snapshot.
     */
    async restore_actor(
        session_id: string,
        fields: {
            username: string;
            email: string;
            role: 'user' | 'admin';
            scopes_json: string;
            org_slugs_json: string;
            orgs_json: string;
        },
    ): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this._pool.query(
            `UPDATE bff.sessions SET
                act_as_user_id = user_id,
                username = $1,
                email = $2,
                role = $3,
                target_token = user_token,
                scopes_json = $4,
                org_slugs_json = $5,
                orgs_json = $6,
                default_realm_id = actor_default_realm_id,
                default_realm_slug = actor_default_realm_slug,
                default_realm_qualified = actor_default_realm_qualified,
                last_active = $7
             WHERE session_id = $8`,
            [
                fields.username,
                fields.email,
                fields.role,
                fields.scopes_json,
                fields.org_slugs_json,
                fields.orgs_json,
                now,
                session_id,
            ],
        );
    }

    async destroy_user(user_id: string): Promise<void> {
        await this._pool.query(
            'DELETE FROM bff.sessions WHERE user_id = $1',
            [user_id],
        );
    }

    async prune_expired(): Promise<number> {
        const now = Math.floor(Date.now() / 1000);
        const result = await this._pool.query(
            'DELETE FROM bff.sessions WHERE expires_at < $1',
            [now],
        );
        return result.rowCount ?? 0;
    }

    async close(): Promise<void> {
        await this._pool.end();
    }

    private _normalize(row: SessionRecord): SessionRecord {
        return {
            ...row,
            user_id: String(row.user_id),
            act_as_user_id: String(row.act_as_user_id),
            actor_role: row.actor_role === 'admin' ? 'admin' : 'user',
            role: row.role === 'admin' ? 'admin' : 'user',
            default_realm_id: row.default_realm_id ?? null,
            default_realm_slug: row.default_realm_slug ?? null,
            default_realm_qualified: row.default_realm_qualified ?? null,
            actor_default_realm_id: row.actor_default_realm_id ?? null,
            actor_default_realm_slug: row.actor_default_realm_slug ?? null,
            actor_default_realm_qualified: row.actor_default_realm_qualified ?? null,
            orgs_json: row.orgs_json ?? '[]',
            created_at: Number(row.created_at),
            last_active: Number(row.last_active),
            expires_at: Number(row.expires_at),
        };
    }
}
