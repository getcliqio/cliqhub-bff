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

declare global {
    namespace Express {
        interface Request {
            session_data?: SessionRecord;
        }
    }
}

/** Optional fallback for opaque tokens (cliq_tok_…) that are not cookie sessions. */
export type BearerHydrator = (token: string) => Promise<SessionRecord | null>;

function read_bearer(req: Request): string | null {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token || null;
}

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
                    session_store.touch(sid).catch(() => {});
                    next();
                    return;
                }
            } catch {
                // Session lookup failed — fall through to Bearer
            }
        }

        const bearer = read_bearer(req);
        if (bearer && hydrate_bearer) {
            try {
                const hydrated = await hydrate_bearer(bearer);
                if (hydrated) {
                    req.session_data = hydrated;
                }
            } catch {
                // treat as unauthenticated
            }
        }

        next();
    };
}

export function require_session(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (!req.session_data) {
        res.status(401).json({
            ok: false,
            error: { code: 'unauthorized', message: 'Login required' },
        });
        return;
    }
    next();
}
