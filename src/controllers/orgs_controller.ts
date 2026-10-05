/**
 * Orgs — membership, roles and publishing scopes of an org; site-admin org management.
 *
 * Routes (1:1 with this controller, mounted in routes/orgs.ts):
 *   POST /v1/orgs/get                    — caller's orgs; site admins without `mine`: every org
 *   POST /v1/orgs/new                    — create an org, invite its owner (site_admin)
 *   POST /v1/orgs/delete                 — soft-delete an org             (site_admin)
 *   POST /v1/orgs/get_by_id              — org detail
 *   POST /v1/orgs/update                 — rename and/or make a member an owner
 *   POST /v1/orgs/leave                  — caller leaves the org
 *   POST /v1/orgs/remove_member          — remove a member
 *   POST /v1/orgs/list_roles             — org roles
 *   POST /v1/orgs/get_role               — one role
 *   POST /v1/orgs/create_role            — new custom role
 *   POST /v1/orgs/update_role            — rename / re-permission a role
 *   POST /v1/orgs/delete_role            — delete a custom role
 *   POST /v1/orgs/new_scope              — new publishing scope
 *   POST /v1/orgs/update_scope           — rename / change visibility
 *   POST /v1/orgs/delete_scope           — delete a scope
 *   POST /v1/orgs/assign_scope_member    — give a member a scope
 *   POST /v1/orgs/unassign_scope_member  — take it away
 *   POST /v1/orgs/get_scopes             — scopes a user can publish to
 *
 * Every route needs a session (routes/route_auth.ts); Core checks org permissions.
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Orgs*Input` / `Org*Input` in `schemas/orgs_types.ts`.
 */

import { BaseController } from './base_controller.js';
import type { OrgsService } from '../services/orgs_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    OrgIdInput,
    OrgRoleIdInput,
    OrgScopeIdInput,
    OrgScopeMemberInput,
    OrgsCreateRoleInput,
    OrgsGetAllInput,
    OrgsGetInput,
    OrgsGetScopesInput,
    OrgsNewInput,
    OrgsNewScopeInput,
    OrgsRemoveMemberInput,
    OrgsUpdateInput,
    OrgsUpdateRoleInput,
    OrgsUpdateScopeInput,
} from '../schemas/orgs_types.js';
import type {
    OrgDetailData,
    OrgsAssignScopeMemberData,
    OrgsDeleteData,
    OrgsDeleteRoleData,
    OrgsDeleteScopeData,
    OrgsGetAllData,
    OrgsGetData,
    OrgsGetScopesData,
    OrgsLeaveData,
    OrgsListRolesData,
    OrgsNewData,
    OrgsNewScopeData,
    OrgsRemoveMemberData,
    OrgsRoleData,
    OrgsUnassignScopeMemberData,
    OrgsUpdateData,
    OrgsUpdateScopeData,
} from '../schemas/orgs_types.js';

/** Org membership, roles, publishing scopes and site-admin org management. */
export class OrgsController extends BaseController {
    constructor(private readonly _orgs_service: OrgsService) {
        super();
    }

    /**
     * The caller's orgs. A site admin who does not send `mine: true` gets
     * every org on the hub instead (paged, with search).
     *
     * @param req - Body: {@link OrgsGetInput}, or {@link OrgsGetAllInput} for site admins
     * @param res - `{ ok: true, data: OrgsGetData | OrgsGetAllData }`
     */
    async get(
        req: ApiRequest<OrgsGetInput | OrgsGetAllInput, OrgsGetData | OrgsGetAllData>,
        res: ApiOkResponse<OrgsGetData | OrgsGetAllData>,
    ): Promise<void> {
        const session = this.session(req);
        if (session.role === 'admin' && (req.body as { mine?: unknown } | undefined)?.mine !== true) {
            const body = this.parse_body(OrgsGetAllInput, req);
            this.ok(res, await this._orgs_service.get_all(body, session.target_token));
            return;
        }
        const body = this.parse_body(OrgsGetInput, req);
        this.ok(res, await this._orgs_service.get(body, session.target_token));
    }

    /**
     * Creates an org for `owner` (an existing user, or an email that gets an
     * invited account) and sends the owner invite; `reactivate` restores a
     * soft-deleted org with the same slug (site admin).
     *
     * @param req - Body: {@link OrgsNewInput}
     * @param res - `{ ok: true, data: OrgsNewData }`
     */
    async new(req: ApiRequest<OrgsNewInput, OrgsNewData>, res: ApiOkResponse<OrgsNewData>): Promise<void> {
        const body = this.parse_body(OrgsNewInput, req);
        this.ok(res, await this._orgs_service.new(body, this.session(req).target_token));
    }

