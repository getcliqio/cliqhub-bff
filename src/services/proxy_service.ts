/**
 * Pass-through to Core — the Core routes the BFF forwards as-is
 * (routes/passthrough_paths.ts), Core's SSE streams, artifact file streams and
 * the public A2A surface.
 * Core applies its own route policy to each call.
 */

import { ApiError } from '../errors/api_error.js';
import type { CoreProxyRepository } from '../repositories/core_proxy_repository.js';
import type { StreamRunsInput } from '../schemas/streams_types.js';

const MB = 1024 * 1024;

/** Forwards pass-through calls, SSE streams and A2A requests to Core unchanged. */
export class ProxyService {
    private readonly _max_artifact_bytes: number;

    constructor(private readonly _repo: CoreProxyRepository, max_artifact_mb = 50) {
        this._max_artifact_bytes = max_artifact_mb * MB;
    }

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

    /**
     * Streams a file to Core's `/v1/artifacts/upload` (the query names the target).
     *
     * @throws ApiError `payload_too_large` (413) when the declared size is over the limit.
     */
    async upload_artifact(query: string, body: AsyncIterable<Uint8Array>, headers: Record<string, string>): Promise<Response> {
        const size = Number(headers['content-length']);
        if (Number.isFinite(size) && size > this._max_artifact_bytes) {
            throw new ApiError('payload_too_large', `File is larger than ${this._max_artifact_bytes / MB} MB`, 413);
        }
        return this._repo.upload_artifact(query, body, headers);
    }

    /** Opens a file from Core's `/v1/artifacts/download` (Range passed through). */
    async download_artifact(
        request: { method: 'GET'; query: string } | { method: 'POST'; body: unknown },
        headers: Record<string, string>,
    ): Promise<Response> {
        return this._repo.download_artifact(request, headers);
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
