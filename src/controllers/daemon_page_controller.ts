/**
 * Daemon page — Realm › Daemon.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/daemon_page/get — the daemon, its live teams, installable roster, workspaces, runs
 *
 * Writes stay on Core routes (install / uninstall, daemon settings).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `DaemonPageGetInput` in `schemas/host_page_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { RealmHostPageService } from '../services/realm_host_page_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { DaemonPageGetInput } from '../schemas/host_page_types.js';
import type { DaemonPageData } from '../schemas/host_page_types.js';

/** One daemon's page in a realm. */
export class DaemonPageController extends BaseController {
    constructor(private readonly _realm_host_page_service: RealmHostPageService) {
        super();
    }

    /**
     * One daemon in a realm; sections other than the daemon are best-effort (`partial`).
     *
     * @param req - Body: {@link DaemonPageGetInput}
     * @param res - `{ ok: true, data: DaemonPageData }`
     */
    async get(req: ApiRequest<DaemonPageGetInput, DaemonPageData>, res: ApiOkResponse<DaemonPageData>): Promise<void> {
        const body = this.parse_body(DaemonPageGetInput, req);
        this.ok(res, await this._realm_host_page_service.daemon(body, this.session(req).target_token));
    }
}
