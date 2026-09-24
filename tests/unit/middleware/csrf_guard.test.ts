import { describe, it, expect, vi } from 'vitest';
import { csrf_guard } from '../../../src/middleware/csrf_guard.js';

function make_req(method: string, headers: Record<string, string> = {}): any {
    return {
        method,
        get: (name: string) => headers[name.toLowerCase()],
    };
}

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

describe('csrf_guard', () => {
    it('allows GET requests without CSRF header', () => {
        const req = make_req('GET');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('allows HEAD requests without CSRF header', () => {
        const req = make_req('HEAD');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('allows OPTIONS requests without CSRF header', () => {
        const req = make_req('OPTIONS');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('allows POST with valid CSRF header', () => {
        const req = make_req('POST', {
            'x-requested-with': 'XMLHttpRequest',
        });
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('rejects POST without CSRF header', () => {
        const req = make_req('POST');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status_code).toBe(403);
        expect(res.body.error.code).toBe('csrf_rejected');
    });

    it('rejects POST with wrong CSRF header value', () => {
        const req = make_req('POST', {
            'x-requested-with': 'WrongValue',
        });
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status_code).toBe(403);
    });

    it('rejects PUT without CSRF header', () => {
        const req = make_req('PUT');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status_code).toBe(403);
    });

    it('rejects DELETE without CSRF header', () => {
        const req = make_req('DELETE');
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status_code).toBe(403);
    });

    it('allows POST with Bearer token without CSRF header', () => {
        const req = make_req('POST', {
            authorization: 'Bearer machine-tok',
        });
        const res = make_res();
        const next = vi.fn();

        csrf_guard(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
