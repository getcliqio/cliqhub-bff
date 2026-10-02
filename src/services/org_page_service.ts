/**
 * Manage › Organization (customer org owners/admins) — one BFF read.
 * Core routes: orgs/get_by_id (status, owner, members incl. pending and
 * former, roles, scopes), invitations/get {target_type:'org', status:'pending'}
 * (pending invites with their deliveries), permissions/list.
 * Invites and the permission catalogue are best-effort: a member without
 * invite rights still gets the page, with `invites: null`.
 */

import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';
import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { OrgDetailVO } from '../types/core/orgs.js';
import type { InvitationsGetVO } from '../types/core/invitations.js';
import type { OrgPageGetInput, OrgPageData } from '../schemas/org_page_types.js';
import { to_org_detail_data } from '../mappers/orgs_mapper.js';
import { to_invitation_list_item_data } from '../mappers/invitations_mapper.js';

/** Pending invites the page shows: newest first, one page of up to 100. */
const PENDING_INVITES = { status: 'pending', sort: '-created_at', page: 1, page_size: 100 } as const;

const log = get_logger('svc.org_page');

/** Unwraps Core's `{ ok, data }` envelope when present. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

/** Manage › Organization page for org owners/admins. */
export class OrgPageService {
    constructor(private readonly _reads: CoreReadRepository) {}

    /**
     * The org page: the org with its members (required) plus pending invites
     * and the permission catalogue (best-effort → `partial`).
     *
     * @param input - {@link OrgPageGetInput}
     * @param token - Caller's Core token
     */
    async get(input: OrgPageGetInput, token: string): Promise<OrgPageData> {
        let partial = false;
        const soft = async <T>(event: string, pr: Promise<T>): Promise<T | null> => {
            const r = await best_effort(log, event, pr.then((v) => ({ v })), null, { org_id: input.org_id });
            if (r === null) { partial = true; return null; }
            return r.v;
        };
        const [org, inv, perms] = await Promise.all([
            this._reads.read('orgs.get_by_id', { org_id: input.org_id }, token),
            soft('org_page_invites_failed', this._reads.read('invitations.get', { target_type: 'org', org_id: input.org_id, ...PENDING_INVITES }, token)),
            soft('org_page_permissions_failed', this._reads.read('permissions.list', {}, token)),
        ]);
        const invites = inv ? (data_of<Partial<InvitationsGetVO>>(inv)?.invites ?? []).map(to_invitation_list_item_data) : null;
        const pd = perms ? data_of<{ permissions?: string[]; owner_only?: string[] }>(perms) : null;
        return {
            org: to_org_detail_data(data_of<OrgDetailVO>(org)),
            invites,
            permissions: pd ? { all: pd.permissions ?? [], owner_only: pd.owner_only ?? [] } : null,
            partial,
        };
    }
}
