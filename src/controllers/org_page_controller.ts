import type { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from './base_controller.js';
import type { OrgPageService } from '../services/org_page_service.js';

export const org_page_get_schema = z.object({ org_id: z.string().uuid() });

/**
 * `POST /v1/org_page/get` → `{ ok, data: OrgPageDTO }` (Manage › Organization).
 * Writes stay on Core: orgs/*, users/update_role, invitations/*, orgs/mesh/update.
 */
export class OrgPageController extends BaseController {
    constructor(private _service: OrgPageService) {
        super();
    }

    page = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(org_page_get_schema, req);
        this.ok(res, await this._service.page(req.session_data.target_token, body));
    });
}
