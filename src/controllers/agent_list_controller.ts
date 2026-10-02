/**
 * Manage › Agents / Realm › Agents — the org's agents with setup status,
 * realm overrides and usage (BFF composition, services/agent_page_service.ts).
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/agent_list/get — the agent list (org view, or one realm's view)
 *
 * Needs a session (routes/route_auth.ts). Writes stay single Core routes
 * (agents/update_settings, register, deregister).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `AgentListGetInput` in `schemas/agent_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { AgentPageService } from '../services/agent_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { AgentListGetInput } from '../schemas/agent_page_types.js';
import type { AgentListData } from '../schemas/agent_page_types.js';

/** The org / realm agents list page. */
export class AgentListController extends BaseController {
    constructor(private readonly _agent_page_service: AgentPageService) {
        super();
    }

    /**
     * The org's agents (or as one realm sees them), needs-setup first.
     *
     * @param req - Body: {@link AgentListGetInput}
     * @param res - `{ ok: true, data: AgentListData }`
     */
    async get(req: ApiRequest<AgentListGetInput, AgentListData>, res: ApiOkResponse<AgentListData>): Promise<void> {
        const body = this.parse_body(AgentListGetInput, req);
        this.ok(res, await this._agent_page_service.list(body, this.session(req).target_token));
    }
}
