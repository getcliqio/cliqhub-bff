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
    id: number;
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
    id: number;
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
    id: number;
    slug: string;
    display_name: string;
    visibility: string;
    member_count: number;
    team_count: number;
}

export interface OrgDetailDTO {
    id: number;
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
    id: number;
    slug: string;
}

export interface OrgDeleteScopeResponseDTO {
    deleted: boolean;
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

export interface AdminScopeListItemDTO {
    id: number;
    slug: string;
    display_name: string;
    owner_id: string;
    owner_username: string;
    visibility: string;
    scope_type: string;
    team_count: number;
    created_at: string;
}

export interface AdminScopeListResponseDTO {
    scopes: AdminScopeListItemDTO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminCreateScopeResponseDTO {
    id: number;
    slug: string;
}

export interface AdminUpdateScopeResponseDTO {
    updated: boolean;
}

export interface AdminDeleteScopeResponseDTO {
    deleted: boolean;
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
}
