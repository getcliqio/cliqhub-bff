/**
 * Artifact files — Core's artifact upload and download, streamed through byte for byte
 * (never buffered, so memory stays flat for large files).
 *
 * Routes (1:1 with this controller, mounted in routes/passthrough.ts):
 *   POST /v1/artifacts/upload?…   — the raw file as the body; the query names the target (Core)
 *   GET  /v1/artifacts/download?artifact_id=  — browser navigation (cookie session)
 *   POST /v1/artifacts/download   — `{ artifact_id }` (token callers)
 *
 * Route auth `token`; Core checks access. Core's status, file headers and body (or its JSON
 * error) are returned as-is; `Range` is passed through. An upload declared larger than
 * CLIQ_ARTIFACT_MAX_MB is refused here (413) before any byte reaches Core.
 */

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';
import { checked_token } from '../lib/request_auth.js';

/** Request headers Core needs to read a file. */
const UPLOAD_HEADERS = ['content-type', 'content-length'] as const;
/** Response headers copied back to the client. */
const FILE_HEADERS = ['content-type', 'content-length', 'content-disposition', 'content-range', 'accept-ranges'] as const;

/** Streams artifact files between the client and Core. */
export class ArtifactFilesController extends BaseController {
    constructor(private readonly _proxy_service: ProxyService) {
        super();
    }

    /**
     * Streams one file to Core.
     *
     * @param req - Raw body (the file); query as Core's `ArtifactsUploadQuery`
     * @param res - Core's answer; 413 when Content-Length is over the limit
     */
    async upload(req: Request, res: Response): Promise<void> {
        const headers = this._auth(req);
        for (const h of UPLOAD_HEADERS) {
            const v = req.headers[h];
            if (typeof v === 'string') headers[h] = v;
        }
        const upstream = await this._proxy_service.upload_artifact(query_of(req), req, headers).catch((err: unknown) => {
            // Refused unread: close the connection rather than wait for the rest of the file.
            res.setHeader('Connection', 'close');
            throw err;
        });
        await send_upstream(req, res, upstream);
    }

    /**
     * Streams one stored file from Core.
     *
     * @param req - Query (GET) or body (POST): `{ artifact_id }`; optional `Range`
     * @param res - The file (200 / 206) or Core's JSON error
     */
    async download(req: Request, res: Response): Promise<void> {
        const headers = this._auth(req);
        if (typeof req.headers.range === 'string') headers['range'] = req.headers.range;
        const request = req.method === 'GET'
            ? { method: 'GET' as const, query: query_of(req) }
            : { method: 'POST' as const, body: req.body as unknown };
        const upstream = await this._proxy_service.download_artifact(request, headers);
        await send_upstream(req, res, upstream);
    }

    private _auth(req: Request): Record<string, string> {
        return { authorization: `Bearer ${checked_token(req)}` };
    }
}

/** The request's query string as sent (`?…`, or empty). */
function query_of(req: Request): string {
    const i = req.originalUrl.indexOf('?');
    return i === -1 ? '' : req.originalUrl.slice(i);
}

/** Core's status, file headers and body, bytes untouched; stops when the client leaves. */
async function send_upstream(req: Request, res: Response, upstream: globalThis.Response): Promise<void> {
    res.status(upstream.status);
    for (const h of FILE_HEADERS) {
        const v = upstream.headers.get(h);
        if (v !== null) res.setHeader(h, v);
    }
    if (!upstream.body) {
        res.end();
        return;
    }
    const body = Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream<Uint8Array>);
    req.on('close', () => { if (!res.writableFinished) body.destroy(); });
    await pipeline(body, res).catch((err: unknown) => {
        // The client left mid-file: nothing to answer.
        if (!res.destroyed && !req.destroyed) throw err;
    });
}
