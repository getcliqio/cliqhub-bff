# cliqhub-bff — source layout and conventions

The BFF is the single gateway for the SPA, the CLI and cliqd. It mirrors
cliqhub-core's construct: **routes → controllers → services → repositories**,
with Zod request schemas and typed response data per concern.

```
src/
  app.ts                  express app: middleware → route auth → routes → start-up check → errors → SPA
  container.ts            builds repositories → services → controllers (one place)
  routes/
    route_auth.ts         THE route table: every route's credential rule (public | session | site_admin | token | per body)
    passthrough_paths.ts  Core routes forwarded unchanged (+ their rule)
    registrar.ts          mounts routes and remembers them for the start-up check
    <concern>.ts          one file per concern: r.post(path, c.wrap(c.method)) — paths only
  controllers/<concern>_controller.ts   HTTP only: parse → service → this.ok()
  services/<concern>_service.ts         rules + composition over Core; returns *Data
  repositories/<concern>_repository.ts  one method per Core call; returns *VO (Core's data)
  repositories/core_client.ts           the one HTTP client for Core
  schemas/<concern>_types.ts            Zod *Input (request SoT) + *Data (response types)
  types/core/<concern>.ts               *VO — response shapes as Core sends them
  types/api_response.ts                 OkResponse, ApiRequest, ApiOkResponse, PagedData
  mappers/<concern>_mapper.ts           to_*_data(vo): Core VO → BFF data (explicit even when 1:1)
  errors/                               ApiError (+ factories), upstream_error
  middleware/                           session auth, route auth, csrf, logging, rate limit, errors
  lib/                                  small shared helpers (log, request context, session cookie, streams)
```

## Routes

- One file per concern; a header comment lists its paths. A route file only
  maps paths to controller methods: `r.post('/v1/users/get', c.wrap(c.get))`.
- Every mounted route must have a line in `routes/route_auth.ts`; the BFF
  refuses to start otherwise. Controllers never repeat the credential check.
- A route that serves a signed-out body and a signed-in body declares a
  per-body rule `{ public_with: '<field>', otherwise: 'session' | 'site_admin' }`
  (e.g. `users/reset_password` with `email`, `users/change_password` with
  `reset_token`). The controller picks its Zod schema with the same test
  (`body_has(req, '<field>')` in `lib/request_auth.ts`), and each body schema
  is `.strict()`, so a public body can never carry the signed-in fields.
- No new endpoints: a route is either BFF-owned (composes or maps Core) or a
  Core path forwarded unchanged (`passthrough_paths.ts`, checked against
  Core's route table by `tests/unit/routes/route_auth.test.ts`). Combining
  several Core calls happens in a BFF service, never in the browser.

## Controllers

- A class per concern (route resource), extending `BaseController`.
- File header: what the concern is, its routes 1:1, envelope, inbound SoT.
- Each handler is an `async` method with JSDoc:

```ts
/**
 * One user's detail with the orgs they belong to.
 *
 * @param req - Body: {@link UserIdInput}
 * @param res - `{ ok: true, data: UserDetailData }`
 */
async get_by_id(req: ApiRequest<UserIdInput, UserDetailData>, res: ApiOkResponse<UserDetailData>): Promise<void> {
    const body = this.parse_body(UserIdInput, req);
    this.ok(res, await this._users_service.get_by_id(body, this.session(req).target_token));
}
```

- No `res.status(...).json(...)` and no literal payloads: errors are thrown
  (`ApiError.forbidden(...)`), data comes typed from the service.
- Credentials: `this.session(req)` (session / site_admin routes),
  `this.bearer(req)` (token routes: explicit Bearer wins over the session),
  `this.optional_token(req)` (public routes).
- Dependencies are services only (`private readonly _x_service`).

## Services

- `async method(input: XInput, token: string, …): Promise<XData>`.
- Business rules and composition (several Core calls → one answer) live here.
- Map Core VOs with `mappers/`; never hand Core shapes to controllers.

## Repositories

- One method per Core call, typed `(input, token) → Promise<XVO>`, with a
  one-line doc naming the Core path. No mapping, no rules.
- Page services read Core through `CoreReadRepository` (`CORE_READS`).

## Schemas and types (naming = Core's)

- Request: PascalCase Zod value + same-name type, every field `.describe(...)`:

```ts
export const UsersGetInput = z.object({
    org_id: z.string().uuid().optional().describe('List members of this org'),
});
export type UsersGetInput = z.infer<typeof UsersGetInput>;
```

- Shared shapes are named for what they are: `UserIdInput`, `OrgRoleIdInput`, `TeamRefInput`.
- Response: `XData` (TS interfaces, documented where not obvious). Lists use
  `PagedData<T>` when the wire shape is `{ items, total, offset, limit }`.
- Core shapes: `XVO` in `types/core/<concern>.ts`, mirroring Core's `*Data`.

## Comments

- Every file starts with a `/** … */` header: what the module is for and, for
  controllers / services / repositories, which routes or Core calls it covers.
- Every exported class, function, interface and type has a JSDoc line; every
  public method has a JSDoc saying what it does (and `@throws` when it throws
  on purpose). One line is fine when the name already says most of it.
- Inline comments explain *why* (a Core quirk, an ordering constraint, a
  version gate), never restate the code.

## Errors

- Request paths throw `ApiError` (`ApiError.forbidden(…)`, `ApiError.not_found(…)`,
  `new ApiError(code, message, status)`); `middleware/error_handler.ts` writes the
  envelope and `middleware/error_logging.ts` logs it (same rules as Core).
  A plain `Error` is only for start-up faults (config, route table).
- Core failures arrive as `ApiError` from `CoreClient` (`errors/upstream_error.ts`);
  let them propagate — don't re-wrap or rename them.
- No silent catches. An optional part of a composed page uses
  `best_effort(log, 'event_failed', call, fallback)` (lib/best_effort.ts), which
  logs at `warn` and returns the fallback (for an `allSettled` fan-out,
  `warn_rejected(log, event, results, ctx)` logs each failed part); the page marks itself `partial` / leaves
  the section `null` where the UI needs to know. Any other `catch` logs
  (`error_fields(err)`) and either rethrows or says in a comment why it continues.

## Logging

- One logger per module: `const log = get_logger('svc.users')` (prefixes: `svc.`,
  `repo.`, `map.`, `mw.`, `lib.`). Every line inside a request carries its `request_id`,
  the same id Core logs.
- Services log `info` for each state change the BFF makes or brokers — session
  created / ended, act-as started / stopped, token minted / rotated / revoked,
  invite created / accepted, user / org admin actions, team publish / delete,
  notification rules set — with ids only (never tokens, passwords or secrets).
- `warn` for degraded results (best-effort failures, Core incompatibility);
  `error` only through the error handler. Controllers don't log: the request
  log and the error handler already cover them.
