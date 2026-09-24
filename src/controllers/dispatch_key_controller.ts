import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from './base_controller.js';
import type { DispatchKeyService } from '../services/dispatch_key_service.js';

const realm_key_schema = z.object({
    realm_id: z.string().min(1),
});

export class DispatchKeyController extends BaseController {
    private _service: DispatchKeyService;

    constructor(service: DispatchKeyService) {
        super();
        this._service = service;
    }

    get_public_key = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_key_schema, req);
        const dto = await this._service.get_public_key(body.realm_id, backend_token);
        this.ok(res, dto);
    });

    regenerate = this.wrap(async (req: Request, res: Response) => {
        const backend_token = this._resolve_backend_token(req);
        if (!backend_token) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(realm_key_schema, req);
        const dto = await this._service.regenerate(body.realm_id, backend_token);
        this.ok(res, dto);
    });

    /** Bearer (CLI JWT) preferred; else cookie session token. */
    private _resolve_backend_token(req: Request): string | null {
        const header = req.headers.authorization ?? '';
        if (header.startsWith('Bearer ')) {
            const bearer = header.slice(7).trim();
            if (bearer) return bearer;
        }
        const session_token = req.session_data?.target_token;
        if (session_token) return session_token;
        return null;
    }
}
