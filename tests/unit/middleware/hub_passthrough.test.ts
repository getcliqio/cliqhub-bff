import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { create_hub_passthrough } from '../../../src/middleware/hub_passthrough.js';
import { ApiError } from '../../../src/repositories/api_error.js';

function mock_res() {
    const res = {
        status_code: 200,
        body: undefined as unknown,
        status(code: number) {
            this.status_code = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };
    return res as unknown as Response & { status_code: number; body: unknown };
}

describe('create_hub_passthrough', () => {
    it('returns 401 when session and bearer are missing', async () => {
        const client = { post: vi.fn() };
        const handler = create_hub_passthrough(client as never);
        const req = {
            session_data: undefined,
            headers: {},
            path: '/v1/realms/get',
            body: {},
        } as unknown as Request;
        const res = mock_res();
        const next = vi.fn() as NextFunction;

        await handler(req, res, next);
        expect(res.status_code).toBe(401);
        expect(res.body).toEqual({
            ok: false,
            error: { code: 'unauthorized', message: 'Login required' },
        });
        expect(client.post).not.toHaveBeenCalled();
    });

    it('prefers Authorization Bearer over session token', async () => {
        const client = {
            post: vi.fn().mockResolvedValue({ ok: true, realms: [] }),
        };
        const handler = create_hub_passthrough(client as never);
        const req = {
            session_data: { target_token: 'session-tok' },
            headers: { authorization: 'Bearer machine-tok' },
            path: '/v1/runs/enqueue',
            body: { realm_id: 'r1', team_id: 's/t' },
        } as unknown as Request;
        const res = mock_res();
        const next = vi.fn() as NextFunction;

		await handler(req, res, next);
		expect(client.post).toHaveBeenCalledWith(
			'/v1/runs/enqueue',
			{ realm_id: 'r1', team_id: 's/t' },
			'machine-tok',
			{},
		);
		expect(res.body).toEqual({ ok: true, realms: [] });
    });

    it('forwards path body and session token then returns payload', async () => {
        const client = {
            post: vi.fn().mockResolvedValue({ ok: true, realms: [] }),
        };
        const handler = create_hub_passthrough(client as never);
        const req = {
            session_data: { target_token: 'tok' },
            headers: {},
            path: '/v1/realms/get',
            body: { org_id: 'o1' },
        } as unknown as Request;
        const res = mock_res();
        const next = vi.fn() as NextFunction;

        await handler(req, res, next);
		expect(client.post).toHaveBeenCalledWith('/v1/realms/get', { org_id: 'o1' }, 'tok', {});
        expect(res.body).toEqual({ ok: true, realms: [] });
        expect(next).not.toHaveBeenCalled();
    });

	it('forwards X-Org-Id header to core api', async () => {
		const client = {
			post: vi.fn().mockResolvedValue({ ok: true }),
		};
		const handler = create_hub_passthrough(client as never);
		const req = {
			session_data: { target_token: 'tok' },
			headers: { 'x-org-id': '42' },
			path: '/v1/permissions/list',
			body: {},
		} as unknown as Request;
		const res = mock_res();
		const next = vi.fn() as NextFunction;

		await handler(req, res, next);
		expect(client.post).toHaveBeenCalledWith(
			'/v1/permissions/list',
			{},
			'tok',
			{ 'x-org-id': '42' },
		);
	});

	it('maps ApiError to json response and forwards unknown errors', async () => {
        const api_err = new ApiError('forbidden', 'nope', 403);
        const client = { post: vi.fn().mockRejectedValue(api_err) };
        const handler = create_hub_passthrough(client as never);
        const req = {
            session_data: { target_token: 'tok' },
            headers: {},
            path: '/v1/realms/get',
            body: {},
        } as unknown as Request;
        const res = mock_res();
        const next = vi.fn() as NextFunction;

        await handler(req, res, next);
        expect(res.status_code).toBe(403);
        expect(res.body).toEqual({
            ok: false,
            error: { code: 'forbidden', message: 'nope' },
        });

        const boom = new Error('boom');
        client.post.mockRejectedValueOnce(boom);
        await handler(req, mock_res(), next);
        expect(next).toHaveBeenCalledWith(boom);
    });
});
