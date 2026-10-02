/**
 * A2A routes — the realm's public agent-to-agent surface.
 *
 * GET  /a2a/o/:org/r/:slug/.well-known/agent-card.json
 * POST /a2a/o/:org/r/:slug/send
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the A2A routes listed above. */
export function register_a2a_routes(r: RouteRegistrar, { a2a_controller: c }: Container): void {
    r.get('/a2a/o/:org/r/:slug/.well-known/agent-card.json', c.wrap(c.card));
    r.post('/a2a/o/:org/r/:slug/send', c.wrap(c.send));
}
