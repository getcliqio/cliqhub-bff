import { SessionStore } from './repositories/session_store.js';
import { ApiClient } from './repositories/api_client.js';
import { AuthRepository } from './repositories/auth_repository.js';
import { AuthService } from './services/auth_service.js';
import { SessionService } from './services/session_service.js';
import { AuthController } from './controllers/auth_controller.js';
import { SessionController } from './controllers/session_controller.js';
import { TeamsRepository } from './repositories/teams_repository.js';
import { TeamsService } from './services/teams_service.js';
import { TeamsController } from './controllers/teams_controller.js';
import { DraftsRepository } from './repositories/drafts_repository.js';
import { DraftsService } from './services/drafts_service.js';
import { DraftsController } from './controllers/drafts_controller.js';
import { BuilderRepository } from './repositories/builder_repository.js';
import { BuilderService } from './services/builder_service.js';
import { OrgsRepository } from './repositories/orgs_repository.js';
import { OrgsService } from './services/orgs_service.js';
import { OrgsController } from './controllers/orgs_controller.js';
import { InvitationsRepository } from './repositories/invitations_repository.js';
import { InvitationsService } from './services/invitations_service.js';
import { InvitationsController } from './controllers/invitations_controller.js';
import { CoreApiClient } from './repositories/core_api_client.js';
import { Core_compat_checker } from './lib/core_compat.js';
import { DispatchKeyRepository } from './repositories/dispatch_key_repository.js';
import { DispatchKeyService } from './services/dispatch_key_service.js';
import { DispatchKeyController } from './controllers/dispatch_key_controller.js';
import { AccountRepository } from './repositories/account_repository.js';
import { AccountService } from './services/account_service.js';
import { AccountController } from './controllers/account_controller.js';
import { AdminRepository } from './repositories/admin_repository.js';
import { AdminService } from './services/admin_service.js';
import { AdminController } from './controllers/admin_controller.js';
import { DashboardController } from './controllers/dashboard_controller.js';
import { DashboardRepository } from './repositories/dashboard_repository.js';
import { OverviewService } from './services/overview_service.js';
import { InboxService } from './services/inbox_service.js';
import { RealmRunsService } from './services/realm_runs_service.js';
import { RealmTeamsService } from './services/realm_teams_service.js';
import { TeamPageService } from './services/team_page_service.js';
import { AgentPageService } from './services/agent_page_service.js';
import { AgentPageController } from './controllers/agent_page_controller.js';
import { AdminPageService } from './services/admin_page_service.js';
import { AdminPageController } from './controllers/admin_page_controller.js';
import { ReviewPageService } from './services/review_page_service.js';
import { ReviewPageController } from './controllers/review_page_controller.js';
import { OrgPageService } from './services/org_page_service.js';
import { RealmHostPageService } from './services/realm_host_page_service.js';
import { RunTelemetryService } from './services/run_telemetry_service.js';
import { RunTelemetryController } from './controllers/run_telemetry_controller.js';
import { RealmHostPageController } from './controllers/realm_host_page_controller.js';
import { OrgPageController } from './controllers/org_page_controller.js';
import { RealmDaemonsService } from './services/realm_daemons_service.js';
import { RealmSettingsService } from './services/realm_settings_service.js';
import { RealmSettingsController } from './controllers/realm_settings_controller.js';
import { RealmDaemonsController } from './controllers/realm_daemons_controller.js';
import { RealmTeamsController } from './controllers/realm_teams_controller.js';
import { TeamPageController } from './controllers/team_page_controller.js';
import { RealmRunsController } from './controllers/realm_runs_controller.js';
import { InboxController } from './controllers/inbox_controller.js';
import { OverviewController } from './controllers/overview_controller.js';
import { ControlRepository } from './repositories/control_repository.js';
import { RealmInboxService } from './services/realm_inbox_service.js';
import { RunDetailService } from './services/run_detail_service.js';
import { RealmInboxController } from './controllers/realm_inbox_controller.js';
import { GettingStartedService } from './services/getting_started_service.js';
import { GettingStartedController } from './controllers/getting_started_controller.js';
import { NotificationCenterService } from './services/notification_center_service.js';
import { NotificationCenterController } from './controllers/notification_center_controller.js';
import { create_hub_passthrough } from './middleware/hub_passthrough.js';
import type { BearerHydrator } from './middleware/session_auth.js';
import type { EnvConfig } from './config/env.js';

export interface Container {
    config: EnvConfig;
    session_store: SessionStore;
    api_client: ApiClient;
    auth_controller: AuthController;
    session_controller: SessionController;
    session_service: SessionService;
    teams_controller: TeamsController;
    drafts_controller: DraftsController;
    orgs_controller: OrgsController;
    invitations_controller: InvitationsController;
    dispatch_key_controller: DispatchKeyController;
    account_controller: AccountController;
    admin_controller: AdminController;
    dashboard_controller: DashboardController;
    overview_controller: OverviewController;
    realm_inbox_controller: RealmInboxController;
    getting_started_controller: GettingStartedController;
    notification_center_controller: NotificationCenterController;
    inbox_controller: InboxController;
    realm_runs_controller: RealmRunsController;
    realm_teams_controller: RealmTeamsController;
    team_page_controller: TeamPageController;
    agent_page_controller: AgentPageController;
    admin_page_controller: AdminPageController;
    review_page_controller: ReviewPageController;
    org_page_controller: OrgPageController;
    realm_host_page_controller: RealmHostPageController;
    run_telemetry_controller: RunTelemetryController;
    realm_daemons_controller: RealmDaemonsController;
    realm_settings_controller: RealmSettingsController;
    hub_passthrough: import('express').RequestHandler;
    core_api_client: CoreApiClient;
    /** Hydrate opaque Bearer PATs (cliq_tok_…) into session_data. */
    hydrate_bearer: BearerHydrator;
    /** Is the running Core new enough for this BFF? (GET /v1/health api_version) */
    core_compat: Core_compat_checker;
}

