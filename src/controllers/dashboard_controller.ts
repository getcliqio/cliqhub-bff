import type { Request, Response } from 'express';
import type { CoreApiClient } from '../repositories/core_api_client.js';
import { ApiError } from '../repositories/api_error.js';

/**
 * Console home rollups — BFF owns `/v1/dashboard/*`, Core only on `/internal`.
 * Responses stay flat Hub Core shape (`{ ok, …fields }`), not BFF `{ ok, data }`.
 */
export class DashboardController {
    constructor(private _core: CoreApiClient) {}

    summary = async (req: Request, res: Response): Promise<void> => {
        await this._proxy(req, res, '/internal/dashboard/summary');
    };

    realms = async (req: Request, res: Response): Promise<void> => {
        await this._proxy(req, res, '/internal/dashboard/realms');
    };

    private async _proxy(req: Request, res: Response, upstream: string): Promise<void> {
        try {
            const token = this._forward_token(req);
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
            const payload = await this._core.post<Record<string, unknown>>(
                upstream,
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
            throw err;
        }
    }

    private _forward_token(req: Request): string | null {
        const header = req.headers.authorization ?? '';
        if (header.startsWith('Bearer ')) {
            const bearer = header.slice(7).trim();
            if (bearer) return bearer;
        }
        return req.session_data?.target_token ?? null;
    }
}
