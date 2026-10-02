/**
 * Health route.
 *
 * GET /bff-health
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the health routes listed above. */
export function register_health_routes(r: RouteRegistrar, { health_controller: c }: Container): void {
    r.get('/bff-health', c.wrap(c.get));
}
