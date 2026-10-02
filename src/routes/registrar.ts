/**
 * Thin wrapper over `app.get` / `app.post` that records every mounted route,
 * so app.ts can refuse to start when a route has no line in routes/route_auth.ts.
 */

import type { Express, RequestHandler } from 'express';

/** Mounts routes on the app and remembers each `METHOD /path` for the start-up check. */
export class RouteRegistrar {
    readonly mounted: string[] = [];

    constructor(private readonly _app: Express) {}

    /** Mounts a GET route. */
    get(path: string, ...handlers: RequestHandler[]): void {
        this.mounted.push(`GET ${path}`);
        this._app.get(path, ...handlers);
    }

    /** Mounts a POST route. */
    post(path: string, ...handlers: RequestHandler[]): void {
        this.mounted.push(`POST ${path}`);
        this._app.post(path, ...handlers);
    }
}
