/**
 * Wiring — repositories → services → controllers, by concern, in one place.
 * `create_container` adds the async pieces (session store); `build_container`
 * is the pure wiring, also used by the tests with a mock store.
 */

import type { EnvConfig } from './config/env.js';
import type { BearerHydrator } from './middleware/session_auth.js';

// ── Repositories ────────────────────────────────────────────────────
import { CoreClient } from './repositories/core_client.js';
import { CoreReadRepository } from './repositories/core_read_repository.js';
import { CoreProxyRepository } from './repositories/core_proxy_repository.js';
import { SessionStore } from './repositories/session_store.js';
import { IdentityRepository } from './repositories/identity_repository.js';
import { TokensRepository } from './repositories/tokens_repository.js';
import { DispatchKeyRepository } from './repositories/dispatch_key_repository.js';
import { UsersRepository } from './repositories/users_repository.js';
import { OrgsRepository } from './repositories/orgs_repository.js';
import { InvitationsRepository } from './repositories/invitations_repository.js';
import { ReportsRepository } from './repositories/reports_repository.js';
import { TeamsRepository } from './repositories/teams_repository.js';
import { BuilderRepository } from './repositories/builder_repository.js';
import { ControlRepository } from './repositories/control_repository.js';
import { DashboardRepository } from './repositories/dashboard_repository.js';

// ── Services ────────────────────────────────────────────────────────
import { CoreCompatService } from './services/core_compat_service.js';
import { HealthService } from './services/health_service.js';
import { ProxyService } from './services/proxy_service.js';
import { SessionService } from './services/session_service.js';
import { TokensService } from './services/tokens_service.js';
import { DispatchKeyService } from './services/dispatch_key_service.js';
import { UsersService } from './services/users_service.js';
import { OrgsService } from './services/orgs_service.js';
import { InvitationsService } from './services/invitations_service.js';
import { ReportsService } from './services/reports_service.js';
import { TeamsService } from './services/teams_service.js';
import { BuilderService } from './services/builder_service.js';
import { OverviewService } from './services/overview_service.js';
import { GettingStartedService } from './services/getting_started_service.js';
import { InboxService } from './services/inbox_service.js';
import { NotificationCenterService } from './services/notification_center_service.js';
import { OrgPageService } from './services/org_page_service.js';
import { RealmInboxService } from './services/realm_inbox_service.js';
import { RunDetailService } from './services/run_detail_service.js';
import { RealmRunsService } from './services/realm_runs_service.js';
import { RealmTeamsService } from './services/realm_teams_service.js';
import { RealmDaemonsService } from './services/realm_daemons_service.js';
import { RealmSettingsService } from './services/realm_settings_service.js';
import { RunTelemetryService } from './services/run_telemetry_service.js';
import { RealmHostPageService } from './services/realm_host_page_service.js';
import { TeamPageService } from './services/team_page_service.js';
import { AgentPageService } from './services/agent_page_service.js';
import { ReviewPageService } from './services/review_page_service.js';
import { AdminPageService } from './services/admin_page_service.js';

