/**
 * Reports routes — site-admin reports.
 *
 * POST /v1/reports/audit
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the reports routes listed above. */
export function register_reports_routes(r: RouteRegistrar, { reports_controller: c }: Container): void {
    r.post('/v1/reports/audit', c.wrap(c.audit));
}
