import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { create_test_app } from '../helpers/test_container.js';

const CSRF = { 'X-Requested-With': 'XMLHttpRequest' };

describe('Unknown /v1 routes', () => {
	let app: Express;

	beforeAll(() => {
		({ app } = create_test_app());
	});

	it('POST unknown /v1 path returns JSON 404 (not HTML)', async () => {
		const res = await request(app)
			.post('/v1/auth/tokens/get')
			.set(CSRF)
			.send({});

		expect(res.status).toBe(404);
		expect(res.headers['content-type']).toMatch(/json/);
		expect(res.body.ok).toBe(false);
		expect(res.body.error?.code).toBe('not_found');
		expect(typeof res.text === 'string' ? res.text : '').not.toMatch(/<!DOCTYPE/i);
	});

	it('GET unknown /v1 path returns JSON 404 (not HTML)', async () => {
		const res = await request(app)
			.get('/v1/does-not-exist');

		expect(res.status).toBe(404);
		expect(res.headers['content-type']).toMatch(/json/);
		expect(res.body.ok).toBe(false);
	});
});