// ── Controllers ─────────────────────────────────────────────────────
import { HealthController } from './controllers/health_controller.js';
import { A2aController } from './controllers/a2a_controller.js';
import { PassthroughController } from './controllers/passthrough_controller.js';
import { StreamsController } from './controllers/streams_controller.js';
import { SessionController } from './controllers/session_controller.js';
import { AuthController } from './controllers/auth_controller.js';
import { TokensController } from './controllers/tokens_controller.js';
import { DispatchKeyController } from './controllers/dispatch_key_controller.js';
import { UsersController } from './controllers/users_controller.js';
import { OrgsController } from './controllers/orgs_controller.js';
import { InvitationsController } from './controllers/invitations_controller.js';
import { ReportsController } from './controllers/reports_controller.js';
import { TeamsController } from './controllers/teams_controller.js';
import { OverviewController } from './controllers/overview_controller.js';
import { GettingStartedController } from './controllers/getting_started_controller.js';
import { InboxController } from './controllers/inbox_controller.js';
import { NotificationCenterController } from './controllers/notification_center_controller.js';
import { OrgPageController } from './controllers/org_page_controller.js';
import { RealmInboxController } from './controllers/realm_inbox_controller.js';
import { RunDetailController } from './controllers/run_detail_controller.js';
import { RealmRunsController } from './controllers/realm_runs_controller.js';
import { RealmTeamsController } from './controllers/realm_teams_controller.js';
import { RealmDaemonsController } from './controllers/realm_daemons_controller.js';
import { RealmSettingsController } from './controllers/realm_settings_controller.js';
import { RunTelemetryController } from './controllers/run_telemetry_controller.js';
import { DaemonPageController } from './controllers/daemon_page_controller.js';
import { WorkspacePageController } from './controllers/workspace_page_controller.js';
import { TeamListController } from './controllers/team_list_controller.js';
import { TeamPageController } from './controllers/team_page_controller.js';
import { AgentListController } from './controllers/agent_list_controller.js';
import { AgentPageController } from './controllers/agent_page_controller.js';
import { ReviewPageController } from './controllers/review_page_controller.js';
import { AdminHomeController } from './controllers/admin_home_controller.js';
import { AdminListController } from './controllers/admin_list_controller.js';
import { SlidingWindowLimiter } from './lib/sliding_window_limiter.js';
import { FORGOT_PASSWORD_PER_ADDRESS } from './config/limits.js';

/** Every singleton the app wires: config, store, Core client, repositories, services, controllers. */
export interface Container {
    config: EnvConfig;
    session_store: SessionStore;
    core_client: CoreClient;
    /** Is the running Core new enough for this BFF? (Core `GET /v1/health` api_version) */
    core_compat: CoreCompatService;
    session_service: SessionService;
    /** Hydrate opaque Bearer PATs (cliq_tok_…) into session_data. */
    hydrate_bearer: BearerHydrator;

    // Platform
    health_controller: HealthController;
    a2a_controller: A2aController;
    passthrough_controller: PassthroughController;
    streams_controller: StreamsController;
    // Identity
    session_controller: SessionController;
    auth_controller: AuthController;
    tokens_controller: TokensController;
    dispatch_key_controller: DispatchKeyController;
    // Directory
    users_controller: UsersController;
    orgs_controller: OrgsController;
    invitations_controller: InvitationsController;
    reports_controller: ReportsController;
    // Teams
    teams_controller: TeamsController;
    // Pages (one read per screen)
    overview_controller: OverviewController;
    getting_started_controller: GettingStartedController;
    inbox_controller: InboxController;
    notification_center_controller: NotificationCenterController;
    org_page_controller: OrgPageController;
    realm_inbox_controller: RealmInboxController;
    run_detail_controller: RunDetailController;
    realm_runs_controller: RealmRunsController;
    realm_teams_controller: RealmTeamsController;
    realm_daemons_controller: RealmDaemonsController;
    realm_settings_controller: RealmSettingsController;
    run_telemetry_controller: RunTelemetryController;
    daemon_page_controller: DaemonPageController;
    workspace_page_controller: WorkspacePageController;
    team_list_controller: TeamListController;
    team_page_controller: TeamPageController;
    agent_list_controller: AgentListController;
    agent_page_controller: AgentPageController;
    review_page_controller: ReviewPageController;
    admin_home_controller: AdminHomeController;
    admin_list_controller: AdminListController;
}

/** The running BFF: a ready session store plus the wiring. */
export async function create_container(config: EnvConfig): Promise<Container> {
    const session_store = new SessionStore(config);
    await session_store.init();
    return build_container({
        config,
        session_store,
        core_client: new CoreClient(config.core_api_url),
        core_compat: new CoreCompatService(config.core_api_url),
    });
}

