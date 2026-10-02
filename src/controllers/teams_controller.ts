/**
 * Teams — the team catalog, a team's versions and phases, team authoring, and the AI builder.
 *
 * Routes (1:1 with this controller, mounted in routes/teams.ts):
 *   POST /v1/teams/get           — catalog / realm roster / daemon inventory   (public)
 *   POST /v1/teams/get_by_id     — one team                                    (public)
 *   POST /v1/teams/get_versions  — version history                             (public)
 *   POST /v1/teams/get_phases    — workflow phases of a version                (public)
 *   POST /v1/teams/create        — new draft
 *   POST /v1/teams/update        — update a draft
 *   POST /v1/teams/download      — package of a version
 *   POST /v1/teams/publish       — publish a version
 *   POST /v1/teams/unpublish     — back to draft
 *   POST /v1/teams/delete        — soft-delete
 *   POST /v1/teams/rename        — rename within its scope
 *   POST /v1/teams/build         — AI builder actions                          (public, rate limited)
 *
 * `/v1/teams/install`, `/uninstall`, `/delete_version` are Core passthrough (routes/passthrough_paths.ts).
 * Response envelope: `{ ok: true, data: T }` via `this.ok()`.
 * Inbound SoT: Zod `Teams*Input` in `schemas/teams_types.ts`, `TeamsBuildInput` in `schemas/builder_types.ts`.
 */

import { BaseController } from './base_controller.js';
import { ApiError } from '../errors/api_error.js';
import type { TeamsService } from '../services/teams_service.js';
import type { BuilderService } from '../services/builder_service.js';
import type { ApiOkResponse, ApiRequest } from '../types/api_response.js';
import {
    TeamRefInput,
    TeamsCreateInput,
    TeamsDownloadInput,
    TeamsGetByIdInput,
    TeamsGetInput,
    TeamsGetPhasesInput,
    TeamsGetVersionsInput,
    TeamsPublishInput,
    TeamsRenameInput,
    TeamsUpdateInput,
} from '../schemas/teams_types.js';
import type {
    TeamDetailData,
    TeamMutationData,
    TeamsDeleteData,
    TeamsDownloadData,
    TeamsGetData,
    TeamsGetPhasesData,
    TeamsGetVersionsData,
} from '../schemas/teams_types.js';
import { TeamsBuildInput } from '../schemas/builder_types.js';
import type { TeamsBuildData } from '../schemas/builder_types.js';

/** Team catalog, versions, phases, authoring and the AI builder. */
export class TeamsController extends BaseController {
    constructor(
        private readonly _teams_service: TeamsService,
        private readonly _builder_service?: BuilderService,
    ) {
        super();
    }

    /**
     * One list in three modes: the hub catalog (site admins see every team), a realm's roster with daemon coverage (`realm_id`) or the teams installed on a daemon (`daemon_id`). Readable without a session.
     *
     * @param req - Body: {@link TeamsGetInput}
     * @param res - `{ ok: true, data: TeamsGetData }`
     */
    async get(req: ApiRequest<TeamsGetInput, TeamsGetData>, res: ApiOkResponse<TeamsGetData>): Promise<void> {
        const body = this.parse_body(TeamsGetInput, req);
        this.ok(res, await this._teams_service.get(body, this.optional_token(req)));
    }

