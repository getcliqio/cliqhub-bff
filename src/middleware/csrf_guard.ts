import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REQUIRED_HEADER = 'x-requested-with';
const REQUIRED_VALUE = 'XMLHttpRequest';

/**
 * Simple CSRF protection based on a custom request header.
 * Browsers enforce same-origin policy for custom headers
 * in `fetch()` and `XMLHttpRequest`.
 *
 * Bearer machine clients (CLI / daemon / SDK) are not cookie-session CSRF
 * targets — Authorization alone is sufficient to skip this check.
 */
export function csrf_guard(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    const auth = req.get('authorization') ?? '';
    if (auth.startsWith('Bearer ') && auth.slice(7).trim()) {
        next();
        return;
    }

    const header = req.get(REQUIRED_HEADER);
    if (header === REQUIRED_VALUE) {
        next();
        return;
    }

    res.status(403).json({
        ok: false,
        error: {
            code: 'csrf_rejected',
            message: `Missing or invalid ${REQUIRED_HEADER} header`,
        },
    });
}