export async function create_container(config: EnvConfig): Promise<Container> {
    const session_store = new SessionStore(config);
    await session_store.init();
    const api_client = new ApiClient(config.backend_url);

    const auth_repo = new AuthRepository(api_client);
    const auth_service = new AuthService(auth_repo);
    const session_service = new SessionService(auth_repo, session_store, config);
    const auth_controller = new AuthController(auth_service, session_service, config);
    const session_controller = new SessionController(session_service, config);

    const teams_repo = new TeamsRepository(api_client);
    const teams_service = new TeamsService(teams_repo);

    const builder_repo = new BuilderRepository(api_client);
    const builder_service = new BuilderService(builder_repo);
    const teams_controller = new TeamsController(teams_service, builder_service);

    const drafts_repo = new DraftsRepository(api_client);
    const drafts_service = new DraftsService(drafts_repo);
    const drafts_controller = new DraftsController(drafts_service);

    const orgs_repo = new OrgsRepository(api_client);
    const orgs_service = new OrgsService(orgs_repo);
    const orgs_controller = new OrgsController(orgs_service);

    const invitations_repo = new InvitationsRepository(api_client);
    const invitations_service = new InvitationsService(invitations_repo);
    const invitations_controller = new InvitationsController(
        invitations_service, session_service, config,
    );

    const core_api_client = new CoreApiClient(config.core_api_url);
    const dispatch_key_repo = new DispatchKeyRepository(core_api_client);
    const dispatch_key_service = new DispatchKeyService(dispatch_key_repo);
    const dispatch_key_controller = new DispatchKeyController(dispatch_key_service);

    const account_repo = new AccountRepository(api_client);
    const account_service = new AccountService(account_repo);
    const account_controller = new AccountController(account_service);

    const admin_repo = new AdminRepository(api_client);
    const admin_service = new AdminService(admin_repo);
    const admin_controller = new AdminController(admin_service);

    const hub_passthrough = create_hub_passthrough(core_api_client);
    const dashboard_controller = new DashboardController(core_api_client);
    // Cross-org overview: org list (api_client) × per-org dashboard rollups (core_api_client).
    const control_repo = new ControlRepository(core_api_client);
    const inbox_service = new InboxService(orgs_repo, control_repo);
    const inbox_controller = new InboxController(inbox_service);
    const realm_runs_controller = new RealmRunsController(new RealmRunsService(control_repo));
    const realm_teams_controller = new RealmTeamsController(new RealmTeamsService(control_repo, teams_repo));
    const team_page_controller = new TeamPageController(new TeamPageService(control_repo, teams_repo));
    const agent_page_controller = new AgentPageController(new AgentPageService(core_api_client, control_repo));
    const core_compat = new Core_compat_checker(config.core_api_url);
    const admin_page_controller = new AdminPageController(new AdminPageService(core_api_client, core_compat));
    const review_page_controller = new ReviewPageController(new ReviewPageService(core_api_client, orgs_repo));
    const org_page_controller = new OrgPageController(new OrgPageService(core_api_client));
    const realm_host_page_controller = new RealmHostPageController(new RealmHostPageService(core_api_client, control_repo));
    const run_telemetry_controller = new RunTelemetryController(new RunTelemetryService(core_api_client, control_repo));
    const realm_daemons_controller = new RealmDaemonsController(new RealmDaemonsService(control_repo, teams_repo));
    const realm_settings_controller = new RealmSettingsController(new RealmSettingsService(control_repo, auth_repo, invitations_repo));
    const overview_controller = new OverviewController(
        new OverviewService(orgs_repo, new DashboardRepository(core_api_client), inbox_service),
    );
    // Realm inbox + run detail: several Core control-plane reads composed per request.
    const realm_inbox_controller = new RealmInboxController(
        new RealmInboxService(control_repo),
        new RunDetailService(control_repo),
    );
    const getting_started_controller = new GettingStartedController(
        new GettingStartedService(orgs_repo, new DashboardRepository(core_api_client), control_repo, teams_repo),
    );
    const notification_center_controller = new NotificationCenterController(
        new NotificationCenterService(orgs_repo, new DashboardRepository(core_api_client), control_repo, teams_repo),
    );

    const hydrate_bearer: BearerHydrator = async (token) => {
        return session_service.hydrate_bearer(token);
    };

    return {
        config,
        session_store,
        api_client,
        auth_controller,
        session_controller,
        session_service,
        teams_controller,
        drafts_controller,
        orgs_controller,
        invitations_controller,
        dispatch_key_controller,
        account_controller,
        admin_controller,
        dashboard_controller,
        overview_controller,
        realm_inbox_controller,
        getting_started_controller,
        notification_center_controller,
        inbox_controller,
        realm_runs_controller,
        realm_teams_controller,
        team_page_controller,
        agent_page_controller,
        admin_page_controller,
        review_page_controller,
        org_page_controller,
        realm_host_page_controller,
        run_telemetry_controller,
        realm_daemons_controller,
        realm_settings_controller,
        hub_passthrough,
        core_api_client,
        hydrate_bearer,
        core_compat,
    };
}
