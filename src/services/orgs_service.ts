/**
 * Orgs — one Core call per action, mapped to BFF data.
 * Core enforces org permissions; the BFF route table answers 401/403 first.
 */

import { get_logger } from '../lib/log.js';
import { core_query, core_sort, sortable_keys } from '../lib/core_list.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { CoreCompatService } from './core_compat_service.js';
import type {
    OrgsGetInput, OrgsGetAllInput, OrgsNewInput, OrgIdInput, OrgsUpdateInput,
    OrgsRemoveMemberInput, OrgRoleIdInput, OrgsCreateRoleInput, OrgsUpdateRoleInput,
    OrgsNewScopeInput, OrgsUpdateScopeInput, OrgScopeIdInput, OrgScopeMemberInput, OrgsGetScopesInput,
    OrgsGetData, OrgsGetAllData, OrgsNewData, OrgsDeleteData, OrgDetailData, OrgsUpdateData,
    OrgsLeaveData, OrgsRemoveMemberData, OrgsListRolesData, OrgsRoleData,
    OrgsDeleteRoleData, OrgsNewScopeData, OrgsUpdateScopeData, OrgsDeleteScopeData,
    OrgsAssignScopeMemberData, OrgsUnassignScopeMemberData, OrgsGetScopesData,
} from '../schemas/orgs_types.js';
import {
    to_orgs_get_data, to_orgs_get_all_data, to_orgs_new_data, to_orgs_delete_data,
    to_org_detail_data, to_orgs_update_data, to_orgs_leave_data,
    to_orgs_remove_member_data, to_orgs_list_roles_data, to_orgs_role_data,
    to_orgs_delete_role_data, to_orgs_new_scope_data, to_orgs_update_scope_data,
    to_orgs_delete_scope_data, to_orgs_assign_scope_member_data,
    to_orgs_unassign_scope_member_data, to_orgs_get_scopes_data,
} from '../mappers/orgs_mapper.js';

const log = get_logger('svc.orgs');

/** Org reads and org-admin actions: orgs, members, roles, scopes. */
export class OrgsService {
    /**
     * @param _repo - Core org calls.
     * @param _compat - Core version check; sort fields new in Core API 6 are only sent to a Core that has them.
     */
    constructor(private readonly _repo: OrgsRepository, private readonly _compat?: CoreCompatService) {}

    /** Orgs the caller belongs to. */
    async get(input: OrgsGetInput, token: string): Promise<OrgsGetData> {
        return to_orgs_get_data(await this._repo.get(input, token));
    }

    /**
     * Every org on the hub (site admin). `search` / `query` go to Core as
     * `query` (Core's only search field); `sort_by` only where Core supports it.
     */
    async get_all(input: OrgsGetAllInput, token: string): Promise<OrgsGetAllData> {
        const api = await this._compat?.api_version() ?? null;
        const vo = await this._repo.get_all({
            ...core_query(input.query, input.search),
            ...(input.limit != null ? { limit: input.limit } : {}),
            ...(input.offset != null ? { offset: input.offset } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.include_deleted != null ? { include_deleted: input.include_deleted } : {}),
            ...core_sort('orgs.get', input, {}, api),
        }, token);
        return to_orgs_get_all_data(vo, sortable_keys('orgs.get', api));
    }

    /**
     * Creates an org (or, with `reactivate`, restores a soft-deleted one) and
     * invites its owner. Core's 409 `conflict` / `deleted` propagate unchanged.
     */
    async new(input: OrgsNewInput, token: string): Promise<OrgsNewData> {
        const data = to_orgs_new_data(await this._repo.new(input, token));
        log.info('org_created', {
            org_id: data.org.id, slug: data.org.slug, reactivated: data.org.reactivated,
            owner_id: data.org.owner.user_id, invite_id: data.owner_invite.invite_id, email_sent: data.owner_invite.email_sent,
        });
        return data;
    }

    /** Soft-deletes an org (site admin); the slug stays taken. */
    async delete(input: OrgIdInput, token: string): Promise<OrgsDeleteData> {
        const data = to_orgs_delete_data(await this._repo.delete(input, token));
        log.info('org_deleted', { org_id: input.org_id });
        return data;
    }

    /** One org with its status, owner, members (active, pending and former), roles and scopes. */
    async get_by_id(input: OrgIdInput, token: string): Promise<OrgDetailData> {
        return to_org_detail_data(await this._repo.get_by_id(input, token));
    }