    /**
     * Soft-deletes an org (site admin; personal orgs cannot be deleted).
     *
     * @param req - Body: {@link OrgIdInput}
     * @param res - `{ ok: true, data: OrgsDeleteData }`
     */
    async delete(req: ApiRequest<OrgIdInput, OrgsDeleteData>, res: ApiOkResponse<OrgsDeleteData>): Promise<void> {
        const body = this.parse_body(OrgIdInput, req);
        this.ok(res, await this._orgs_service.delete(body, this.session(req).target_token));
    }

    /**
     * Org detail: members, publishing scopes and roles (with the permission catalogue for org admins).
     *
     * @param req - Body: {@link OrgIdInput}
     * @param res - `{ ok: true, data: OrgDetailData }`
     */
    async get_by_id(req: ApiRequest<OrgIdInput, OrgDetailData>, res: ApiOkResponse<OrgDetailData>): Promise<void> {
        const body = this.parse_body(OrgIdInput, req);
        this.ok(res, await this._orgs_service.get_by_id(body, this.session(req).target_token));
    }

    /**
     * Renames the org.
     *
     * @param req - Body: {@link OrgsUpdateInput}
     * @param res - `{ ok: true, data: OrgsUpdateData }`
     */
    async update(req: ApiRequest<OrgsUpdateInput, OrgsUpdateData>, res: ApiOkResponse<OrgsUpdateData>): Promise<void> {
        const body = this.parse_body(OrgsUpdateInput, req);
        this.ok(res, await this._orgs_service.update(body, this.session(req).target_token));
    }

    /**
     * The caller leaves the org (the last owner cannot).
     *
     * @param req - Body: {@link OrgIdInput}
     * @param res - `{ ok: true, data: OrgsLeaveData }`
     */
    async leave(req: ApiRequest<OrgIdInput, OrgsLeaveData>, res: ApiOkResponse<OrgsLeaveData>): Promise<void> {
        const body = this.parse_body(OrgIdInput, req);
        this.ok(res, await this._orgs_service.leave(body, this.session(req).target_token));
    }

