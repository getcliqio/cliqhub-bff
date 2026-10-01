/**
 * Data Transfer Objects — the contract between BFF and browser frontend.
 * Browser login/signup DTOs omit JWT (cookie session). CLI/machine clients
 * receive `token` when they send `X-Client: cli` (see AuthController).
 */

export interface UserDTO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: 'user' | 'admin';
    suspended_at: string | null;
    created_at: string;
    preferences: Record<string, unknown>;
}

export interface ScopeDTO {
    id: string;
    slug: string;
    display_name: string;
    owner_id: string;
    org_id: string | null;
    visibility: 'public' | 'private';
    scope_type: 'user' | 'org';
}

export interface LoginResponseDTO {
    user: UserDTO;
    scopes: ScopeDTO[];
    org_slugs: string[];
    /** Present for CLI/machine clients (`X-Client: cli`); omitted for SPA cookie sessions. */
    token?: string;
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    /** Qualified slug in org.realm format (e.g., "elan.default"). */
    default_realm_qualified?: string | null;
    /** One-time enroll token — signup / first personal realm only. */
    enroll_token?: string | null;
    /** All orgs the user belongs to, with their default realm info. */
    orgs?: { id: string; slug: string; name: string; default_realm_slug: string }[];
}

/** Present on session/get when act_as_user_id !== user_id. */
export interface ActingAsDTO {
    actor_id: string;
    actor_username: string;
}

export interface MeResponseDTO {
    user: UserDTO;
    scopes: ScopeDTO[];
    org_slugs: string[];
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    acting_as?: ActingAsDTO | null;
    orgs?: { id: string; slug: string; name: string; default_realm_slug: string }[];
}

export interface TokenPermissionsDTO {
    domains?: {
        orgs?: Array<string | '*'> | '*';
        scopes?: Array<string | '*'> | '*';
        realms?: Array<string | '*'> | '*';
    };
    access?: Partial<Record<string, Array<'read' | 'write' | 'admin'>>>;
}

export interface TokenDTO {
    id: number;
    name: string;
    permissions: TokenPermissionsDTO;
    created_at: string;
    last_used_at: string | null;
}

export interface CreateTokenResponseDTO {
    token: string;
    name: string;
    id?: number;
    realm_ids: string[];
    /** Present when type=a2a (alias of token). */
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
    /** Present when type=daemon_wire. */
    expires_in?: number;
}

export interface RotateTokenResponseDTO {
    token: string;
    type?: string;
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
}

export interface TeamListItemDTO {
    name: string;
    scope: string | null;
    description: string;
    author: string | null;
    latest_version: string;
    install_count: number;
    tags: string[];
}

export interface TeamDetailDTO extends TeamListItemDTO {
    license: string;
    visibility: 'public' | 'private' | 'draft';
    created_at: string;
    updated_at: string;
    versions: TeamVersionDTO[];
    roles: { name: string; content_md: string }[];
    workflow: Record<string, unknown>;
    agents: Record<string, unknown>;
    readme: string;
    cliq_version: string | null;
    tools: string[];
    inputs?: { name: string; description?: string }[];
    use_when?: string[];
    not_for?: string[];
    /** Raw manifest YAML from the teams table — always current. */
    raw_manifest?: string | null;
}

export interface TeamVersionDTO {
    version: string;
    changelog: string;
    published_at: string;
}

