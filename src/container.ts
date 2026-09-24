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
    hub_passthrough: import('express').RequestHandler;
    core_api_client: CoreApiClient;
    /** Hydrate opaque Bearer PATs (cliq_tok_…) into session_data. */
    hydrate_bearer: BearerHydrator;
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
        hub_passthrough,
        core_api_client,
        hydrate_bearer,
    };
}
