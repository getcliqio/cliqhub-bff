/**
 * Session / Bearer auth for the Hub BFF.
 *
 * Credential model after session-PAT redesign:
 *   - Browser: cookie → bff.sessions row (dual tokens; data-plane uses target_token)
 *   - CLI / daemon: Authorization: Bearer <cliq_tok_… user PAT>
 *
 * Hub session JWTs are no longer accepted. Opaque PATs are hydrated via Core.
 * Both populate `req.session_data`. Cookie wins when both are present.
 */

import type { Request, Response, NextFunction } from 'express';
import type { SessionStore, SessionRecord } from '../repositories/session_store.js';
import { best_effort, error_fields } from '../lib/best_effort.js';
import { get_logger } from '../lib/log.js';
import { ApiError } from '../errors/api_error.js';

const log = get_logger('mw.session_auth');

declare global {
    namespace Express {
        interface Request {
            session_data?: SessionRecord;
        }
    }
}

/** Optional fallback for opaque tokens (cliq_tok_…) that are not cookie sessions. */
export type BearerHydrator = (token: string) => Promise<SessionRecord | null>;

/** The `Authorization: Bearer …` value, or null when absent / empty. */
function read_bearer(req: Request): string | null {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token || null;
}

/**
 * Middleware that sets `req.session_data` from the session cookie, else from a
 * Bearer PAT via `hydrate_bearer`. A request without a usable credential
 * continues signed out and `enforce_route_auth` decides; the one rejection is
 * a session cookie that can't be checked because the session DB is down (503,
 * not 401, so clients keep the session).
 */
export function create_session_auth(
    session_store: SessionStore,
    cookie_name: string,
    hydrate_bearer?: BearerHydrator,
) {
    return async function session_auth(
        req: Request,
        _res: Response,
        next: NextFunction,
    ): Promise<void> {
        const sid = req.cookies?.[cookie_name];

        if (sid) {
            try {
                const record = await session_store.find(sid);
                if (record) {
                    req.session_data = record;
                    // Sliding expiry is not worth delaying the request for: fire and forget.
                    void best_effort(log, 'session_touch_failed', session_store.touch(sid), undefined, { user_id: record.user_id });
                    next();
                    return;
                }
            } catch (err) {
                // Session DB unavailable (e.g. while it restarts). Answering as
                // "signed out" would be wrong: a 401 makes clients drop a session
                // that is still valid. Say it's temporary instead.
                log.error('session_lookup_failed', error_fields(err));
                next(new ApiError('session_store_unavailable', 'Sessions are temporarily unavailable — try again shortly', 503));
                return;
            }
        }

        const bearer = read_bearer(req);
        if (bearer && hydrate_bearer) {
            try {
                const hydrated = await hydrate_bearer(bearer);
                if (hydrated) {
                    req.session_data = hydrated;
                }
            } catch (err) {
                // A bad / revoked / unverifiable PAT is treated as signed out;
                // enforce_route_auth answers 401. Never log the token.
                log.debug('bearer_hydration_failed', error_fields(err));
            }
        }

        next();
    };
}

