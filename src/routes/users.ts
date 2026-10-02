/**
 * Users routes — site-admin user management, org roles, the caller's own account.
 *
 * POST /v1/users/get
 * POST /v1/users/get_by_id
 * POST /v1/users/new
 * POST /v1/users/update
 * POST /v1/users/suspend
 * POST /v1/users/unsuspend
 * POST /v1/users/delete
 * POST /v1/users/set_role
 * POST /v1/users/reset_password
 * POST /v1/users/update_role
 * POST /v1/users/update_profile
 * POST /v1/users/change_password
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the users routes listed above. */
export function register_users_routes(r: RouteRegistrar, { users_controller: c }: Container): void {
    r.post('/v1/users/get', c.wrap(c.get));
    r.post('/v1/users/get_by_id', c.wrap(c.get_by_id));
    r.post('/v1/users/new', c.wrap(c.new));
    r.post('/v1/users/update', c.wrap(c.update));
    r.post('/v1/users/suspend', c.wrap(c.suspend));
    r.post('/v1/users/unsuspend', c.wrap(c.unsuspend));
    r.post('/v1/users/delete', c.wrap(c.delete));
    r.post('/v1/users/set_role', c.wrap(c.set_role));
    r.post('/v1/users/reset_password', c.wrap(c.reset_password));
    r.post('/v1/users/update_role', c.wrap(c.update_role));
    r.post('/v1/users/update_profile', c.wrap(c.update_profile));
    r.post('/v1/users/change_password', c.wrap(c.change_password));
}