    /**
     * One team with its versions, roles, workflow and what the caller may do with it. Readable without a session for public teams.
     *
     * @param req - Body: {@link TeamsGetByIdInput}
     * @param res - `{ ok: true, data: TeamDetailData }`
     */
    async get_by_id(
        req: ApiRequest<TeamsGetByIdInput, TeamDetailData>,
        res: ApiOkResponse<TeamDetailData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsGetByIdInput, req);
        this.ok(res, await this._teams_service.get_by_id(body, this.optional_token(req)));
    }

    /**
     * A team's version history, newest first, or only the latest version (`latest_only`).
     *
     * @param req - Body: {@link TeamsGetVersionsInput}
     * @param res - `{ ok: true, data: TeamsGetVersionsData }`
     */
    async get_versions(
        req: ApiRequest<TeamsGetVersionsInput, TeamsGetVersionsData>,
        res: ApiOkResponse<TeamsGetVersionsData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsGetVersionsInput, req);
        this.ok(res, await this._teams_service.get_versions(body, this.optional_token(req)));
    }

    /**
     * Workflow phases of a version (latest published when `version_id` is omitted).
     *
     * @param req - Body: {@link TeamsGetPhasesInput}
     * @param res - `{ ok: true, data: TeamsGetPhasesData }`
     */
    async get_phases(
        req: ApiRequest<TeamsGetPhasesInput, TeamsGetPhasesData>,
        res: ApiOkResponse<TeamsGetPhasesData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsGetPhasesInput, req);
        this.ok(res, await this._teams_service.get_phases(body, this.optional_token(req)));
    }

    /**
     * Creates a draft team; a manifest seeds version 0.1.0.
     *
     * @param req - Body: {@link TeamsCreateInput}
     * @param res - `{ ok: true, data: TeamMutationData }`
     */
    async create(
        req: ApiRequest<TeamsCreateInput, TeamMutationData>,
        res: ApiOkResponse<TeamMutationData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsCreateInput, req);
        this.ok(res, await this._teams_service.create(body, this.session(req).target_token));
    }

    /**
     * Updates a draft's manifest or description (patch bump unless `bump` says otherwise).
     *
     * @param req - Body: {@link TeamsUpdateInput}
     * @param res - `{ ok: true, data: TeamMutationData }`
     */
    async update(
        req: ApiRequest<TeamsUpdateInput, TeamMutationData>,
        res: ApiOkResponse<TeamMutationData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsUpdateInput, req);
        this.ok(res, await this._teams_service.update(body, this.session(req).target_token));
    }

    /**
     * The zip package of a version (latest published by default).
     *
     * @param req - Body: {@link TeamsDownloadInput}
     * @param res - `{ ok: true, data: TeamsDownloadData }`
     */
    async download(
        req: ApiRequest<TeamsDownloadInput, TeamsDownloadData>,
        res: ApiOkResponse<TeamsDownloadData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsDownloadInput, req);
        this.ok(res, await this._teams_service.download(body, this.session(req).target_token));
    }

    /**
     * Publishes a version as public or private.
     *
     * @param req - Body: {@link TeamsPublishInput}
     * @param res - `{ ok: true, data: TeamMutationData }`
     */
    async publish(
        req: ApiRequest<TeamsPublishInput, TeamMutationData>,
        res: ApiOkResponse<TeamMutationData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsPublishInput, req);
        this.ok(res, await this._teams_service.publish(body, this.session(req).target_token));
    }

    /**
     * Takes a published team back to draft; its versions are kept.
     *
     * @param req - Body: {@link TeamRefInput}
     * @param res - `{ ok: true, data: TeamMutationData }`
     */
    async unpublish(
        req: ApiRequest<TeamRefInput, TeamMutationData>,
        res: ApiOkResponse<TeamMutationData>,
    ): Promise<void> {
        const body = this.parse_body(TeamRefInput, req);
        this.ok(res, await this._teams_service.unpublish(body, this.session(req).target_token));
    }

    /**
     * Soft-deletes a team with all its versions.
     *
     * @param req - Body: {@link TeamRefInput}
     * @param res - `{ ok: true, data: TeamsDeleteData }`
     */
    async delete(req: ApiRequest<TeamRefInput, TeamsDeleteData>, res: ApiOkResponse<TeamsDeleteData>): Promise<void> {
        const body = this.parse_body(TeamRefInput, req);
        this.ok(res, await this._teams_service.delete(body, this.session(req).target_token));
    }

    /**
     * Renames a team inside its scope; the old name is free at once.
     *
     * @param req - Body: {@link TeamsRenameInput}
     * @param res - `{ ok: true, data: TeamMutationData }`
     */
    async rename(
        req: ApiRequest<TeamsRenameInput, TeamMutationData>,
        res: ApiOkResponse<TeamMutationData>,
    ): Promise<void> {
        const body = this.parse_body(TeamsRenameInput, req);
        this.ok(res, await this._teams_service.rename(body, this.session(req).target_token));
    }

    /**
     * One AI builder action (`generate`, `status`, `improve_role`, `suggest`,
     * `validate`, `chat`); required fields depend on the action.
     *
     * @param req - Body: {@link TeamsBuildInput}
     * @param res - `{ ok: true, data: TeamsBuildData }` — shape depends on the action
     * @throws ApiError 500 when the builder is not configured
     */
    async build(req: ApiRequest<TeamsBuildInput, TeamsBuildData>, res: ApiOkResponse<TeamsBuildData>): Promise<void> {
        const body = this.parse_body(TeamsBuildInput, req);
        if (!this._builder_service) throw ApiError.internal('Builder service not configured');
        this.ok(res, await this._builder_service.build(body, this.optional_token(req)));
    }
}
