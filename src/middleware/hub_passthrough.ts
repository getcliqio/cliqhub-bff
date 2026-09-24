/**
 * Authenticated pass-through to Hub Core API for control-plane routes.
 *
 * Most Core controllers still return flat `{ ok, …fields }`. Agents and
 * notifications Controllers use BaseController.ok → `{ ok, data }` (SPA
 * unwraps via hub_envelope). Do not wrap again in a BFF `{ ok, data }` layer.
 *
 * Credential forwarding:
 *   1. Authorization: Bearer … from the client (daemon / CLI / machine)
 *   2. Else session_data.target_token (browser SPA)
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CoreApiClient } from '../repositories/core_api_client.js';
import { ApiError } from '../repositories/api_error.js';

function resolve_forward_token(req: Request): string | null {
	const header = req.headers.authorization ?? '';
	if (header.startsWith('Bearer ')) {
		const bearer = header.slice(7).trim();
		if (bearer) return bearer;
	}
	const session_token = req.session_data?.target_token;
	if (session_token) return session_token;
	return null;
}

export function create_hub_passthrough(client: CoreApiClient): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = resolve_forward_token(req);
			if (!token) {
				res.status(401).json({
					ok: false,
					error: { code: 'unauthorized', message: 'Login required' },
				});
				return;
			}

			const extra_headers: Record<string, string> = {};
			const org_header = req.headers['x-org-id'];
			if (org_header) {
				extra_headers['x-org-id'] = Array.isArray(org_header) ? org_header[0] : org_header;
			}

			const payload = await client.post<Record<string, unknown>>(
				req.path,
				req.body ?? {},
				token,
				extra_headers,
			);
			res.json(payload);
		} catch (err) {
			if (err instanceof ApiError) {
				res.status(err.status).json({
					ok: false,
					error: { code: err.code, message: err.message },
				});
				return;
			}
			next(err);
		}
	};
}
