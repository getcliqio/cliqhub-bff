/**
 * `ApiError` — the request-path error type — and the code → HTTP status table.
 */

/**
 * The one error type a BFF controller, service or repository throws.
 * `middleware/error_handler.ts` turns it into `{ ok: false, error: { code, message, details? } }`
 * with `status` as the HTTP status.
 */
export class ApiError extends Error {
    code: string;
    status: number;
    /** Machine-readable context for the SPA (e.g. who holds a conflicting name); Core's `details` passed through. */
    details?: Record<string, unknown>;

    constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        if (details) this.details = details;
    }

    /** 401 — no credential, or an expired one. */
    static unauthorized(message = 'Login required'): ApiError {
        return new ApiError('unauthorized', message, 401);
    }

    /** 403 — signed in, but not allowed. */
    static forbidden(message = 'Forbidden'): ApiError {
        return new ApiError('forbidden', message, 403);
    }

    /** 404 — the record does not exist (or is not visible to the caller). */
    static not_found(message = 'Not found'): ApiError {
        return new ApiError('not_found', message, 404);
    }

    /** 422 — the request body failed validation. */
    static invalid_params(message: string): ApiError {
        return new ApiError('invalid_params', message, 422);
    }

    /** 500 — a BFF wiring fault (never the caller's fault). */
    static internal(message: string): ApiError {
        return new ApiError('internal', message, 500);
    }
}

const STATUS_MAP: Record<string, number> = {
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    invalid_params: 422,
    rate_limited: 429,
};

/** HTTP status for an error code (500 when unknown). */
export function status_for_code(code: string): number {
    return STATUS_MAP[code] ?? 500;
}
