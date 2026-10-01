import { Core_compat_checker } from '../../src/lib/core_compat.js';
import { vi } from 'vitest';
import { create_app } from '../../src/app.js';
import { ApiClient } from '../../src/repositories/api_client.js';
import { AuthRepository } from '../../src/repositories/auth_repository.js';
import { AuthService } from '../../src/services/auth_service.js';
import { SessionService } from '../../src/services/session_service.js';
import { AuthController } from '../../src/controllers/auth_controller.js';
import { SessionController } from '../../src/controllers/session_controller.js';
import { TeamsRepository } from '../../src/repositories/teams_repository.js';
import { TeamsService } from '../../src/services/teams_service.js';
import { TeamsController } from '../../src/controllers/teams_controller.js';
import { DraftsRepository } from '../../src/repositories/drafts_repository.js';
import { DraftsService } from '../../src/services/drafts_service.js';
import { DraftsController } from '../../src/controllers/drafts_controller.js';
import { BuilderRepository } from '../../src/repositories/builder_repository.js';
import { BuilderService } from '../../src/services/builder_service.js';
import { OrgsRepository } from '../../src/repositories/orgs_repository.js';
import { OrgsService } from '../../src/services/orgs_service.js';
import { OrgsController } from '../../src/controllers/orgs_controller.js';
import { InvitationsRepository } from '../../src/repositories/invitations_repository.js';
import { InvitationsService } from '../../src/services/invitations_service.js';
import { InvitationsController } from '../../src/controllers/invitations_controller.js';
import { CoreApiClient } from '../../src/repositories/core_api_client.js';
import { DispatchKeyRepository } from '../../src/repositories/dispatch_key_repository.js';
import { DispatchKeyService } from '../../src/services/dispatch_key_service.js';
import { DispatchKeyController } from '../../src/controllers/dispatch_key_controller.js';
import { AccountRepository } from '../../src/repositories/account_repository.js';
import { AccountService } from '../../src/services/account_service.js';
import { AccountController } from '../../src/controllers/account_controller.js';
import { AdminRepository } from '../../src/repositories/admin_repository.js';
import { AdminService } from '../../src/services/admin_service.js';
import { AdminController } from '../../src/controllers/admin_controller.js';
import { DashboardController } from '../../src/controllers/dashboard_controller.js';
import { DashboardRepository } from '../../src/repositories/dashboard_repository.js';
import { OverviewService } from '../../src/services/overview_service.js';
import { InboxService } from '../../src/services/inbox_service.js';
import { RealmRunsService } from '../../src/services/realm_runs_service.js';
import { RealmTeamsService } from '../../src/services/realm_teams_service.js';
import { TeamPageService } from '../../src/services/team_page_service.js';
import { AgentPageService } from '../../src/services/agent_page_service.js';
import { AgentPageController } from '../../src/controllers/agent_page_controller.js';
import { AdminPageService } from '../../src/services/admin_page_service.js';
import { AdminPageController } from '../../src/controllers/admin_page_controller.js';
import { ReviewPageService } from '../../src/services/review_page_service.js';
import { ReviewPageController } from '../../src/controllers/review_page_controller.js';
import { OrgPageService } from '../../src/services/org_page_service.js';
import { RealmHostPageService } from '../../src/services/realm_host_page_service.js';
import { RunTelemetryService } from '../../src/services/run_telemetry_service.js';
import { RunTelemetryController } from '../../src/controllers/run_telemetry_controller.js';
import { RealmHostPageController } from '../../src/controllers/realm_host_page_controller.js';
import { OrgPageController } from '../../src/controllers/org_page_controller.js';
import { RealmDaemonsService } from '../../src/services/realm_daemons_service.js';
import { RealmSettingsService } from '../../src/services/realm_settings_service.js';
import { RealmSettingsController } from '../../src/controllers/realm_settings_controller.js';
import { RealmDaemonsController } from '../../src/controllers/realm_daemons_controller.js';
import { RealmTeamsController } from '../../src/controllers/realm_teams_controller.js';
import { TeamPageController } from '../../src/controllers/team_page_controller.js';
import { RealmRunsController } from '../../src/controllers/realm_runs_controller.js';
import { InboxController } from '../../src/controllers/inbox_controller.js';
import { OverviewController } from '../../src/controllers/overview_controller.js';
import { ControlRepository } from '../../src/repositories/control_repository.js';
import { RealmInboxService } from '../../src/services/realm_inbox_service.js';
import { RunDetailService } from '../../src/services/run_detail_service.js';
import { RealmInboxController } from '../../src/controllers/realm_inbox_controller.js';
import { GettingStartedService } from '../../src/services/getting_started_service.js';
import { GettingStartedController } from '../../src/controllers/getting_started_controller.js';
import { NotificationCenterService } from '../../src/services/notification_center_service.js';
import { NotificationCenterController } from '../../src/controllers/notification_center_controller.js';
import { create_hub_passthrough } from '../../src/middleware/hub_passthrough.js';
import type { EnvConfig } from '../../src/config/env.js';
import type { Container } from '../../src/container.js';

