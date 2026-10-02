/**
 * Auth routes — sessions, sign-up, tokens, realm dispatch keys.
 *
 * POST /v1/session/create
 * POST /v1/session/get
 * POST /v1/session/update
 * POST /v1/session/delete
 * POST /v1/auth/signup
 * POST /v1/auth/generate_token
 * POST /v1/auth/get_tokens
 * POST /v1/auth/revoke_token
 * POST /v1/auth/rotate_token
 * POST /v1/auth/get_dispatch_public_key
 * POST /v1/auth/rotate_dispatch_key
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the auth / session / token / dispatch-key routes listed above. */
export function register_auth_routes(r: RouteRegistrar, container: Container): void {
    const { session_controller: session, auth_controller: auth, tokens_controller: tokens, dispatch_key_controller: keys } = container;

    r.post('/v1/session/create', session.wrap(session.create));
    r.post('/v1/session/get', session.wrap(session.get));
    r.post('/v1/session/update', session.wrap(session.update));
    r.post('/v1/session/delete', session.wrap(session.delete));

    r.post('/v1/auth/signup', auth.wrap(auth.signup));

    r.post('/v1/auth/generate_token', tokens.wrap(tokens.generate));
    r.post('/v1/auth/get_tokens', tokens.wrap(tokens.get));
    r.post('/v1/auth/revoke_token', tokens.wrap(tokens.revoke));
    r.post('/v1/auth/rotate_token', tokens.wrap(tokens.rotate));

    r.post('/v1/auth/get_dispatch_public_key', keys.wrap(keys.get_public_key));
    r.post('/v1/auth/rotate_dispatch_key', keys.wrap(keys.rotate));
}
