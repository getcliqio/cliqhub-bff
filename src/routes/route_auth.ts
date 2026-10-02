/**
 * THE BFF route table — every route the BFF serves, one line each, with the
 * credential it needs before a controller runs. Same idea as Core's
 * `auth/route_policy/table.ts`: a route without a line here stops the BFF
 * from starting (and fails `route_auth.test.ts`).
 *
 *   public      — no credential needed (the controller / Core may still use one)
 *   session     — a signed-in user (cookie session or hydrated user PAT) → else 401
 *   site_admin  — signed-in site admin → else 401 / 403
 *   token       — any bearer (user PAT, daemon token) or session token → else 401;
 *                 forwarded to Core, which applies its route policy
 *   { public_with, otherwise }
 *               — one route, two bodies: `public` when the body carries the
 *                 `public_with` field, else the `otherwise` rule. The controller
 *                 picks its body schema with the same test (lib/request_auth.ts
 *                 `body_has`), so a public body never reaches the signed-in path.
 *
 * Realm / org / record access is Core's job, never repeated here.
 */

import { PASSTHROUGH_PATHS } from './passthrough_paths.js';

/** A rule chosen by the request body (see the file header). */
export interface BodyRouteAuth {
    /** Body field whose presence makes the request public. */
    public_with: string;
    /** The rule for every other body. */
    otherwise: 'session' | 'site_admin';
}

/** A route's credential rule (see the file header). */
export type RouteAuth = 'public' | 'session' | 'site_admin' | 'token' | BodyRouteAuth;

const OWN_ROUTES: Record<string, RouteAuth> = {
    // ── Health / A2A ────────────────────────────────────────────────
    'GET /bff-health': 'public',
    'GET /a2a/o/:org/r/:slug/.well-known/agent-card.json': 'public',
    'POST /a2a/o/:org/r/:slug/send': 'public', // bearer forwarded; Core checks the dispatch key

    // ── Session, signup, tokens, dispatch keys ──────────────────────
    'POST /v1/session/create': 'public',
    'POST /v1/session/get': 'session',
    'POST /v1/session/update': 'session',
    'POST /v1/session/delete': 'public',
    'POST /v1/auth/signup': 'public',
    'POST /v1/auth/generate_token': 'token',
    'POST /v1/auth/get_tokens': 'token',
    'POST /v1/auth/revoke_token': 'token',
    'POST /v1/auth/rotate_token': 'token',
    'POST /v1/auth/get_dispatch_public_key': 'token',
    'POST /v1/auth/rotate_dispatch_key': 'token',

    // ── Teams ───────────────────────────────────────────────────────
    'POST /v1/teams/get': 'public', // site admins see every team (Core)
    'POST /v1/teams/get_by_id': 'public',
    'POST /v1/teams/get_versions': 'public',
    'POST /v1/teams/get_phases': 'public',
    'POST /v1/teams/build': 'public', // rate limited
    'POST /v1/teams/create': 'session',
    'POST /v1/teams/update': 'session',
    'POST /v1/teams/download': 'session',
    'POST /v1/teams/publish': 'session',
    'POST /v1/teams/unpublish': 'session',
    'POST /v1/teams/delete': 'session',
    'POST /v1/teams/rename': 'session',

    // ── Orgs ────────────────────────────────────────────────────────
    'POST /v1/orgs/get': 'session', // site admins without `mine` get every org
    'POST /v1/orgs/new': 'site_admin',
    'POST /v1/orgs/delete': 'site_admin',
    'POST /v1/orgs/get_by_id': 'session',
    'POST /v1/orgs/update': 'session',
    'POST /v1/orgs/leave': 'session',
    'POST /v1/orgs/remove_member': 'session',
    'POST /v1/orgs/list_roles': 'session',
    'POST /v1/orgs/get_role': 'session',
    'POST /v1/orgs/create_role': 'session',
    'POST /v1/orgs/update_role': 'session',
    'POST /v1/orgs/delete_role': 'session',
    'POST /v1/orgs/new_scope': 'session',
    'POST /v1/orgs/update_scope': 'session',
    'POST /v1/orgs/delete_scope': 'session',
    'POST /v1/orgs/assign_scope_member': 'session',
    'POST /v1/orgs/unassign_scope_member': 'session',
    'POST /v1/orgs/get_scopes': 'session',

    // ── Invitations ─────────────────────────────────────────────────
    'POST /v1/invitations/create': 'session',
    'POST /v1/invitations/get': 'session',
    'POST /v1/invitations/get_by_id': 'session',
    'POST /v1/invitations/revoke': 'session',
    'POST /v1/invitations/get_by_token': 'public',
    'POST /v1/invitations/accept': 'public',

    // ── Users, account, reports ─────────────────────────────────────
    'POST /v1/users/update_profile': 'session',
    'POST /v1/users/change_password': { public_with: 'reset_token', otherwise: 'session' },
    'POST /v1/users/update_role': 'session',
    'POST /v1/users/get': 'session', // hub-wide list: site admins (UsersService); org/realm lists: members
    'POST /v1/users/get_by_id': 'session',
    'POST /v1/users/update': 'session',
    'POST /v1/users/reset_password': { public_with: 'email', otherwise: 'site_admin' },
    'POST /v1/users/new': 'site_admin',
    'POST /v1/users/suspend': 'site_admin',
    'POST /v1/users/unsuspend': 'site_admin',
    'POST /v1/users/delete': 'site_admin',
    'POST /v1/users/set_role': 'site_admin',
    'POST /v1/reports/audit': 'site_admin',

    // ── Pages (BFF composition over Core reads) ─────────────────────
    'POST /v1/overview/get': 'session',
    'POST /v1/getting_started/get': 'session',
    'POST /v1/inbox/get': 'session',
    'POST /v1/notification_center/get': 'session',
    'POST /v1/notification_center/check': 'session',
    'POST /v1/notification_center/set_rules': 'session',
    'POST /v1/org_page/get': 'session',
    'POST /v1/realm_inbox/get': 'session',
    'POST /v1/realm_runs/get': 'session',
    'POST /v1/realm_teams/get': 'session',
    'POST /v1/realm_daemons/get': 'session',
    'POST /v1/realm_settings/get': 'session',
    'POST /v1/run_detail/get': 'session',
    'POST /v1/run_telemetry/get': 'session',
    'POST /v1/daemon_page/get': 'session',
    'POST /v1/workspace_page/get': 'session',
    'POST /v1/team_list/get': 'session',
    'POST /v1/team_page/get': 'session',
    'POST /v1/agent_list/get': 'session',
    'POST /v1/agent_page/get': 'session',
    'POST /v1/review_page/get': 'session',
    'POST /v1/admin_home/get': 'site_admin',
    'POST /v1/admin_list/get': 'site_admin',

    // ── Streams (SSE passthrough) ───────────────────────────────────
    'GET /v1/runs/stream': 'token',
    'GET /v1/reviews/stream_messages': 'token',
};

/** Own routes + Core pass-through (routes/passthrough_paths.ts). */
export const ROUTE_AUTH: Readonly<Record<string, RouteAuth>> = {
    ...OWN_ROUTES,
    ...Object.fromEntries(Object.entries(PASSTHROUGH_PATHS).map(([p, auth]) => [`POST ${p}`, auth])),
};

/** BFF-owned routes only (tests: never overlap the passthrough list). */
export const OWN_ROUTE_KEYS: readonly string[] = Object.keys(OWN_ROUTES);
