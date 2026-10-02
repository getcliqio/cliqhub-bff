/**
 * Streams an upstream Core response body (SSE, A2A) through to the client
 * without buffering.
 */

import type { Request, Response } from 'express';

/** Copy an upstream byte stream to the client as it arrives; stop when the client leaves. */
export async function pipe_stream(req: Request, res: Response, body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    // The client left: cancel the upstream read. A rejection here only means the
    // stream was already closed or errored — nothing is waiting on it, so ignore it.
    req.on('close', () => { void reader.cancel().catch(() => {}); });
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
}
