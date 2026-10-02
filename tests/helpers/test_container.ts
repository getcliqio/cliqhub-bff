/**
 * Test app: the real wiring (`build_container`) over an in-memory session
 * store, a Core client pointed at a dead port (tests stub `fetch`) and a
 * Core compatibility check that always reports API 2.
 */

import { vi } from 'vitest';
import { create_app } from '../../src/app.js';
import { build_container } from '../../src/container.js';
import { CoreClient } from '../../src/repositories/core_client.js';
import { CoreCompatService } from '../../src/services/core_compat_service.js';
import type { EnvConfig } from '../../src/config/env.js';

export function test_config(): EnvConfig {
    return {
        port: 0,
        backend_url: 'http://localhost:19999',
        core_api_url: 'http://localhost:19998',
        session_secret: 'test-secret',
        session_ttl_seconds: 3600,
        session_idle_seconds: 600,
        database_url: 'postgres://test:test@localhost:5432/test',
        cookie_name: 'test_sid',
        cors_origins: [],
        node_env: 'test',
        rate_limit_builder_anon: 100,
        rate_limit_builder_auth: 100,
        rate_limit_window_ms: 60000,
        static_dir: '',
        trust_proxy: false,
    };
}

export function mock_session_store(_config: EnvConfig) {
    const sessions = new Map<string, any>();
    let counter = 0;

    return {
        init: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockImplementation(async (record: any) => {
            const sid = `mock-sid-${++counter}`;
            sessions.set(sid, { session_id: sid, ...record });
            return sid;
        }),
        find: vi.fn().mockImplementation(async (sid: string) => {
            return sessions.get(sid) ?? null;
        }),
        touch: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockImplementation(async (sid: string) => {
            sessions.delete(sid);
        }),
        update_act_as: vi.fn().mockImplementation(async (sid: string, fields: any) => {
            const existing = sessions.get(sid);
            if (existing) sessions.set(sid, { ...existing, ...fields });
        }),
        restore_actor: vi.fn().mockImplementation(async (sid: string, fields: any) => {
            const existing = sessions.get(sid);
            if (existing) {
                sessions.set(sid, {
                    ...existing,
                    ...fields,
                    act_as_user_id: existing.user_id,
                    target_token: existing.user_token,
                });
            }
        }),
        destroy_user: vi.fn().mockResolvedValue(undefined),
        prune_expired: vi.fn().mockResolvedValue(0),
        close: vi.fn().mockResolvedValue(undefined),
        _sessions: sessions,
    };
}

export function create_test_app(over: Partial<EnvConfig> = {}) {
    const config = { ...test_config(), ...over };
    const session_store = mock_session_store(config);
    const core_client = new CoreClient(config.core_api_url);
    const core_compat = new CoreCompatService(
        'http://core.test',
        60_000,
        (async () => new Response(JSON.stringify({ ok: true, version: '1.0.0', api_version: 2, started_at: 1 }))) as typeof fetch,
    );
    const container = build_container({ config, session_store: session_store as any, core_client, core_compat });
    const app = create_app(container);
    return { app, container, session_store, core_client };
}
