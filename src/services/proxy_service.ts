/**
 * Pass-through to Core — the Core routes the BFF forwards as-is
 * (routes/passthrough_paths.ts), Core's SSE streams and the public A2A surface.
 * Core applies its own route policy to each call.
 */

import { ApiError } from '../errors/api_error.js';
import type { CoreProxyRepository } from '../repositories/core_proxy_repository.js';
import type { StreamRunsInput, StreamReviewMessagesInput } from '../schemas/streams_types.js';

/** Forwards pass-through calls, SSE streams and A2A requests to Core unchanged. */
export class ProxyService {
    constructor(private readonly _repo: CoreProxyRepository) {}

    /**
     * Forwards one control-plane call; `x-org-id` travels with it when the
     * client sent one.
     */
    async forward(path: string, body: unknown, token: string, org_id?: string): Promise<Record<string, unknown>> {
        return this._repo.forward(path, body, token, org_id ? { 'x-org-id': org_id } : {});
    }

    /** A run's live event stream. @throws ApiError when Core refuses the stream. */
    async stream_run(input: StreamRunsInput, token: string | null): Promise<ReadableStream<Uint8Array>> {
        return this._open_stream('/v1/runs/stream', input, token);
    }

    /** A review's live message stream. @throws ApiError when Core refuses the stream. */
    async stream_review_messages(input: StreamReviewMessagesInput, token: string | null): Promise<ReadableStream<Uint8Array>> {
        return this._open_stream('/v1/reviews/stream_messages', input, token);
    }

    /** The realm's public A2A agent card: Core's status and JSON. */
    async a2a_card(org: string, slug: string): Promise<{ status: number; body: unknown }> {
        return this._repo.a2a_card(org, slug);
    }

    /** An A2A `send` (JSON, or SSE for `message/stream`) — Core's response unread. */
    async a2a_send(org: string, slug: string, opts: { authorization?: string; accept: string; body: unknown }): Promise<Response> {
        return this._repo.a2a_send(org, slug, opts);
    }

    /**
     * Opens a Core SSE stream (empty query values dropped).
     *
     * @throws ApiError `upstream_error` with Core's status (502 when it isn't an error status).
     */
    private async _open_stream(
        path: string,
        query: Record<string, string | undefined>,
        token: string | null,
    ): Promise<ReadableStream<Uint8Array>> {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
        const upstream = await this._repo.stream(path, params, token);
        if (!upstream.ok || !upstream.body) {
            throw new ApiError('upstream_error', `Core refused the stream ${path}`, upstream.status >= 400 ? upstream.status : 502);
        }
        return upstream.body;
    }
}
