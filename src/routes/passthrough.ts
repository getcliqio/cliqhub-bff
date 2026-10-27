/**
 * Pass-through routes — Core routes forwarded unchanged, Core's SSE streams and
 * artifact file streams.
 *
 * POST <every path in routes/passthrough_paths.ts>
 * GET  /v1/runs/stream
 * POST /v1/artifacts/upload            (streamed file in)
 * GET|POST /v1/artifacts/download      (streamed file out)
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';
import { PASSTHROUGH_PATHS } from './passthrough_paths.js';

/** Mounts the pass-through, SSE stream and artifact file routes listed above. */
export function register_passthrough_routes(r: RouteRegistrar, container: Container): void {
    const { passthrough_controller: pass, streams_controller: streams, artifact_files_controller: files } = container;
    for (const path of Object.keys(PASSTHROUGH_PATHS)) r.post(path, pass.wrap(pass.forward));
    r.get('/v1/runs/stream', streams.wrap(streams.runs));
    r.post('/v1/artifacts/upload', files.wrap(files.upload));
    r.get('/v1/artifacts/download', files.wrap(files.download));
    r.post('/v1/artifacts/download', files.wrap(files.download));
}