export function test_config(): EnvConfig {
    return {
        port: 0,
        backend_url: 'http://localhost:19999',
        core_api_url: 'http://localhost:19998',
        session_secret: 'test-secret',
        session_ttl_seconds: 3600,
        session_idle_seconds: 600,
        database_url: 'postgres://test:test@localhost:5432/test',
        cookie_name: 'test_sid',
        cors_origins: [],
        node_env: 'test',
        rate_limit_builder_anon: 100,
        rate_limit_builder_auth: 100,
        rate_limit_window_ms: 60000,
        static_dir: '',
    };
}

export function mock_session_store(_config: EnvConfig) {
    const sessions = new Map<string, any>();
    let counter = 0;

    return {
        init: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockImplementation(async (record: any) => {
            const sid = `mock-sid-${++counter}`;
            sessions.set(sid, { session_id: sid, ...record });
            return sid;
        }),
        find: vi.fn().mockImplementation(async (sid: string) => {
            return sessions.get(sid) ?? null;
        }),
        touch: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockImplementation(async (sid: string) => {
            sessions.delete(sid);
        }),
        update_act_as: vi.fn().mockImplementation(async (sid: string, fields: any) => {
            const existing = sessions.get(sid);
            if (existing) sessions.set(sid, { ...existing, ...fields });
        }),
        restore_actor: vi.fn().mockImplementation(async (sid: string, fields: any) => {
            const existing = sessions.get(sid);
            if (existing) {
                sessions.set(sid, {
                    ...existing,
                    ...fields,
                    act_as_user_id: existing.user_id,
                    target_token: existing.user_token,
                });
            }
        }),
        destroy_user: vi.fn().mockResolvedValue(undefined),
        prune_expired: vi.fn().mockResolvedValue(0),
        close: vi.fn().mockResolvedValue(undefined),
        _sessions: sessions,
    };
}

export function create_test_app() {
    const config = test_config();
    const session_store = mock_session_store(config);
    const api_client = new ApiClient(config.backend_url);

    const auth_repo = new AuthRepository(api_client);
    const auth_service = new AuthService(auth_repo);
    const session_service = new SessionService(auth_repo, session_store as any, config);
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
    const control_repo = new ControlRepository(core_api_client);
    const inbox_service = new InboxService(orgs_repo, control_repo);
    const inbox_controller = new InboxController(inbox_service);
    const realm_runs_controller = new RealmRunsController(new RealmRunsService(control_repo));
    const realm_teams_controller = new RealmTeamsController(new RealmTeamsService(control_repo, teams_repo));
    const team_page_controller = new TeamPageController(new TeamPageService(control_repo, teams_repo));
    const agent_page_controller = new AgentPageController(new AgentPageService(core_api_client, control_repo));
    const core_compat = new Core_compat_checker('http://core.test', 60_000, (async () => new Response(JSON.stringify({ ok: true, version: '1.0.0', api_version: 2, started_at: 1 }))) as typeof fetch);
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

    const container: Container = {
        config,
        session_store: session_store as any,
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
        // Real hydrate — CLI/daemon Bearer must populate session_data the same
        // way production does (teams/download, session/get, etc.).
        hydrate_bearer: (token) => session_service.hydrate_bearer(token),
        core_compat,
    };
    const app = create_app(container);
    return { app, container, session_store, api_client };
}
