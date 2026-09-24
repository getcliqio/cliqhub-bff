import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';

describe('GET /bff-health', () => {
    let app: Express;

    beforeAll(() => {
        ({ app } = create_test_app());
    });

    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/bff-health');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.timestamp).toBeDefined();
    });
});

describe('CSRF protection', () => {
    let app: Express;

    beforeAll(() => {
        ({ app } = create_test_app());
    });

    it('rejects POST without X-Requested-With header', async () => {
        const res = await request(app)
            .post('/v1/session/create')
            .send({ username: 'a', password: 'b' });
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('csrf_rejected');
    });

    it('allows POST with correct X-Requested-With header (proxied to backend)', async () => {
        const res = await request(app)
            .post('/v1/session/create')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ username: 'a', password: 'b' });
        // Will fail to proxy since backend is not running,
        // but it was NOT blocked by CSRF — that's what we're testing
        expect(res.status).not.toBe(403);
    });
});
