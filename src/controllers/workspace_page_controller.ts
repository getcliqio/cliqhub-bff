/**
 * Workspace page — Realm › Workspace.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/workspace_page/get — the workspace, its teams and runs
 *
 * Writes stay on Core routes.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `WorkspacePageGetInput` in `schemas/host_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmHostPageService } from '../services/realm_host_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { WorkspacePageGetInput } from '../schemas/host_page_types.js';
import type { WorkspacePageData } from '../schemas/host_page_types.js';

/** One workspace's page in a realm. */
export class WorkspacePageController extends BaseController {
    constructor(private readonly _realm_host_page_service: RealmHostPageService) {
        super();
    }

    /**
     * One workspace in a realm; runs are best-effort (`partial`).
     *
     * @param req - Body: {@link WorkspacePageGetInput}
     * @param res - `{ ok: true, data: WorkspacePageData }`
     */
    async get(req: ApiRequest<WorkspacePageGetInput, WorkspacePageData>, res: ApiOkResponse<WorkspacePageData>): Promise<void> {
        const body = this.parse_body(WorkspacePageGetInput, req);
        this.ok(res, await this._realm_host_page_service.workspace(body, this.session(req).target_token));
    }
}
