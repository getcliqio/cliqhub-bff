/**
 * The route table: mounts every route group in order (passthrough last) and
 * returns what was mounted for app.ts's route-auth check.
 */

import type { Express } from 'express';
import type { Container } from '../container.js';
import { RouteRegistrar } from './registrar.js';
import { register_health_routes } from './health.js';
import { register_a2a_routes } from './a2a.js';
import { register_auth_routes } from './auth.js';
import { register_teams_routes } from './teams.js';
import { register_orgs_routes } from './orgs.js';
import { register_users_routes } from './users.js';
import { register_reports_routes } from './reports.js';
import { register_pages_routes } from './pages.js';
import { register_invitations_routes } from './invitations.js';
import { register_passthrough_routes } from './passthrough.js';

/** Mounts every BFF route; returns `METHOD /path` for each (start-up check). */
export function register_routes(app: Express, container: Container): string[] {
    const r = new RouteRegistrar(app);
    register_health_routes(r, container);
    register_a2a_routes(r, container);
    register_auth_routes(r, container);
    register_teams_routes(r, container);
    register_orgs_routes(r, container);
    register_invitations_routes(r, container);
    register_users_routes(r, container);
    register_reports_routes(r, container);
    register_pages_routes(r, container);
    register_passthrough_routes(r, container);
    return r.mounted;
}
