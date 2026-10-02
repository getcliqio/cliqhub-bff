import { describe, it, expect, vi } from 'vitest';
import { error_handler } from '../../../src/middleware/error_handler.js';
import { ApiError } from '../../../src/errors/api_error.js';

function make_res() {
    const res: any = {
        status_code: 0,
        body: null,
        status(code: number) {
            res.status_code = code;
            return res;
        },
        json(obj: unknown) {
            res.body = obj;
            return res;
        },
    };
    return res;
}

describe('error_handler', () => {
    const req = {} as any;
    const next = vi.fn();

    it('returns structured JSON for ApiError', () => {
        const err = new ApiError('not_found', 'Team not found', 404);
        const res = make_res();

        error_handler(err, req, res, next);

        expect(res.status_code).toBe(404);
        expect(res.body).toEqual({
            ok: false,
            error: { code: 'not_found', message: 'Team not found' },
        });
    });

    it('includes details when the error has them (e.g. who holds a name)', () => {
        const err = new ApiError('conflict', 'measureone is already an org', 409, { kind: 'org', slug: 'measureone', personal: false });
        const res = make_res();
        error_handler(err, req, res, next);
        expect(res.status_code).toBe(409);
        expect(res.body).toEqual({ ok: false, error: { code: 'conflict', message: 'measureone is already an org', details: { kind: 'org', slug: 'measureone', personal: false } } });
    });

    it('returns 500 for generic errors', () => {
        const err = new Error('something broke');
        const res = make_res();

        error_handler(err, req, res, next);

        expect(res.status_code).toBe(500);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe('internal_error');
    });

    it('hides error details in production', () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const err = new Error('secret internal detail');
        const res = make_res();

        error_handler(err, req, res, next);

        expect(res.body.error.message).toBe('Internal server error');

        process.env.NODE_ENV = original;
    });

    it('shows error details in development', () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const err = new Error('debug info');
        const res = make_res();

        error_handler(err, req, res, next);

        expect(res.body.error.message).toBe('debug info');

        process.env.NODE_ENV = original;
    });
});
