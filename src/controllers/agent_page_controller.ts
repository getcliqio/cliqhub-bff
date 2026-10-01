import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { AgentPageService } from '../services/agent_page_service.js';
import { agent_list_get_schema, agent_page_get_schema } from '../schemas/agent_page_schemas.js';

/**
 * `POST /v1/agent_list/get` → `{ ok, data: AgentListDTO }` (Manage › Agents / Realm › Agents)
 * `POST /v1/agent_page/get` → `{ ok, data: AgentPageDTO }` (one agent)
 * Writes stay single Core routes (agents/update_settings, register, deregister).
 */
export class AgentPageController extends BaseController {
    constructor(private _service: AgentPageService) {
        super();
    }

    list = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(agent_list_get_schema, req);
        this.ok(res, await this._service.list(req.session_data.target_token, body));
    });

    page = this.wrap(async (req: Request, res: Response) => {
        if (!req.session_data) {
            res.status(401).json({ ok: false, error: { code: 'unauthorized', message: 'Login required' } });
            return;
        }
        const body = this.parse_body(agent_page_get_schema, req);
        this.ok(res, await this._service.page(req.session_data.target_token, body));
    });
}
