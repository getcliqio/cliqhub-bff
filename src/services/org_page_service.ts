import type { CoreApiClient } from '../repositories/core_api_client.js';

/**
 * Manage › Organization (customer org owners/admins) — one BFF read.
 * Core routes (all existing): orgs/get_by_id (members, roles, scopes),
 * invitations/get {target_type:'org'} (pending invites), permissions/list.
 * Invites and the permission catalogue are best-effort: a member without
 * invite rights still gets the page, with `invites: null`.
 */
export interface OrgPageDTO {
    org: Record<string, unknown>;
    invites: Array<Record<string, unknown>> | null;
    permissions: { all: string[]; owner_only: string[] } | null;
    partial: boolean;
}

function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

export class OrgPageService {
    constructor(private _core: CoreApiClient) {}

    async page(token: string, p: { org_id: string }): Promise<OrgPageDTO> {
        let partial = false;
        const soft = <T>(pr: Promise<T>) => pr.catch(() => { partial = true; return null; });
        const [org, inv, perms] = await Promise.all([
            this._core.post('/v1/orgs/get_by_id', { org_id: p.org_id }, token),
            soft(this._core.post('/v1/invitations/get', { target_type: 'org', org_id: p.org_id, limit: 100 }, token)),
            soft(this._core.post('/v1/permissions/list', {}, token)),
        ]);
        const invites = inv ? (data_of<{ invites?: Array<Record<string, unknown>> }>(inv)?.invites ?? []) : null;
        const pd = perms ? data_of<{ permissions?: string[]; owner_only?: string[] }>(perms) : null;
        return {
            org: data_of<Record<string, unknown>>(org),
            invites,
            permissions: pd ? { all: pd.permissions ?? [], owner_only: pd.owner_only ?? [] } : null,
            partial,
        };
    }
}