export interface TeamListResponseDTO {
    teams: TeamListItemDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface TeamSearchResponseDTO {
    teams: TeamListItemDTO[];
    total: number;
}

export interface TeamDownloadResponseDTO {
    filename: string;
    data_base64: string;
}

export interface PublishResultDTO {
    name: string;
    scope: string | null;
    version: string;
    status?: 'draft' | 'published';
    listed?: boolean;
}

export interface DeleteTeamResultDTO {
    deleted: boolean;
}

export interface RenameTeamResultDTO {
    name: string;
    scope: string;
}

export interface ToggleListedResultDTO {
    listed: boolean;
}

export interface MyTeamsListResponseDTO {
    teams: TeamListItemDTO[];
}

export interface ScopeGroupDTO {
    slug: string;
    display_name: string;
    scope_type: 'user' | 'org';
    visibility: 'public' | 'private';
    teams: TeamListItemDTO[];
}

export interface MyTeamsAllResponseDTO {
    scopes: ScopeGroupDTO[];
}

export interface LatestVersionResponseDTO {
    name: string;
    scope: string | null;
    version: string | null;
}

export interface BatchLatestItemDTO {
    name: string;
    scope: string | null;
    latest: string | null;
}

export interface BatchLatestResponseDTO {
    teams: BatchLatestItemDTO[];
}

export interface DraftListItemDTO {
    id: number;
    title: string;
    updated_at: string;
}

export interface DraftDetailDTO {
    id: number;
    title: string;
    team_json: string;
    created_at: string;
    updated_at: string;
}

export interface DraftListResponseDTO {
    drafts: DraftListItemDTO[];
}

export interface DraftSaveResponseDTO {
    id: number;
}

export interface DraftDeleteResponseDTO {
    deleted: boolean;
}

export interface BuilderGenerateResponseDTO {
    job_id: string;
    status: string;
    stage: string;
}

export interface BuilderGenerateStatusDTO {
    job_id: string;
    status: string;
    stage: string;
    team?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    error?: { code: string; message: string };
}

export interface BuilderImproveRoleResponseDTO {
    name: string;
    original_content: string;
    improved_content: string;
    changes_summary: string;
}

export interface BuilderValidateResponseDTO {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface BuilderChatResponseDTO {
    reply: string;
    actions: Record<string, unknown>[];
}

export interface OrgListItemDTO {
    id: string;
    slug: string;
    display_name: string;
    role: string;
    member_count: number;
    scope_count: number;
}

export interface OrgListResponseDTO {
    orgs: OrgListItemDTO[];
}

export interface OrgMemberDTO {
    user_id: string;
    username: string;
    display_name: string;
    email?: string;
    role: string;
    role_id?: string | null;
}

export interface OrgRoleDTO {
    id: string;
    org_id: string;
    slug: string;
    name: string;
    permissions: string[];
    is_system: boolean;
    is_default: boolean;
    member_count: number;
    created_at?: string;
}

export interface OrgScopeDTO {
    id: string;
    slug: string;
    display_name: string;
    visibility: string;
    member_count: number;
    team_count: number;
}

export interface OrgDetailDTO {
    id: string;
    slug: string;
    display_name: string;
    created_at: string;
    my_role: string;
    members: OrgMemberDTO[];
    scopes: OrgScopeDTO[];
    roles?: OrgRoleDTO[];
    available_permissions?: string[];
    owner_only_permissions?: string[];
}

export interface DispatchKeyDTO {
    realm_id: string;
    public_key_pem: string;
    created_at: number | null;
    rotated_at: number | null;
}

export interface OrgUpdateResponseDTO {
    updated: boolean;
}

export interface OrgLeaveResponseDTO {
    left: boolean;
}

export interface OrgAddMemberResponseDTO {
    user_id: string;
    username: string;
    role: string;
}

export interface OrgRemoveMemberResponseDTO {
    removed: boolean;
}

export interface OrgSetMemberRoleResponseDTO {
    role: string;
}

export interface UsersUpdateRoleResponseDTO {
    user_id: string;
    org_id: string;
    role_id: string;
    role_slug: string;
    role: string;
}

export interface OrgRolesListResponseDTO {
    roles: OrgRoleDTO[];
}

export interface OrgRoleResponseDTO {
    role: OrgRoleDTO;
}

export interface OrgDeleteRoleResponseDTO {
    deleted: boolean;
}

export interface OrgCreateScopeResponseDTO {
    id: string;
    slug: string;
}

export interface OrgDeleteScopeResponseDTO {
    deleted: boolean;
}

export interface OrgUpdateScopeResponseDTO {
    updated: boolean;
}

export interface OrgGetScopesResponseDTO {
    items: Array<{
        id: string;
        slug: string;
        display_name: string | null;
        visibility: 'public' | 'private';
        scope_type: 'user' | 'org';
        owner_id: string;
        org_id: string | null;
        member_count?: number;
        team_count?: number;
        created_at: string;
    }>;
    total: number;
    offset: number;
    limit: number;
}

export interface OrgAssignScopeMemberResponseDTO {
    assigned: boolean;
}

export interface OrgUnassignScopeMemberResponseDTO {
    removed: boolean;
}

export interface UpdateProfileResponseDTO {
    user: {
        id: number;
        username: string;
        display_name: string;
        email: string;
        role: string;
        created_at: string;
    };
}

export interface ChangePasswordResponseDTO {
    message: string;
}

export interface AuditLogEntryDTO {
    id: number;
    admin_id: string;
    admin_username: string;
    action: string;
    target_type: string;
    target_id: string;
    details: string;
    created_at: string;
}

export interface AuditLogResponseDTO {
    entries: AuditLogEntryDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminUserListItemDTO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    created_at: string;
}

export interface AdminUserListResponseDTO {
    users: AdminUserListItemDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminUserDetailDTO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    suspended_reason: string;
    created_at: string;
    scope_count: number;
    team_count: number;
    token_count: number;
    draft_count: number;
    orgs: { id: number; slug: string; display_name: string; role: string }[];
}

export interface AdminCreateUserResponseDTO {
    id: string;
    username: string;
}

export interface AdminUpdateUserResponseDTO {
    updated: boolean;
}

export interface AdminSuspendUserResponseDTO {
    suspended: boolean;
}

export interface AdminDeleteUserResponseDTO {
    deleted: boolean;
}

export interface AdminSetUserRoleResponseDTO {
    role: string;
}

export interface AdminResetUserPasswordResponseDTO {
    reset: boolean;
}

export interface AdminTeamListItemDTO {
    id: number;
    name: string;
    scope: string | null;
    description: string;
    author_id: string | null;
    author_username: string | null;
    visibility: string;
    listed: number;
    install_count: number;
    version_count: number;
    created_at: string;
    updated_at: string;
}

export interface AdminTeamListResponseDTO {
    teams: AdminTeamListItemDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminSetTeamListedResponseDTO {
    listed: boolean;
}

export interface AdminOrgListItemDTO {
    id: number;
    slug: string;
    display_name: string;
    member_count: number;
    scope_count: number;
    created_at: string;
}

export interface AdminOrgListResponseDTO {
    orgs: AdminOrgListItemDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminCreateOrgResponseDTO {
    id: number;
    slug: string;
}

export interface AdminDeleteOrgResponseDTO {
    deleted: boolean;
}

export interface HealthDTO {
    status: 'ok';
    timestamp: string;
    /** Last Core compatibility check (null until the first one finishes). */
    core: import('../lib/core_compat.js').Core_compat | null;
}

// ── Overview (BFF composition: orgs × dashboard rollups) ────────────

export interface OverviewCountsDTO {
    /** Pending HUG reviews + runs awaiting input. */
    needs_you: number;
    pending_reviews: number;
    awaiting_input: number;
    active_runs: number;
    failed_24h: number;
    completed_24h: number;
    daemons_online: number;
    daemons_total: number;
}

export interface OverviewRealmDTO {
    id: string;
    slug: string;
    name: string;
    org_id: string;
    org_slug: string;
    last_activity_at: number | null;
    daemons: { online: number; stale: number; offline: number; total: number };
    active_runs: number;
    awaiting_input: number;
    pending_reviews: number;
    /** pending_reviews + awaiting_input */
    needs_you: number;
}

export interface OverviewOrgDTO {
    id: string;
    slug: string;
    display_name: string;
    /** Caller's role in this org (owner / admin / operator / member / custom). */
    role: string;
    /** `error` when this org's rollups could not be loaded; the rest of the overview still renders. */
    status: 'ok' | 'error';
    error: string | null;
    counts: OverviewCountsDTO;
    realms: OverviewRealmDTO[];
}

export interface OverviewItemDTO {
    kind: 'review' | 'input' | 'run';
    id: string;
    title: string;
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
    run_id: string | null;
    team: string | null;
    phase: string | null;
    state: string | null;
    at: number | null;
}

export interface OverviewDTO {
    orgs: OverviewOrgDTO[];
    totals: OverviewCountsDTO & { orgs: number; realms: number };
    /** Merged across orgs, newest first — reviews + runs awaiting input. */
    needs_you: OverviewItemDTO[];
    /** Merged across orgs, newest first — running runs. */
    live_runs: OverviewItemDTO[];
    /** True when at least one org failed to load. */
    partial: boolean;
    /** Bell: newest in-app notifications across the same orgs. */
    inbox: NotifInboxSummaryDTO;
}

// ── Realm inbox (POST /v1/realm_inbox/get) ───────────────────────────

export interface ControlRealmDTO {
    id: string;
    slug: string;
    name: string;
    org_slug: string | null;
}

export type InboxSectionKey = 'reviews' | 'awaiting_input' | 'failed' | 'running';

export interface InboxItemDTO {
    kind: 'review' | 'input' | 'failed' | 'run';
    /** review_id for reviews, run_id otherwise. */
    id: string;
    run_id: string | null;
    title: string;
    team: string | null;
    phase: string | null;
    state: string;
    /** Epoch ms used for ordering (requested / last updated / started). */
    at: number | null;
    error: string | null;
    /** Review-only extras. */
    message: string | null;
    artifact_count: number | null;
}

export interface InboxSectionStatusDTO {
    status: 'ok' | 'error';
    error: string | null;
}

export interface RealmInboxDTO {
    realm: ControlRealmDTO;
    /** Everything that needs a person: pending reviews, awaiting input, failures (24h). Newest first. */
    items: InboxItemDTO[];
    /** Running now. Newest first. */
    live: InboxItemDTO[];
    counts: { reviews: number; awaiting_input: number; failed_24h: number; running: number };
    sections: Record<InboxSectionKey, InboxSectionStatusDTO>;
    partial: boolean;
}

// ── Run detail (POST /v1/run_detail/get) ─────────────────────────────

export interface RunDetailPhaseDTO {
    phase: string;
    status: string;
    sequence: number | null;
    started_at: number | null;
    completed_at: number | null;
    error: string | null;
    agent: string | null;
}

export interface RunDetailReviewDTO {
    id: string;
    title: string;
    phase: string | null;
    requested_at: number | null;
    message: string | null;
}

export type RunDetailSectionKey = 'phases' | 'labels' | 'realm' | 'reviews';

export interface RunDetailDTO {
    /** Core run row (get_by_id, with detail enrichment) + team_label/workspace_name from the list read. */
    run: Record<string, unknown> & { run_id: string; state: string };
    phases: RunDetailPhaseDTO[];
    realm: ControlRealmDTO | null;
    /** Pending human reviews attached to this run. */
    reviews: RunDetailReviewDTO[];
    sections: Record<RunDetailSectionKey, InboxSectionStatusDTO>;
    partial: boolean;
}

// ── Getting started (POST /v1/getting_started/get) ───────────────────

export interface GettingStartedRealmRefDTO {
    org_slug: string;
    slug: string;
}

export interface GettingStartedDTO {
    /** CLI installed + logged in — inferred from an enrolled daemon (the CLI is how daemons enrol). */
    cli: { done: boolean };
    daemon: { done: boolean; online: number; total: number; realm: GettingStartedRealmRefDTO | null };
    team: { done: boolean; realm: GettingStartedRealmRefDTO | null };
    run: { done: boolean; run_id: string | null; realm: GettingStartedRealmRefDTO | null };
    /** Where "open realm" buttons should go: first realm with a daemon, else the first realm. */
    realm: GettingStartedRealmRefDTO | null;
    done_count: number;
    total: number;
    partial: boolean;
}

// ── Notification center (POST /v1/notification_center/get, /check) ───

export type NotifScopeKind = 'org' | 'realm' | 'team';

export interface NotifScopeDTO {
    kind: NotifScopeKind;
    org_id: string;
    org_slug: string;
    realm_id: string | null;
    realm_slug: string | null;
    team_slug: string | null;
}

export interface NotifDestinationDTO {
    type: string;
    /** Human summary, secrets masked (e.g. "#hooks.slack.com/…4f1", "ops@acme.com"). */
    label: string;
}

export interface NotifChannelDTO {
    id: string;
    name: string;
    owner: { kind: 'org' | 'realm' | 'personal'; org_id: string; org_slug: string; realm_id: string | null; realm_slug: string | null };
    destinations: NotifDestinationDTO[];
    enabled: boolean;
    rule_count: number;
}

export interface NotifRuleDTO {
    id: string;
    event: string;
    scope: NotifScopeDTO;
    channel_id: string;
    channel_name: string | null;
    priority: number;
    /** Broader rules this one replaces (same org/realm, overlapping event selector). */
    replaces: string[];
}

export interface NotifOrgDTO {
    id: string;
    slug: string;
    display_name: string;
    role: string;
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change org-wide rules and org channels (Core `channels.manage`). */
    can_edit: boolean;
}

export interface NotifRealmDTO {
    id: string;
    slug: string;
    name: string;
    org_id: string;
    org_slug: string;
    status: 'ok' | 'error';
    error: string | null;
    /** May add/change realm + team rules and realm channels (`rules.manage.realm` or realm admin). */
    can_edit: boolean;
}

export interface NotifRealmPageDTO {
    offset: number;
    limit: number;
    /** Realms matching `q` in the view (all pages). */
    total: number;
    q: string | null;
    status: 'ok' | 'error';
    error: string | null;
}

export interface NotificationCenterDTO {
    orgs: NotifOrgDTO[];
    /** Only the realms on this page (see realm_page); their rules and channels are included. */
    realms: NotifRealmDTO[];
    realm_page: NotifRealmPageDTO;
    channels: NotifChannelDTO[];
    rules: NotifRuleDTO[];
    event_types: string[];
    partial: boolean;
}

export interface NotifCheckRowDTO {
    event: string;
    /** Rules that fire for this event here (all at the winning tier). */
    winners: Array<{ rule_id: string; selector: string; tier: NotifScopeKind; channel_id: string; channel_name: string | null }>;
    /** Broader-tier rules that also match but are replaced. */
    replaced: Array<{ rule_id: string; selector: string; tier: NotifScopeKind; channel_id: string; channel_name: string | null }>;
}

export interface NotificationCheckDTO {
    realm: { id: string; slug: string; name: string; org_id: string; org_slug: string };
    team_slug: string | null;
    /** Teams you can check in this realm (from the realm roster and existing team rules). */
    teams: string[];
    rows: NotifCheckRowDTO[];
    partial: boolean;
}

// ── Inbox (POST /v1/inbox/get; summary inside /v1/overview/get) ─────

export interface NotifInboxItemDTO {
    id: string;
    event: string;
    title: string | null;
    message: string | null;
    severity: string | null;
    /** Org whose inbox returned this row; null for account-wide rows. */
    org_id: string | null;
    org_slug: string | null;
    realm_id: string | null;
    realm_slug: string | null;
    team: string | null;
    run_id: string | null;
    phase: string | null;
    /** Promoted from payload for links: hug.* → review, notification.failed → channel. */
    review_id: string | null;
    channel_id: string | null;
    original_event: string | null;
    at: number;
}

export interface NotifInboxOrgDTO {
    id: string;
    slug: string;
    display_name: string;
    status: 'ok' | 'error';
    error: string | null;
}

export interface NotifInboxDTO {
    items: NotifInboxItemDTO[];
    /** Pass back as `until_ms` for the next page; null when there is nothing older. */
    next_until_ms: number | null;
    orgs: NotifInboxOrgDTO[];
    partial: boolean;
}

/** Bell summary returned with the overview. */
export interface NotifInboxSummaryDTO {
    /** Rows newer than `inbox_seen_ms` among the newest SUMMARY_WINDOW per org. */
    new_count: number;
    /** True when new_count hit the window (show "20+"). */
    capped: boolean;
    latest: NotifInboxItemDTO[];
    status: 'ok' | 'partial' | 'error';
}

/** POST /v1/notification_center/set_rules */
export interface NotifSetRulesDTO {
    saved: Array<{ event: string; rule_id: string }>;
    failed: Array<{ event: string; error: string }>;
}

// ── Realm › Runs (POST /v1/realm_runs/get) ───────────────────────────

export interface RealmRunRowDTO {
    run_id: string;
    run_name: string | null;
    team: string | null;
    state: string;
    current_phase: string | null;
    daemon_id: string | null;
    started_at: number | null;
    completed_at: number | null;
    updated_at: number | null;
    error: string | null;
}

export interface RealmRunsDTO {
    realm: ControlRealmDTO;
    items: RealmRunRowDTO[];
    total: number;
    offset: number;
    limit: number;
    /** Totals behind the state chips; null when that count failed. */
    counts: { all: number | null; running: number | null; awaiting_input: number | null; failed_7d: number | null };
    partial: boolean;
}

// ── Realm › Teams (POST /v1/realm_teams/get) ─────────────────────────

export interface RealmTeamRowDTO {
    scope: string | null;
    slug: string;
    label: string;
    version: string | null;
    latest_version: string | null;
    update_available: boolean;
    origin: 'published' | 'local';
    /** On the realm's team list (vs only found on a daemon). */
    in_team_list: boolean;
    /** Online realm daemons with this team installed / online daemons. */
    installed_count: number;
    online_daemon_count: number;
    last_run_at: number | null;
    missing_agents: string[];
}

export interface RealmTeamsDTO {
    realm: ControlRealmDTO;
    items: RealmTeamRowDTO[];
    total: number;
    offset: number;
    limit: number;
    counts: { all: number | null; full: number | null; partial: number | null; none: number | null };
    partial: boolean;
}

// ── Realm › Daemons (POST /v1/realm_daemons/get) ─────────────────────

export interface RealmDaemonRowDTO {
    id: string;
    name: string | null;
    hostname: string | null;
    owner_email: string | null;
    status: string;
    last_heartbeat: number | null;
    capacity: number | null;
    /** Runs on this daemon that are running or waiting for input. */
    running: number;
    /** How many of the realm's listed teams this daemon has installed; null if unknown. */
    teams_ready: number | null;
}

export interface RealmDaemonsDTO {
    realm: ControlRealmDTO;
    items: RealmDaemonRowDTO[];
    counts: { all: number; online: number; stale: number; offline: number };
    /** Teams on the realm's team list (denominator for teams_ready). */
    teams_total: number | null;
    /** More daemons exist than were read. */
    truncated: boolean;
    partial: boolean;
}

// ── Realm › Settings (POST /v1/realm_settings/get) ───────────────────

export interface RealmSettingsDTO {
    realm: ControlRealmDTO;
    /** The viewer's realm role; is_admin also true for site admins (org admins are enforced by Core on write). */
    you: { role: string | null; is_admin: boolean };
    members: Array<{ member_type: string; member_id: string; username: string | null; role: string; is_you: boolean }>;
    invites: Array<{ id: string; email: string; role: string; expires_at: string | null }>;
    tokens: Array<{ id: string; name: string; created_at: string; last_used_at: string | null }>;
    sections: Record<'members' | 'invites' | 'tokens', { status: 'ok' | 'error'; error: string | null }>;
    partial: boolean;
}

// ── Build › Teams (POST /v1/team_list/get, POST /v1/team_page/get) ────

/** One workflow phase, normalized from the version's workflow. */
export interface TeamPhaseDTO {
    name: string;
    /** standard | gate | pull | push | team (Core may add more; unknown types pass through). */
    type: string;
    agent: string | null;
    depends_on: string[];
    /** Human review on this phase. */
    review: boolean;
    reviewers: string | null;
    max_iterations: number | null;
    commands: string[];
    sources: string[];
    targets: string[];
    /** Sub-team reference for `team` phases. */
    team: string | null;
    /** Role brief (markdown) when the version ships one for this phase; null otherwise. */
    role: string | null;
    support: boolean;
}

export interface TeamInputDTO {
    name: string;
    description: string | null;
    required: boolean;
    default: string | null;
}

export interface TeamInstallDTO {
    realm_id: string;
    realm_slug: string;
    realm_name: string;
    org_slug: string | null;
    version: string | null;
    /** A newer published version exists than the one in this realm. */
    behind: boolean;
    in_team_list: boolean;
    installed_count: number;
    online_daemon_count: number;
    last_run_at: number | null;
    missing_agents: string[];
}

export interface TeamListRowDTO {
    id: string | null;
    name: string;
    scope: string | null;
    description: string;
    status: 'draft' | 'published';
    latest_version: string | null;
    author: string | null;
    /** Phase types in workflow order (null when the phases could not be read). */
    phase_types: string[] | null;
    /** Builder kinds (agent, gate, human, connector, fetch, script, team), same order. */
    phase_kinds: string[] | null;
    installs: TeamInstallDTO[];
}

export interface TeamListDTO {
    items: TeamListRowDTO[];
    total: number;
    offset: number;
    limit: number;
    counts: { all: number; published: number; draft: number };
    /** Realms looked at for "installed in" (capped) vs. realms the viewer has. */
    realms_checked: number;
    realms_total: number;
    partial: boolean;
}

export interface TeamReleaseDTO {
    version: string;
    changelog: string | null;
    published_at: number | null;
    is_latest: boolean;
}

export interface TeamHeaderDTO {
    id: string;
    name: string;
    scope: string | null;
    label: string;
    description: string;
    status: 'draft' | 'published';
    latest_version: string | null;
    /** Version this page shows. */
    version: string | null;
    versions: TeamReleaseDTO[];
    author: string | null;
    listed: boolean;
    tags: string[];
    can_edit: boolean;
    can_delete: boolean;
    can_toggle_listing: boolean;
}

export interface TeamRunRowDTO extends RealmRunRowDTO {
    realm_id: string | null;
    realm_slug: string | null;
    org_slug: string | null;
}

export interface TeamChangeDTO {
    kind: 'added' | 'removed' | 'changed';
    target: 'phase' | 'role' | 'inputs';
    name: string;
    detail: string;
}

export type TeamPageView = 'overview' | 'workflow' | 'files' | 'runs' | 'installs' | 'versions' | 'settings';

export interface TeamPageDTO {
    team: TeamHeaderDTO;
    counts: { phases: number; versions: number; runs: number | null };
    view: TeamPageView;
    overview?: {
        phases: TeamPhaseDTO[];
        support: TeamPhaseDTO[];
        inputs: TeamInputDTO[];
        agents: string[];
        latest: TeamReleaseDTO | null;
        installs: TeamInstallDTO[];
    };
    workflow?: {
        phases: TeamPhaseDTO[];
        support: TeamPhaseDTO[];
        recent_runs: TeamRunRowDTO[];
        overlay: {
            run: TeamRunRowDTO;
            /** Version the run used (its graph may differ from the page's version). */
            version: string | null;
            phases: TeamPhaseDTO[] | null;
            statuses: Record<string, string>;
        } | null;
    };
    files?: { files: Array<{ path: string; kind: 'yaml' | 'md'; content: string }> };
    runs?: {
        items: TeamRunRowDTO[];
        total: number;
        offset: number;
        limit: number;
        counts: { all: number | null; running: number | null; awaiting_input: number | null; failed_7d: number | null };
        realms: Array<{ id: string; slug: string; name: string; org_slug: string | null }>;
    };
    installs?: {
        items: TeamInstallDTO[];
        not_installed: Array<{ id: string; slug: string; name: string; org_slug: string | null }>;
        realms_checked: number;
        realms_total: number;
    };
    versions?: {
        items: TeamReleaseDTO[];
        compare: { from: string; to: string; changes: TeamChangeDTO[] } | null;
    };
    partial: boolean;
}
