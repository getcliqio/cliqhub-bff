/**
 * Orgs routes — membership, roles, publishing scopes; site-admin org management.
 *
 * POST /v1/orgs/get
 * POST /v1/orgs/new
 * POST /v1/orgs/delete
 * POST /v1/orgs/get_by_id
 * POST /v1/orgs/update
 * POST /v1/orgs/leave
 * POST /v1/orgs/remove_member
 * POST /v1/orgs/list_roles
 * POST /v1/orgs/get_role
 * POST /v1/orgs/create_role
 * POST /v1/orgs/update_role
 * POST /v1/orgs/delete_role
 * POST /v1/orgs/new_scope
 * POST /v1/orgs/update_scope
 * POST /v1/orgs/delete_scope
 * POST /v1/orgs/assign_scope_member
 * POST /v1/orgs/unassign_scope_member
 * POST /v1/orgs/get_scopes
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the orgs routes listed above. */
export function register_orgs_routes(r: RouteRegistrar, { orgs_controller: c }: Container): void {
    r.post('/v1/orgs/get', c.wrap(c.get));
    r.post('/v1/orgs/new', c.wrap(c.new));
    r.post('/v1/orgs/delete', c.wrap(c.delete));
    r.post('/v1/orgs/get_by_id', c.wrap(c.get_by_id));
    r.post('/v1/orgs/update', c.wrap(c.update));
    r.post('/v1/orgs/leave', c.wrap(c.leave));
    r.post('/v1/orgs/remove_member', c.wrap(c.remove_member));
    r.post('/v1/orgs/list_roles', c.wrap(c.list_roles));
    r.post('/v1/orgs/get_role', c.wrap(c.get_role));
    r.post('/v1/orgs/create_role', c.wrap(c.create_role));
    r.post('/v1/orgs/update_role', c.wrap(c.update_role));
    r.post('/v1/orgs/delete_role', c.wrap(c.delete_role));
    r.post('/v1/orgs/new_scope', c.wrap(c.new_scope));
    r.post('/v1/orgs/update_scope', c.wrap(c.update_scope));
    r.post('/v1/orgs/delete_scope', c.wrap(c.delete_scope));
    r.post('/v1/orgs/assign_scope_member', c.wrap(c.assign_scope_member));
    r.post('/v1/orgs/unassign_scope_member', c.wrap(c.unassign_scope_member));
    r.post('/v1/orgs/get_scopes', c.wrap(c.get_scopes));
}
