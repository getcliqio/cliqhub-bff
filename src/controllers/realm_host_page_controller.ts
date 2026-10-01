import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from './base_controller.js';
import type { RealmHostPageService } from '../services/realm_host_page_service.js';

const realm_ref = { org_slug: z.string().min(1), slug: z.string().min(1) };
export const daemon_page_get_schema = z.object({ ...realm_ref, daemon_id: z.string().min(1) });
export const workspace_page_get_schema = z.object({ ...realm_ref, workspace_id: z.string().min(1) });

/**
 * `POST /v1/daemon_page/get` and `POST /v1/workspace_page/get` (BFF compositions).
 * Writes stay on Core: teams/install|uninstall, runs/enqueue|cancel|supply_inputs, daemons/remove.
 */
export class RealmHostPageController extends BaseController {
    constructor(private _service: RealmHostPageService) {
        super();
    }

    private _auth(req: Request, res: Response): string | null {
        if (req.session_data) return req.session_data.target_token;
        res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
        return null;
    }

    daemon = this.wrap(async (req: Request, res: Response) => {
        const token = this._auth(req, res);
        if (!token) return;
        this.ok(res, await this._service.daemon(token, this.parse_body(daemon_page_get_schema, req)));
    });

    workspace = this.wrap(async (req: Request, res: Response) => {
        const token = this._auth(req, res);
        if (!token) return;
        this.ok(res, await this._service.workspace(token, this.parse_body(workspace_page_get_schema, req)));
    });
}
