/**
 * Manage › Agents › one agent — details, versions, used by and settings
 * (BFF composition, services/agent_page_service.ts). Secrets are always masked.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/agent_page/get — one agent, one tab (`view`)
 *
 * Needs a session (routes/route_auth.ts). Writes stay single Core routes
 * (agents/update_settings, register, deregister).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `AgentPageGetInput` in `schemas/agent_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { AgentPageService } from '../services/agent_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { AgentPageGetInput } from '../schemas/agent_page_types.js';
import type { AgentPageData } from '../schemas/agent_page_types.js';

/** One agent's page (details, versions, used by, masked settings). */
export class AgentPageController extends BaseController {
    constructor(private readonly _agent_page_service: AgentPageService) {
        super();
    }

    /**
     * One agent: details, versions, used by and settings for the scope (org or realm).
     *
     * @param req - Body: {@link AgentPageGetInput}
     * @param res - `{ ok: true, data: AgentPageData }`
     */
    async get(req: ApiRequest<AgentPageGetInput, AgentPageData>, res: ApiOkResponse<AgentPageData>): Promise<void> {
        const body = this.parse_body(AgentPageGetInput, req);
        this.ok(res, await this._agent_page_service.page(body, this.session(req).target_token));
    }
}
