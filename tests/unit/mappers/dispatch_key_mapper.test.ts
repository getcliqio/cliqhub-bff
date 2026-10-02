import { describe, it, expect } from 'vitest';
import { to_dispatch_key_data } from '../../../src/mappers/dispatch_key_mapper.js';
import { ApiError } from '../../../src/errors/api_error.js';

const PUBLIC_PEM = '-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----\n';

describe('to_dispatch_key_data', () => {
    it('maps the public key and drops the envelope', () => {
        expect(to_dispatch_key_data({ ok: true, realm_id: 'r1', public_key_pem: PUBLIC_PEM, created_at: 1, rotated_at: 2 }, 'r0'))
            .toEqual({ realm_id: 'r1', public_key_pem: PUBLIC_PEM, created_at: 1, rotated_at: 2 });
    });

    it('falls back to the requested realm and null timestamps', () => {
        expect(to_dispatch_key_data({ public_key_pem: PUBLIC_PEM }, 'r0'))
            .toEqual({ realm_id: 'r0', public_key_pem: PUBLIC_PEM, created_at: null, rotated_at: null });
    });

    it('rejects a PRIVATE key with a 502', () => {
        let err: unknown;
        try {
            to_dispatch_key_data({ public_key_pem: '-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----\n' }, 'r1');
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ code: 'internal', status: 502 });
        expect((err as Error).message).not.toContain('SECRET');
    });

    it('rejects an RSA PRIVATE key too', () => {
        expect(() => to_dispatch_key_data({ public_key_pem: '-----BEGIN RSA PRIVATE KEY-----\nX\n' }, 'r1')).toThrow(ApiError);
    });

    it('rejects a missing or empty key', () => {
        expect(() => to_dispatch_key_data({}, 'r1')).toThrow(ApiError);
        expect(() => to_dispatch_key_data({ public_key_pem: '' }, 'r1')).toThrow(ApiError);
    });
});