    /** Renames an org (display name only). */
    async update(input: OrgsUpdateInput, token: string): Promise<OrgsUpdateData> {
        return to_orgs_update_data(await this._repo.update(input, token));
    }

    /** The caller leaves the org. */
    async leave(input: OrgIdInput, token: string): Promise<OrgsLeaveData> {
        return to_orgs_leave_data(await this._repo.leave(input, token));
    }

    /** Removes a member from the org. */
    async remove_member(input: OrgsRemoveMemberInput, token: string): Promise<OrgsRemoveMemberData> {
        const data = to_orgs_remove_member_data(await this._repo.remove_member(input, token));
        log.info('org_member_removed', { org_id: input.org_id, user_id: input.user_id });
        return data;
    }

    /** The org's roles. */
    async list_roles(input: OrgIdInput, token: string): Promise<OrgsListRolesData> {
        return to_orgs_list_roles_data(await this._repo.list_roles(input, token));
    }

    /** One org role with its permissions. */
    async get_role(input: OrgRoleIdInput, token: string): Promise<OrgsRoleData> {
        return to_orgs_role_data(await this._repo.get_role(input, token));
    }

    /** Creates a custom org role. */
    async create_role(input: OrgsCreateRoleInput, token: string): Promise<OrgsRoleData> {
        const data = to_orgs_role_data(await this._repo.create_role(input, token));
        log.info('org_role_created', { org_id: input.org_id, role_id: data.role.id });
        return data;
    }

    /** Changes a role's name and / or permissions. */
    async update_role(input: OrgsUpdateRoleInput, token: string): Promise<OrgsRoleData> {
        const data = to_orgs_role_data(await this._repo.update_role(input, token));
        log.info('org_role_updated', { org_id: input.org_id, role_id: input.role_id });
        return data;
    }

    /** Deletes a custom org role. */
    async delete_role(input: OrgRoleIdInput, token: string): Promise<OrgsDeleteRoleData> {
        const data = to_orgs_delete_role_data(await this._repo.delete_role(input, token));
        log.info('org_role_deleted', { org_id: input.org_id, role_id: input.role_id });
        return data;
    }

    /** Creates a scope (publisher namespace) in the org. */
    async new_scope(input: OrgsNewScopeInput, token: string): Promise<OrgsNewScopeData> {
        const data = to_orgs_new_scope_data(await this._repo.new_scope(input, token));
        log.info('org_scope_created', { org_id: input.org_id, scope_id: data.id });
        return data;
    }

    /** Changes a scope's display name / visibility. */
    async update_scope(input: OrgsUpdateScopeInput, token: string): Promise<OrgsUpdateScopeData> {
        const data = to_orgs_update_scope_data(await this._repo.update_scope(input, token));
        log.info('org_scope_updated', { org_id: input.org_id, scope_id: input.scope_id });
        return data;
    }

    /** Deletes a scope. */
    async delete_scope(input: OrgScopeIdInput, token: string): Promise<OrgsDeleteScopeData> {
        const data = to_orgs_delete_scope_data(await this._repo.delete_scope(input, token));
        log.info('org_scope_deleted', { org_id: input.org_id, scope_id: input.scope_id });
        return data;
    }

    /** Lets a user publish to a scope. */
    async assign_scope_member(input: OrgScopeMemberInput, token: string): Promise<OrgsAssignScopeMemberData> {
        const data = to_orgs_assign_scope_member_data(await this._repo.assign_scope_member(input, token));
        log.info('org_scope_member_assigned', { org_id: input.org_id, scope_id: input.scope_id, user_id: input.user_id });
        return data;
    }

    /** Removes a user from a scope. */
    async unassign_scope_member(input: OrgScopeMemberInput, token: string): Promise<OrgsUnassignScopeMemberData> {
        const data = to_orgs_unassign_scope_member_data(await this._repo.unassign_scope_member(input, token));
        log.info('org_scope_member_unassigned', { org_id: input.org_id, scope_id: input.scope_id, user_id: input.user_id });
        return data;
    }

    /** Scopes a user can publish to, optionally within one org. */
    async get_scopes(input: OrgsGetScopesInput, token: string): Promise<OrgsGetScopesData> {
        return to_orgs_get_scopes_data(await this._repo.get_scopes({
            user_id: input.user_id,
            ...(input.org_id ? { org_id: input.org_id } : {}),
            ...core_query(input.query, input.search),
            ...(input.limit != null ? { limit: input.limit } : {}),
            ...(input.offset != null ? { offset: input.offset } : {}),
        }, token));
    }
}
