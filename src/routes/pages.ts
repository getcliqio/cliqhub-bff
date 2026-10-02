/**
 * Page routes — one read per screen, composed in the BFF over Core reads
 * (writes stay on the Core routes). One controller per page.
 *
 * POST /v1/overview/get
 * POST /v1/getting_started/get
 * POST /v1/inbox/get
 * POST /v1/notification_center/get
 * POST /v1/notification_center/check
 * POST /v1/notification_center/set_rules
 * POST /v1/org_page/get
 * POST /v1/realm_inbox/get
 * POST /v1/run_detail/get
 * POST /v1/realm_runs/get
 * POST /v1/realm_teams/get
 * POST /v1/realm_daemons/get
 * POST /v1/realm_settings/get
 * POST /v1/run_telemetry/get
 * POST /v1/daemon_page/get
 * POST /v1/workspace_page/get
 * POST /v1/team_list/get
 * POST /v1/team_page/get
 * POST /v1/agent_list/get
 * POST /v1/agent_page/get
 * POST /v1/review_page/get
 * POST /v1/admin_home/get
 * POST /v1/admin_list/get
 */
import type { RouteRegistrar } from './registrar.js';
import type { Container } from '../container.js';

/** Mounts the page routes listed above. */
export function register_pages_routes(r: RouteRegistrar, c: Container): void {
    r.post('/v1/overview/get', c.overview_controller.wrap(c.overview_controller.get));
    r.post('/v1/getting_started/get', c.getting_started_controller.wrap(c.getting_started_controller.get));
    r.post('/v1/inbox/get', c.inbox_controller.wrap(c.inbox_controller.get));

    const notif = c.notification_center_controller;
    r.post('/v1/notification_center/get', notif.wrap(notif.get));
    r.post('/v1/notification_center/check', notif.wrap(notif.check));
    r.post('/v1/notification_center/set_rules', notif.wrap(notif.set_rules));

    r.post('/v1/org_page/get', c.org_page_controller.wrap(c.org_page_controller.get));
    r.post('/v1/realm_inbox/get', c.realm_inbox_controller.wrap(c.realm_inbox_controller.get));
    r.post('/v1/run_detail/get', c.run_detail_controller.wrap(c.run_detail_controller.get));
    r.post('/v1/realm_runs/get', c.realm_runs_controller.wrap(c.realm_runs_controller.get));
    r.post('/v1/realm_teams/get', c.realm_teams_controller.wrap(c.realm_teams_controller.get));
    r.post('/v1/realm_daemons/get', c.realm_daemons_controller.wrap(c.realm_daemons_controller.get));
    r.post('/v1/realm_settings/get', c.realm_settings_controller.wrap(c.realm_settings_controller.get));
    r.post('/v1/run_telemetry/get', c.run_telemetry_controller.wrap(c.run_telemetry_controller.get));
    r.post('/v1/daemon_page/get', c.daemon_page_controller.wrap(c.daemon_page_controller.get));
    r.post('/v1/workspace_page/get', c.workspace_page_controller.wrap(c.workspace_page_controller.get));
    r.post('/v1/team_list/get', c.team_list_controller.wrap(c.team_list_controller.get));
    r.post('/v1/team_page/get', c.team_page_controller.wrap(c.team_page_controller.get));
    r.post('/v1/agent_list/get', c.agent_list_controller.wrap(c.agent_list_controller.get));
    r.post('/v1/agent_page/get', c.agent_page_controller.wrap(c.agent_page_controller.get));
    r.post('/v1/review_page/get', c.review_page_controller.wrap(c.review_page_controller.get));
    r.post('/v1/admin_home/get', c.admin_home_controller.wrap(c.admin_home_controller.get));
    r.post('/v1/admin_list/get', c.admin_list_controller.wrap(c.admin_list_controller.get));
}
