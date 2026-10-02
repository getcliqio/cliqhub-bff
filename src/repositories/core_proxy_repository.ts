/**
 * Core pass-through — calls whose answer the BFF hands back unchanged:
 * control-plane routes (flat or `{ ok, data }` bodies), SSE streams and the
 * public A2A surface.
 */

import type { CoreClient } from './core_client.js';

/** Core calls whose answer the BFF returns unchanged (passthrough, SSE, A2A). */
export class CoreProxyRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST {path}` → Core's whole JSON body (throws on `ok: false` / HTTP ≥ 400). */
    async forward(
        path: string,
        body: unknown,
        token: string,
        extra_headers: Record<string, string>,
    ): Promise<Record<string, unknown>> {
        return this._client.post_body<Record<string, unknown>>(path, body ?? {}, token, extra_headers);
    }

    /** `GET {path}?{query}` as an event stream, unread. */
    async stream(path: string, query: URLSearchParams, token: string | null): Promise<Response> {
        const qs = query.toString() ? `?${query.toString()}` : '';
        return this._client.raw('GET', `${path}${qs}`, {
            accept: 'text/event-stream',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        });
    }

    /** `GET /a2a/o/{org}/r/{slug}/.well-known/agent-card.json` — public; Core's status + body. */
    async a2a_card(org: string, slug: string): Promise<{ status: number; body: unknown }> {
        return this._client.get_json(`${a2a_base(org, slug)}/.well-known/agent-card.json`);
    }

    /** `POST /a2a/o/{org}/r/{slug}/send` — JSON or SSE, unread; the caller's Authorization forwarded. */
    async a2a_send(
        org: string,
        slug: string,
        opts: { authorization?: string; accept: string; body: unknown },
    ): Promise<Response> {
        return this._client.raw('POST', `${a2a_base(org, slug)}/send`, opts);
    }
}

function a2a_base(org: string, slug: string): string {
    return `/a2a/o/${encodeURIComponent(org)}/r/${encodeURIComponent(slug)}`;
}
