/**
 * The browser session cookie and the CLI sign-in convention, in one place.
 * A client sending `X-Client: cli` gets the bearer token in the body instead
 * of relying on the cookie.
 */

import type { Request, Response } from 'express';
import type { EnvConfig } from '../config/env.js';

/** Sets the httpOnly session cookie. */
export function set_session_cookie(res: Response, config: EnvConfig, session_id: string): void {
    res.cookie(config.cookie_name, session_id, {
        httpOnly: true,
        secure: config.node_env === 'production',
        sameSite: 'lax',
        maxAge: config.session_ttl_seconds * 1000,
        path: '/',
    });
}

/** Clears the session cookie. */
export function clear_session_cookie(res: Response, config: EnvConfig): void {
    res.clearCookie(config.cookie_name);
}

/** True for the CLI (`X-Client: cli`), which wants the bearer token in the body. */
export function wants_bearer_token(req: Request): boolean {
    return (req.get('x-client') ?? '').trim().toLowerCase() === 'cli';
}
