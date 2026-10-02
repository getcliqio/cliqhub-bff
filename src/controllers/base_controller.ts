/**
 * Base for every BFF controller — same shape as Core's `BaseController`.
 *
 * Controllers are classes of `async` methods `(req, res) => Promise<void>`;
 * routes mount them through `wrap()` (`r.post(path, c.wrap(c.get))`).
 * A method parses its body with `parse_body()`, calls its concern's service
 * and answers with `ok()`. It never writes an error response itself — it
 * throws an `ApiError` and `middleware/error_handler.ts` writes the envelope.
 *
 * Credentials are checked once by the route table (`routes/route_auth.ts`);
 * controllers read the result through `session()`, `bearer()` or `optional_token()`.
 */

import type { Request, Response, NextFunction } from 'express';
import type { z, ZodTypeAny } from 'zod';
import { ApiError } from '../errors/api_error.js';
import type { SessionRecord } from '../repositories/session_store.js';
import { checked_token } from '../lib/request_auth.js';

/** Shared controller plumbing: `wrap`, body parsing, credential accessors and `ok`. */
export abstract class BaseController {
    /**
     * Express adapter: async controller method → handler with `.catch(next)`.
     * Generic so typed `ApiRequest` / `ApiOkResponse` methods still wire cleanly.
     *
     * @param handler - A method of this controller (called with `this` bound).
     */
    wrap<Req extends Request, Res extends Response>(
        handler: (req: Req, res: Res) => Promise<void>,
    ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
        return (req, res, next) => handler.call(this, req as Req, res as Res).catch(next);
    }

    /**
     * Validates `req.body` against a Zod schema → 422 `invalid_params` on failure.
     * Returns the schema's *output* shape (post-default, post-transform).
     *
     * @throws ApiError `invalid_params` (422) listing every failing field.
     */
    protected parse_body<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
        return this._parse(schema, req.body);
    }

    /** Validates `req.query` (GET routes) the same way; @throws ApiError `invalid_params` (422). */
    protected parse_query<S extends ZodTypeAny>(schema: S, req: Request): z.infer<S> {
        return this._parse(schema, req.query);
    }

    /** Shared by parse_body / parse_query: safeParse, issues joined into one 422 message. */
    private _parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
        const result = schema.safeParse(value);
        if (!result.success) {
            const messages = result.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ');
            throw ApiError.invalid_params(messages);
        }
        return result.data;
    }

    /**
     * The signed-in session of a `session` / `site_admin` route. The route table
     * already answered 401/403, so this only throws on a mis-declared route.
     *
     * @throws ApiError `unauthorized` (401) when there is no session.
     */
    protected session(req: Request): SessionRecord {
        if (!req.session_data) throw new ApiError('unauthorized', 'Login required', 401);
        return req.session_data;
    }

    /**
     * The Core token of a `token` route: an explicit `Authorization: Bearer`
     * (CLI, daemon) wins over the session's target_token.
     *
     * @throws ApiError `internal` (500) when there is none (mis-declared route).
     */
    protected bearer(req: Request): string {
        return checked_token(req);
    }

    /** Core token of the caller on a `public` route, when one is signed in. */
    protected optional_token(req: Request): string | undefined {
        return req.session_data?.target_token;
    }

    /** Writes the success envelope `{ ok: true, data }`. */
    protected ok<T>(res: Response, data: T, status: number = 200): void {
        res.status(status).json({ ok: true, data });
    }
}
