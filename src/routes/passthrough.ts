/**
 * Pass-through routes — Core routes forwarded unchanged, and Core's SSE streams.
 *
 * POST <every path in routes/passthrough_paths.ts>
 * GET  /v1/runs/stream
 * GET  /v1/reviews/stream_messages
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';
import { PASSTHROUGH_PATHS } from './passthrough_paths.js';

/** Mounts the pass-through and SSE stream routes listed above. */
export function register_passthrough_routes(r: RouteRegistrar, container: Container): void {
    const { passthrough_controller: pass, streams_controller: streams } = container;
    for (const path of Object.keys(PASSTHROUGH_PATHS)) r.post(path, pass.wrap(pass.forward));
    r.get('/v1/runs/stream', streams.wrap(streams.runs));
    r.get('/v1/reviews/stream_messages', streams.wrap(streams.review_messages));
}
