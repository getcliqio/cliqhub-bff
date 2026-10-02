/**
 * Inbox — the caller's in-app notifications across their orgs (BFF composition).
 *
 * Routes (1:1 with this controller):
 *   POST /v1/inbox/get — one page of notifications, newest first
 *
 * Needs a session (routes/route_auth.ts); Core is read as the session's target_token.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `InboxGetInput` in `schemas/inbox_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { InboxService } from '../services/inbox_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import { InboxGetInput } from '../schemas/inbox_types.js';
import type { NotifInboxData } from '../schemas/inbox_types.js';

/** The caller's cross-org notification inbox page. */
export class InboxController extends BaseController {
    constructor(private readonly _inbox_service: InboxService) {
        super();
    }

    /**
     * One page of notifications; page backwards with `until_ms` = the previous `next_until_ms`.
     *
     * @param req - Body: {@link InboxGetInput}
     * @param res - `{ ok: true, data: NotifInboxData }`; 403 when `org_id` is not a membership
     */
    async get(req: ApiRequest<InboxGetInput, NotifInboxData>, res: ApiOkResponse<NotifInboxData>): Promise<void> {
        const body = this.parse_body(InboxGetInput, req);
        this.ok(res, await this._inbox_service.get(body, this.session(req).target_token));
    }
}
