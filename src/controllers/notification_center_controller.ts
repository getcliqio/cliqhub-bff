/**
 * Notification center — every rule and channel the user can see, who gets told
 * for each event, and bulk rule writes.
 *
 * Routes (1:1 with this controller, mounted in routes/pages.ts):
 *   POST /v1/notification_center/get        — rules + channels by org and realm
 *   POST /v1/notification_center/check      — who is told for each event in a realm (or team)
 *   POST /v1/notification_center/set_rules  — one rule per event at one level, one channel
 *
 * Every route needs a session; Core re-checks every read and write.
 * Single-rule writes and channel CRUD stay on Core passthrough routes.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `NotificationCenter*Input` in `schemas/notification_center_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { NotificationCenterService } from '../services/notification_center_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    NotificationCenterGetInput, NotificationCenterCheckInput, NotificationCenterSetRulesInput,
} from '../schemas/notification_center_types.js';
import type {
    NotificationCenterData, NotificationCheckData, NotifSetRulesData,
} from '../schemas/notification_center_types.js';
import { to_notif_viewer } from '../mappers/notification_center_mapper.js';

/** Notification center page and bulk rule writes. */
export class NotificationCenterController extends BaseController {
    constructor(private readonly _notification_center_service: NotificationCenterService) {
        super();
    }

    /**
     * Rules and channels across the caller's orgs and one page of realms, with
     * what the effective user (take-over aware) may edit.
     *
     * @param req - Body: {@link NotificationCenterGetInput}
     * @param res - `{ ok: true, data: NotificationCenterData }`; 403 when `org_id` / `realm_id` is outside the caller's orgs
     */
    async get(
        req: ApiRequest<NotificationCenterGetInput, NotificationCenterData>,
        res: ApiOkResponse<NotificationCenterData>,
    ): Promise<void> {
        const body = this.parse_body(NotificationCenterGetInput, req);
        const session = this.session(req);
        this.ok(res, await this._notification_center_service.get(body, session.target_token, to_notif_viewer(session)));
    }

    /**
     * Who gets told for each event in a realm, optionally for one team.
     *
     * @param req - Body: {@link NotificationCenterCheckInput}
     * @param res - `{ ok: true, data: NotificationCheckData }`
     */
    async check(
        req: ApiRequest<NotificationCenterCheckInput, NotificationCheckData>,
        res: ApiOkResponse<NotificationCheckData>,
    ): Promise<void> {
        const body = this.parse_body(NotificationCenterCheckInput, req);
        this.ok(res, await this._notification_center_service.check(body, this.session(req).target_token));
    }

    /**
     * Saves one rule per event at one level (org, realm or team), all to one channel.
     *
     * @param req - Body: {@link NotificationCenterSetRulesInput}
     * @param res - `{ ok: true, data: NotifSetRulesData }` — per-event saved / failed
     */
    async set_rules(
        req: ApiRequest<NotificationCenterSetRulesInput, NotifSetRulesData>,
        res: ApiOkResponse<NotifSetRulesData>,
    ): Promise<void> {
        const body = this.parse_body(NotificationCenterSetRulesInput, req);
        this.ok(res, await this._notification_center_service.set_rules(body, this.session(req).target_token));
    }
}
