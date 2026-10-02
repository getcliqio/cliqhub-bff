import { describe, it, expect, vi } from 'vitest';
import { assert_own_session_db, load_env, parse_trust_proxy } from '../../../src/config/env.js';

describe('assert_own_session_db', () => {
    it('accepts a local Postgres and Railway-internal hosts', () => {
        expect(() => assert_own_session_db('postgresql://u:p@localhost:5432/cliqhub', {})).not.toThrow();
        expect(() => assert_own_session_db('postgresql://u:p@127.0.0.1:5432/cliqhub', {})).not.toThrow();
        expect(() => assert_own_session_db('postgresql://u:p@postgres.railway.internal:5432/railway', {})).not.toThrow();
    });

    it('refuses a Railway public proxy (a local BFF on a shared cloud database)', () => {
        expect(() => assert_own_session_db('postgresql://u:p@shinkansen.proxy.rlwy.net:15159/railway', {}))
            .toThrow(/shared Railway database/);
    });

    it('allows it when opted in, and never echoes credentials', () => {
        expect(() => assert_own_session_db('postgresql://u:p@x.proxy.rlwy.net:1/railway', { BFF_ALLOW_SHARED_SESSION_DB: '1' }))
            .not.toThrow();
        try {
            assert_own_session_db('postgresql://user:secret@x.proxy.rlwy.net:1/railway', {});
        } catch (err) {
            expect(String((err as Error).message)).not.toContain('secret');
        }
    });
});

describe('parse_trust_proxy (TRUST_PROXY)', () => {
    it('is off by default and for false', () => {
        expect(parse_trust_proxy(undefined)).toBe(false);
        expect(parse_trust_proxy('')).toBe(false);
        expect(parse_trust_proxy(' false ')).toBe(false);
    });

    it('takes true, a hop count, or addresses / presets as Express does', () => {
        expect(parse_trust_proxy('true')).toBe(true);
        expect(parse_trust_proxy('1')).toBe(1);
        expect(parse_trust_proxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
    });

    it('load_env reads TRUST_PROXY', () => {
        for (const [k, v] of Object.entries({ BACKEND_URL: 'http://localhost:4000', DATABASE_URL: 'postgresql://u:p@localhost:5432/x', SESSION_SECRET: 'fake-session-secret', TRUST_PROXY: '2' })) vi.stubEnv(k, v);
        expect(load_env().trust_proxy).toBe(2);
        vi.unstubAllEnvs();
    });
});
