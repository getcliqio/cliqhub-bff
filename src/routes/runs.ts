/**
 * Runs routes the BFF composes (the rest of /v1/runs/* is forwarded unchanged).
 *
 * POST /v1/runs/enqueue   (agent settings pre-flight, then Core)
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the runs routes listed above. */
export function register_runs_routes(r: RouteRegistrar, { run_enqueue_controller: c }: Container): void {
    r.post('/v1/runs/enqueue', c.wrap(c.enqueue));
}
