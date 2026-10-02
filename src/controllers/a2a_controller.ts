/**
 * A2A — the realm's public agent-to-agent surface, proxied to Core.
 *
 * Routes (1:1 with this controller, mounted in routes/a2a.ts):
 *   GET  /a2a/o/:org/r/:slug/.well-known/agent-card.json  — agent card (public)
 *   POST /a2a/o/:org/r/:slug/send                         — JSON-RPC send; SSE for `message/stream` (public)
 *
 * The caller's `Authorization` is forwarded untouched; Core checks the realm's A2A bearer.
 * Responses are Core's (A2A JSON-RPC), not the BFF envelope.
 */

import type { Request, Response } from 'express';
import { BaseController } from './base_controller.js';
import type { ProxyService } from '../services/proxy_service.js';
import { pipe_stream } from '../lib/pipe_stream.js';

/** A2A routes: agent card and message send, proxied to Core (streams piped through). */
export class A2aController extends BaseController {
    constructor(private readonly _proxy_service: ProxyService) {
        super();
    }

    /**
     * The realm's A2A agent card, with Core's status.
     *
     * @param req - Params: `org`, `slug`
     * @param res - Core's agent card JSON
     */
    async card(req: Request, res: Response): Promise<void> {
        const upstream = await this._proxy_service.a2a_card(String(req.params.org ?? ''), String(req.params.slug ?? ''));
        res.status(upstream.status).json(upstream.body);
    }

    /**
     * An A2A JSON-RPC `send`. Streams (SSE) when Core answers with an event stream.
     *
     * @param req - Params: `org`, `slug`; body: A2A JSON-RPC request
     * @param res - Core's JSON-RPC answer, or `text/event-stream`
     */
    async send(req: Request, res: Response): Promise<void> {
        const upstream = await this._proxy_service.a2a_send(String(req.params.org ?? ''), String(req.params.slug ?? ''), {
            authorization: req.headers.authorization,
            accept: req.headers.accept ?? 'application/json',
            body: req.body ?? {},
        });
        const content_type = upstream.headers.get('content-type') ?? 'application/json';
        res.status(upstream.status);
        res.setHeader('Content-Type', content_type);
        if (content_type.includes('text/event-stream') && upstream.body) {
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            await pipe_stream(req, res, upstream.body);
            return;
        }
        res.send(await upstream.text());
    }
}