/** Pure wiring over the given store, Core client and Core compatibility check. */
export function build_container(deps: {
    config: EnvConfig;
    session_store: SessionStore;
    core_client: CoreClient;
    core_compat: CoreCompatService;
}): Container {
    const { config, session_store, core_client, core_compat } = deps;

    // Repositories shared by several services
    const core_reads = new CoreReadRepository(core_client);
    const tokens_repo = new TokensRepository(core_client);
    const orgs_repo = new OrgsRepository(core_client);
    const invitations_repo = new InvitationsRepository(core_client);
    const teams_repo = new TeamsRepository(core_client);
    const control_repo = new ControlRepository(core_client);
    const dashboard_repo = new DashboardRepository(core_client);

    // Services shared by several controllers
    const proxy_service = new ProxyService(new CoreProxyRepository(core_client));
    const session_service = new SessionService(new IdentityRepository(core_client), session_store, config);
    const inbox_service = new InboxService(orgs_repo, control_repo);
    const team_page_service = new TeamPageService(control_repo, teams_repo);
    const agent_page_service = new AgentPageService(core_reads, control_repo);
    const host_page_service = new RealmHostPageService(core_reads, control_repo);
    const admin_page_service = new AdminPageService(core_reads, core_compat);

    return {
        config,
        session_store,
        core_client,
        core_compat,
        session_service,
        hydrate_bearer: (token) => session_service.hydrate_bearer(token),

        health_controller: new HealthController(new HealthService(core_compat)),
        a2a_controller: new A2aController(proxy_service),
        passthrough_controller: new PassthroughController(proxy_service),
        streams_controller: new StreamsController(proxy_service),

        session_controller: new SessionController(session_service, config),
        auth_controller: new AuthController(session_service, config),
        tokens_controller: new TokensController(new TokensService(tokens_repo)),
        dispatch_key_controller: new DispatchKeyController(new DispatchKeyService(new DispatchKeyRepository(core_client))),

        users_controller: new UsersController(
            new UsersService(new UsersRepository(core_client), session_store, session_service), config,
            new SlidingWindowLimiter(FORGOT_PASSWORD_PER_ADDRESS.limit, FORGOT_PASSWORD_PER_ADDRESS.window_ms),
        ),
        orgs_controller: new OrgsController(new OrgsService(orgs_repo, core_compat)),
        invitations_controller: new InvitationsController(new InvitationsService(invitations_repo, session_service), config),
        reports_controller: new ReportsController(new ReportsService(new ReportsRepository(core_client))),

        teams_controller: new TeamsController(new TeamsService(teams_repo, core_compat), new BuilderService(new BuilderRepository(core_client))),

        overview_controller: new OverviewController(new OverviewService(orgs_repo, dashboard_repo, inbox_service)),
        getting_started_controller: new GettingStartedController(
            new GettingStartedService(orgs_repo, dashboard_repo, control_repo, teams_repo),
        ),
        inbox_controller: new InboxController(inbox_service),
        notification_center_controller: new NotificationCenterController(
            new NotificationCenterService(orgs_repo, dashboard_repo, control_repo, teams_repo),
        ),
        org_page_controller: new OrgPageController(new OrgPageService(core_reads)),
        realm_inbox_controller: new RealmInboxController(new RealmInboxService(control_repo)),
        run_detail_controller: new RunDetailController(new RunDetailService(control_repo, orgs_repo)),
        realm_runs_controller: new RealmRunsController(new RealmRunsService(control_repo)),
        realm_teams_controller: new RealmTeamsController(new RealmTeamsService(control_repo, teams_repo)),
        realm_daemons_controller: new RealmDaemonsController(new RealmDaemonsService(control_repo, teams_repo)),
        realm_settings_controller: new RealmSettingsController(
            new RealmSettingsService(control_repo, tokens_repo, invitations_repo),
        ),
        run_telemetry_controller: new RunTelemetryController(new RunTelemetryService(core_reads, control_repo)),
        daemon_page_controller: new DaemonPageController(host_page_service),
        workspace_page_controller: new WorkspacePageController(host_page_service),
        team_list_controller: new TeamListController(team_page_service),
        team_page_controller: new TeamPageController(team_page_service),
        agent_list_controller: new AgentListController(agent_page_service),
        agent_page_controller: new AgentPageController(agent_page_service),
        review_page_controller: new ReviewPageController(new ReviewPageService(core_reads, orgs_repo)),
        admin_home_controller: new AdminHomeController(admin_page_service),
        admin_list_controller: new AdminListController(admin_page_service),
    };
}
