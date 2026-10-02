/**
 * Invitations routes — org and realm invites.
 *
 * POST /v1/invitations/create
 * POST /v1/invitations/get
 * POST /v1/invitations/get_by_id
 * POST /v1/invitations/revoke
 * POST /v1/invitations/get_by_token
 * POST /v1/invitations/accept
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the invitations routes listed above. */
export function register_invitations_routes(r: RouteRegistrar, { invitations_controller: c }: Container): void {
    r.post('/v1/invitations/create', c.wrap(c.create));
    r.post('/v1/invitations/get', c.wrap(c.get));
    r.post('/v1/invitations/get_by_id', c.wrap(c.get_by_id));
    r.post('/v1/invitations/revoke', c.wrap(c.revoke));
    r.post('/v1/invitations/get_by_token', c.wrap(c.get_by_token));
    r.post('/v1/invitations/accept', c.wrap(c.accept));
}
