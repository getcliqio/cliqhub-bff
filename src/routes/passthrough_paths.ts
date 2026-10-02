/**
 * Core routes the BFF forwards unchanged (controllers/passthrough_controller.ts):
 * same path, same body, Core's answer as-is. Each line is also the route's
 * credential rule (routes/route_auth.ts):
 *
 *   token       — any bearer (user PAT, daemon token) or a session; Core applies its route policy
 *   site_admin  — signed-in site admin (Core checks again)
 *
 * Product routes the BFF composes or maps itself (sessions, teams catalogue,
 * orgs, users, pages, builder) are NOT here. A path is added only when Core
 * has it (tests/unit/routes/route_auth.test.ts checks Core's route table).
 */

import type { RouteAuth } from './route_auth.js';

/** Forwarded Core path → its credential rule. */
export const PASSTHROUGH_PATHS: Readonly<Record<string, Extract<RouteAuth, 'token' | 'site_admin'>>> = {
    // ── System ────────────────────────────────────────────────────────────
    '/v1/system/seed': 'token',

    // ── Daemons ───────────────────────────────────────────────────────────
    '/v1/daemons/register': 'token',
    '/v1/daemons/heartbeat': 'token',
    '/v1/daemons/deregister': 'token',
    '/v1/daemons/get': 'token',
    '/v1/daemons/get_by_id': 'token',
    '/v1/daemons/remove': 'token',
    '/v1/daemons/ack_command': 'token',

    // ── Auth (daemon / CLI token checks) ──────────────────────────────────
    '/v1/auth/acl': 'token',
    '/v1/auth/validate_token': 'token',

    // ── Realms ────────────────────────────────────────────────────────────
    '/v1/realms/create': 'token',
    '/v1/realms/get': 'token',
    '/v1/realms/get_by_id': 'token',
    '/v1/realms/update': 'token',
    '/v1/realms/delete': 'token',
    '/v1/realms/get_members': 'token',
    '/v1/realms/add_member': 'token',
    '/v1/realms/remove_member': 'token',
    '/v1/realms/add_team': 'token',
    '/v1/realms/remove_team': 'token',

    // ── Org team library ──────────────────────────────────────────────────
    '/v1/orgs/get_teams': 'token',
    '/v1/orgs/add_team': 'token',
    '/v1/orgs/remove_team': 'token',
    '/v1/realms/a2a': 'token',

    // ── Teams on daemons (install / uninstall) and version removal ────────
    '/v1/teams/install': 'token',
    '/v1/teams/delete_version': 'token',
    '/v1/teams/uninstall': 'token',

    // ── Agents ────────────────────────────────────────────────────────────
    '/v1/agents/get': 'token',
    '/v1/agents/get_details': 'token',
    '/v1/agents/register': 'token',
    '/v1/agents/deregister': 'token',
    '/v1/agents/get_settings': 'token',
    '/v1/agents/update_settings': 'token',

    // ── Workspaces ────────────────────────────────────────────────────────
    '/v1/workspaces/get': 'token',
    '/v1/workspaces/get_by_id': 'token',
    '/v1/workspaces/remove': 'token',

    // ── Runs ──────────────────────────────────────────────────────────────
    '/v1/runs/get': 'token',
    '/v1/runs/get_by_id': 'token',
    '/v1/runs/create': 'token',
    '/v1/runs/complete': 'token',
    '/v1/runs/resume': 'token',
    '/v1/runs/cancel': 'token',
    '/v1/runs/supply_inputs': 'token',
    '/v1/runs/enqueue': 'token',
    '/v1/runs/claim': 'token',
    '/v1/runs/append_logs': 'token',
    '/v1/runs/get_logs': 'token',
    '/v1/runs/report_telemetry': 'token',
    '/v1/runs/get_telemetry': 'token',
    '/v1/runs/get_status': 'token',
    '/v1/runs/update_status': 'token',
    '/v1/runs/report_activity': 'token',
    '/v1/runs/create_rdr': 'token',

    // ── Run artifacts ─────────────────────────────────────────────────────
    '/v1/artifacts/get': 'token',
    '/v1/artifacts/get_by_id': 'token',
    '/v1/artifacts/submit': 'token',
    '/v1/artifacts/delete': 'token',

    // ── Hub settings (reads; writes are site_admin below) ─────────────────
    '/v1/settings/get': 'token',
    '/v1/settings/get_by_key': 'token',

    // ── Events ────────────────────────────────────────────────────────────
    '/v1/events/submit': 'token',
    '/v1/events/get_by_id': 'token',
    '/v1/events/types/list': 'token',
    '/v1/events/custom/list': 'token',
    '/v1/events/custom/create': 'token',
    '/v1/events/custom/remove': 'token',

    // ── Reviews (HUG) ─────────────────────────────────────────────────────
    '/v1/reviews/get': 'token',
    '/v1/reviews/get_by_id': 'token',
    '/v1/reviews/create': 'token',
    '/v1/reviews/verdict': 'token',
    '/v1/reviews/ack': 'token',
    '/v1/reviews/get_messages': 'token',
    '/v1/reviews/send_message': 'token',

    // ── Notifications: channels, rules, in-app ────────────────────────────
    '/v1/notification_channels/get': 'token',
    '/v1/notification_channels/create': 'token',
    '/v1/notification_channels/update': 'token',
    '/v1/notification_channels/remove': 'token',
    '/v1/notification_channels/test': 'token',
    '/v1/orgs/get_notification_rules': 'token',
    '/v1/orgs/set_notification_rules': 'token',
    '/v1/orgs/remove_notification_rules': 'token',
    '/v1/realms/get_notification_rules': 'token',
    '/v1/realms/set_notification_rules': 'token',
    '/v1/realms/remove_notification_rules': 'token',
    '/v1/notifications/get': 'token',

    // ── Integrations ──────────────────────────────────────────────────────
    '/v1/integrations/jira/register_workspace': 'token',
    '/v1/integrations/jira/rotate_secret': 'token',
    '/v1/integrations/jira/get_workspaces': 'token',
    '/v1/integrations/jira/disconnect_workspace': 'token',

    // ── Orgs: review targets, permissions catalogue ───────────────────────
    '/v1/orgs/get_reviewable_targets': 'token',
    '/v1/permissions/list': 'token',

    // ── Mesh adapters ─────────────────────────────────────────────────────
    '/v1/mesh/adapters/list': 'token',
    '/v1/account/mesh/get': 'token',
    '/v1/account/mesh/update': 'token',
    '/v1/orgs/mesh/get': 'token',
    '/v1/orgs/mesh/update': 'token',

    // ── Hub settings writes ────────────────────────────────────────────
    '/v1/settings/set': 'site_admin',
    '/v1/settings/remove': 'site_admin',
};
