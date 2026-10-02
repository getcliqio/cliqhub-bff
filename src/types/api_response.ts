/**
 * BFF API response envelopes — same contract as Core (`cliqhub-core/src/types/api_response.ts`).
 *
 * Every success path is `{ ok: true, data: T }`.
 * Errors are `{ ok: false, error: { code, message, details? } }` (middleware/error_handler.ts).
 *
 * Types are PascalCase; variables stay snake_case.
 */

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

/** Yes/no mutation payload (delete, toggle, clear). */
export type BooleanData = boolean;

/** Success envelope. */
export type OkResponse<T> = {
    ok: true;
    data: T;
};

/** Error envelope. */
export type ErrResponse = {
    ok: false;
    error: {
        code: string;
        message: string;
        /** Core's `details`, passed through unchanged. */
        details?: Record<string, unknown>;
    };
};

/** Either envelope. */
export type ApiResponse<T> = OkResponse<T> | ErrResponse;

/** Paginated list payload — reuse instead of inventing `*ListData` per resource. */
export type PagedData<T> = {
    items: T[];
    total: number;
    offset: number;
    limit: number;
};

/**
 * Express `Request` with a typed body + success envelope.
 * (Express order is Params, ResBody, ReqBody — this alias puts body first.)
 */
export type ApiRequest<TBody, TData = unknown> = Request<
    ParamsDictionary,
    OkResponse<TData>,
    TBody
>;

/** Express `Response` typed to `{ ok: true, data: TData }`. */
export type ApiOkResponse<TData> = Response<OkResponse<TData>>;