    /**
     * Removes a member from the org.
     *
     * @param req - Body: {@link OrgsRemoveMemberInput}
     * @param res - `{ ok: true, data: OrgsRemoveMemberData }`
     */
    async remove_member(
        req: ApiRequest<OrgsRemoveMemberInput, OrgsRemoveMemberData>,
        res: ApiOkResponse<OrgsRemoveMemberData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsRemoveMemberInput, req);
        this.ok(res, await this._orgs_service.remove_member(body, this.session(req).target_token));
    }

    /**
     * The org's roles: system roles first, then custom ones.
     *
     * @param req - Body: {@link OrgIdInput}
     * @param res - `{ ok: true, data: OrgsListRolesData }`
     */
    async list_roles(
        req: ApiRequest<OrgIdInput, OrgsListRolesData>,
        res: ApiOkResponse<OrgsListRolesData>,
    ): Promise<void> {
        const body = this.parse_body(OrgIdInput, req);
        this.ok(res, await this._orgs_service.list_roles(body, this.session(req).target_token));
    }

    /**
     * One org role with its permissions.
     *
     * @param req - Body: {@link OrgRoleIdInput}
     * @param res - `{ ok: true, data: OrgsRoleData }`
     */
    async get_role(req: ApiRequest<OrgRoleIdInput, OrgsRoleData>, res: ApiOkResponse<OrgsRoleData>): Promise<void> {
        const body = this.parse_body(OrgRoleIdInput, req);
        this.ok(res, await this._orgs_service.get_role(body, this.session(req).target_token));
    }

    /**
     * Creates a custom org role.
     *
     * @param req - Body: {@link OrgsCreateRoleInput}
     * @param res - `{ ok: true, data: OrgsRoleData }`
     */
    async create_role(
        req: ApiRequest<OrgsCreateRoleInput, OrgsRoleData>,
        res: ApiOkResponse<OrgsRoleData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsCreateRoleInput, req);
        this.ok(res, await this._orgs_service.create_role(body, this.session(req).target_token));
    }

    /**
     * Renames a role or replaces its permissions.
     *
     * @param req - Body: {@link OrgsUpdateRoleInput}
     * @param res - `{ ok: true, data: OrgsRoleData }`
     */
    async update_role(
        req: ApiRequest<OrgsUpdateRoleInput, OrgsRoleData>,
        res: ApiOkResponse<OrgsRoleData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsUpdateRoleInput, req);
        this.ok(res, await this._orgs_service.update_role(body, this.session(req).target_token));
    }

    /**
     * Deletes a custom role (system roles cannot be deleted).
     *
     * @param req - Body: {@link OrgRoleIdInput}
     * @param res - `{ ok: true, data: OrgsDeleteRoleData }`
     */
    async delete_role(
        req: ApiRequest<OrgRoleIdInput, OrgsDeleteRoleData>,
        res: ApiOkResponse<OrgsDeleteRoleData>,
    ): Promise<void> {
        const body = this.parse_body(OrgRoleIdInput, req);
        this.ok(res, await this._orgs_service.delete_role(body, this.session(req).target_token));
    }

    /**
     * Creates a publishing scope in the org.
     *
     * @param req - Body: {@link OrgsNewScopeInput}
     * @param res - `{ ok: true, data: OrgsNewScopeData }`
     */
    async new_scope(
        req: ApiRequest<OrgsNewScopeInput, OrgsNewScopeData>,
        res: ApiOkResponse<OrgsNewScopeData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsNewScopeInput, req);
        this.ok(res, await this._orgs_service.new_scope(body, this.session(req).target_token));
    }

    /**
     * Renames a scope or changes its visibility.
     *
     * @param req - Body: {@link OrgsUpdateScopeInput}
     * @param res - `{ ok: true, data: OrgsUpdateScopeData }`
     */
    async update_scope(
        req: ApiRequest<OrgsUpdateScopeInput, OrgsUpdateScopeData>,
        res: ApiOkResponse<OrgsUpdateScopeData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsUpdateScopeInput, req);
        this.ok(res, await this._orgs_service.update_scope(body, this.session(req).target_token));
    }

    /**
     * Deletes a publishing scope.
     *
     * @param req - Body: {@link OrgScopeIdInput}
     * @param res - `{ ok: true, data: OrgsDeleteScopeData }`
     */
    async delete_scope(
        req: ApiRequest<OrgScopeIdInput, OrgsDeleteScopeData>,
        res: ApiOkResponse<OrgsDeleteScopeData>,
    ): Promise<void> {
        const body = this.parse_body(OrgScopeIdInput, req);
        this.ok(res, await this._orgs_service.delete_scope(body, this.session(req).target_token));
    }

    /**
     * Lets a member publish to a scope.
     *
     * @param req - Body: {@link OrgScopeMemberInput}
     * @param res - `{ ok: true, data: OrgsAssignScopeMemberData }`
     */
    async assign_scope_member(
        req: ApiRequest<OrgScopeMemberInput, OrgsAssignScopeMemberData>,
        res: ApiOkResponse<OrgsAssignScopeMemberData>,
    ): Promise<void> {
        const body = this.parse_body(OrgScopeMemberInput, req);
        this.ok(res, await this._orgs_service.assign_scope_member(body, this.session(req).target_token));
    }

    /**
     * Stops a member publishing to a scope.
     *
     * @param req - Body: {@link OrgScopeMemberInput}
     * @param res - `{ ok: true, data: OrgsUnassignScopeMemberData }`
     */
    async unassign_scope_member(
        req: ApiRequest<OrgScopeMemberInput, OrgsUnassignScopeMemberData>,
        res: ApiOkResponse<OrgsUnassignScopeMemberData>,
    ): Promise<void> {
        const body = this.parse_body(OrgScopeMemberInput, req);
        this.ok(res, await this._orgs_service.unassign_scope_member(body, this.session(req).target_token));
    }

    /**
     * Scopes a user can publish to, paged.
     *
     * @param req - Body: {@link OrgsGetScopesInput}
     * @param res - `{ ok: true, data: OrgsGetScopesData }`
     */
    async get_scopes(
        req: ApiRequest<OrgsGetScopesInput, OrgsGetScopesData>,
        res: ApiOkResponse<OrgsGetScopesData>,
    ): Promise<void> {
        const body = this.parse_body(OrgsGetScopesInput, req);
        this.ok(res, await this._orgs_service.get_scopes(body, this.session(req).target_token));
    }
}
