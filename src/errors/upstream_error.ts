/**
 * Maps a failed Core response to the `ApiError` the SPA shows, including the
 * explicit "BFF and Core are different versions" cases. Used only by CoreClient.
 */

import { ApiError, status_for_code } from './api_error.js';

/** Appended to every version-skew message: what the operator should do. */
export const VERSION_HINT = 'The BFF and Core look like different versions — restart or update Core.';

const CODE_FOR_STATUS: Record<number, string> = {
    400: 'invalid_params',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'invalid_params',
    429: 'rate_limited',
};

/** The value when it is a non-blank string, else null. */
function str(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Turn a failed Core response into an ApiError the SPA can show as-is.
 *
 * Core has two error envelopes: control-plane routes send
 * `{ ok: false, error: "message", code? }`, others `{ ok: false, error: { code, message } }`.
 * Both are read here so the real message reaches the user instead of a
 * generic "request failed".
 *
 * Version skew (the BFF is newer than the running Core) shows up two ways,
 * and both get an explicit, actionable message:
 *   - the route doesn't exist yet → Express HTML 404 (`body === null`)
 *   - a field the BFF sends isn't in Core's schema → Zod "Unrecognized key(s)"
 *
 * @param body - Parsed JSON body, or null when Core did not send JSON.
 */
export function upstream_error(
    status: number | undefined,
    body: Record<string, unknown> | null,
    method: string,
    path: string,
): ApiError {
    const http = typeof status === 'number' ? status : 0;

    // Non-JSON: Express's default "Cannot POST /v1/…" page means the route is missing.
    if (body === null) {
        if (http === 404) {
            return new ApiError('upstream_route_missing', `Core doesn't have ${method} ${path}. ${VERSION_HINT}`, 502);
        }
        const suffix = http ? ` (HTTP ${http})` : '';
        return new ApiError('parse_error', `Core returned a non-JSON response${suffix} for ${path}.`, http >= 400 ? http : 502);
    }

    const raw = body.error;
    const obj = raw && typeof raw === 'object' ? raw as { code?: unknown; message?: unknown } : null;
    let message = str(obj?.message) ?? str(raw) ?? str(body.message)
        ?? `Core returned ${http ? `HTTP ${http}` : 'an error'} for ${path} without a message.`;
    let code = str(obj?.code) ?? str(body.code) ?? CODE_FOR_STATUS[http] ?? (http >= 500 ? 'upstream_error' : 'unknown');

    // Core answers unknown routes with `route_not_found` (older Cores: `not_found` + "Unknown API route").
    if (code === 'route_not_found' || (code === 'not_found' && /^unknown api route/i.test(message))) {
        return new ApiError('upstream_route_missing', `Core doesn't have ${method} ${path}. ${VERSION_HINT}`, 502);
    }

    if (/unrecognized key/i.test(message)) {
        code = 'upstream_version_mismatch';
        message = `Core rejected ${path}: ${message}. ${VERSION_HINT}`;
        return new ApiError(code, message, 502);
    }

    // Core's `details` (e.g. who holds a conflicting name) reach the SPA unchanged.
    const raw_details = (obj as { details?: unknown } | null)?.details ?? body.details;
    const details = raw_details && typeof raw_details === 'object' && !Array.isArray(raw_details) ? raw_details as Record<string, unknown> : undefined;
    const mapped = status_for_code(code);
    return new ApiError(code, message, mapped !== 500 ? mapped : (http >= 400 ? http : 502), details);
}
