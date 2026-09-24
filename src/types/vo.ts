/**
 * Value Objects (VOs): types that mirror the backend API response shapes.
 * Added incrementally as each slice migrates routes.
 */

export interface UserVO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: 'user' | 'admin';
    suspended_at: string | null;
    suspended_reason: string;
    created_at: string;
    preferences: Record<string, unknown>;
}

export interface ScopeVO {
    id: string;
    slug: string;
    display_name: string;
    owner_id: string;
    org_id: string | null;
    visibility: 'public' | 'private';
    scope_type: 'user' | 'org';
    created_at: string;
}

/** Org entry returned alongside login/me for CLI default resolution. */
export interface OrgRealmInfoVO {
    id: string;
    slug: string;
    name: string;
    default_realm_slug: string;
}

export interface LoginResponseVO {
    token: string;
    scopes?: string[];
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    /** Qualified slug in org.realm format (e.g., "elan.default"). */
    default_realm_qualified?: string | null;
    enroll_token?: string | null;
    orgs?: OrgRealmInfoVO[];
}

export interface SignupResponseVO {
    token: string;
    user: UserVO;
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    enroll_token?: string | null;
    orgs?: OrgRealmInfoVO[];
}

export interface ImpersonationVO {
    actor_id: string;
    actor_username: string;
}

export interface MeResponseVO {
    user: UserVO;
    scopes: ScopeVO[];
    org_slugs?: string[];
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
    default_realm_qualified?: string | null;
    impersonation?: ImpersonationVO | null;
    orgs?: OrgRealmInfoVO[];
}

export interface ImpersonateResponseVO {
    token: string;
    scopes?: string[];
    impersonation?: ImpersonationVO | null;
    default_realm_id?: string | null;
    default_realm_slug?: string | null;
}

export interface TokenPermissionsVO {
    domains?: {
        orgs?: Array<string | '*'> | '*';
        scopes?: Array<string | '*'> | '*';
        realms?: Array<string | '*'> | '*';
    };
    access?: Partial<Record<string, Array<'read' | 'write' | 'admin'>>>;
}

export interface TokenVO {
    id: number;
    name: string;
    permissions: TokenPermissionsVO;
    created_at: string;
    last_used_at: string | null;
}

export interface CreateTokenResponseVO {
    token: string;
    name: string;
    id?: number;
    realm_ids?: string[];
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
    expires_in?: number;
}

export interface RevokeTokenResponseVO {
    revoked: boolean;
}

export interface ListTokensResponseVO {
    tokens: TokenVO[];
    total: number;
}

export interface TokenDetailResponseVO {
    token: TokenVO;
}

export interface TokenUpdateResponseVO {
    token: TokenVO;
}

export interface RotateTokenResponseVO {
    token: string;
    type?: string;
    bearer?: string;
    realm_id?: string;
    has_bearer?: boolean;
    bearer_prefix?: string | null;
}

export interface TeamListItemVO {
    name: string;
    scope: string | null;
    description: string;
    author: string | null;
    latest_version: string;
    install_count: number;
    tags: string[];
    listed?: boolean;
}

export interface TeamDetailVO extends TeamListItemVO {
    license: string;
    visibility: 'public' | 'private' | 'draft';
    created_at: string;
    updated_at: string;
    versions: TeamVersionVO[];
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

export interface TeamVersionVO {
    version: string;
    changelog: string;
    published_at: string;
}

export interface TeamListResponseVO {
    teams: TeamListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface TeamSearchResponseVO {
    teams: TeamListItemVO[];
    total: number;
}

export interface TeamDownloadResponseVO {
    filename: string;
    data_base64: string;
}

export interface PublishResultVO {
    name: string;
    scope: string | null;
    version: string;
    status?: 'draft' | 'published';
    listed?: boolean;
}

export interface DeleteTeamResultVO {
    deleted: boolean;
}

export interface RenameTeamResultVO {
    name: string;
    scope: string;
}

export interface ToggleListedResultVO {
    listed: boolean;
}

export interface MyTeamsListResponseVO {
    teams: TeamListItemVO[];
}

export interface ScopeGroupVO {
    slug: string;
    display_name: string;
    scope_type: 'user' | 'org';
    visibility: 'public' | 'private';
    teams: TeamListItemVO[];
}

export interface MyTeamsAllResponseVO {
    scopes: ScopeGroupVO[];
}

export interface LatestVersionResponseVO {
    name: string;
    scope: string | null;
    version: string | null;
}

export interface BatchLatestItemVO {
    name: string;
    scope: string | null;
    latest: string | null;
}

export interface BatchLatestResponseVO {
    teams: BatchLatestItemVO[];
}

export interface DraftListItemVO {
    id: number;
    title: string;
    updated_at: string;
}

export interface DraftDetailVO {
    id: number;
    user_id: string;
    title: string;
    team_json: string;
    created_at: string;
    updated_at: string;
}

export interface DraftListResponseVO {
    drafts: DraftListItemVO[];
}

export interface DraftSaveResponseVO {
    id: number;
}

export interface DraftDeleteResponseVO {
    deleted: boolean;
}

export interface BuilderGenerateResponseVO {
    job_id: string;
    status: string;
    stage: string;
}

export interface BuilderGenerateStatusVO {
    job_id: string;
    status: string;
    stage: string;
    team?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    usage?: Record<string, unknown>;
    error?: { code: string; message: string };
}

export interface BuilderImproveRoleResponseVO {
    name: string;
    original_content: string;
    improved_content: string;
    changes_summary: string;
}

export interface BuilderValidateResponseVO {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface BuilderChatResponseVO {
    reply: string;
    actions: Record<string, unknown>[];
    usage?: Record<string, unknown>;
}

export interface OrgListItemVO {
    id: number;
    slug: string;
    display_name: string;
    role: string;
    member_count: number;
    scope_count: number;
}

export interface OrgListResponseVO {
    orgs: OrgListItemVO[];
}

export interface OrgMemberVO {
    user_id: string;
    username: string;
    display_name: string;
    email?: string;
    role: string;
    role_id?: string | null;
}

export interface OrgRoleVO {
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

export interface OrgScopeVO {
    id: number;
    slug: string;
    display_name: string;
    visibility: string;
    member_count: number;
    team_count: number;
}

export interface OrgDetailVO {
    id: number;
    slug: string;
    display_name: string;
    created_at: string;
    my_role: string;
    members: OrgMemberVO[];
    scopes: OrgScopeVO[];
    roles?: OrgRoleVO[];
    available_permissions?: string[];
    owner_only_permissions?: string[];
}

export interface DispatchKeyVO {
    realm_id: string;
    public_key_pem: string;
    created_at: number | null;
    rotated_at: number | null;
}

export interface OrgUpdateResponseVO {
    updated: boolean;
}

export interface OrgLeaveResponseVO {
    left: boolean;
}

export interface OrgAddMemberResponseVO {
    user_id: string;
    username: string;
    role: string;
}

export interface OrgRemoveMemberResponseVO {
    removed: boolean;
}

export interface OrgSetMemberRoleResponseVO {
    role: string;
}

export interface UsersUpdateRoleResponseVO {
    user_id: string;
    org_id: string;
    role_id: string;
    role_slug: string;
    role: string;
}

export interface OrgRolesListResponseVO {
    roles: OrgRoleVO[];
}

export interface OrgRoleResponseVO {
    role: OrgRoleVO;
}

export interface OrgDeleteRoleResponseVO {
    deleted: boolean;
}

export interface OrgCreateScopeResponseVO {
    id: number;
    slug: string;
}

export interface OrgDeleteScopeResponseVO {
    deleted: boolean;
}

export interface OrgAssignScopeMemberResponseVO {
    assigned: boolean;
}

export interface OrgUnassignScopeMemberResponseVO {
    removed: boolean;
}

export interface UpdateProfileResponseVO {
    user: {
        id: number;
        username: string;
        display_name: string;
        email: string;
        role: string;
        suspended_at: string | null;
        suspended_reason: string;
        created_at: string;
    };
}

export interface ChangePasswordResponseVO {
    message: string;
}

export interface AuditLogEntryVO {
    id: number;
    admin_id: string;
    admin_username: string;
    action: string;
    target_type: string;
    target_id: string;
    details: string;
    created_at: string;
}

export interface AuditLogResponseVO {
    entries: AuditLogEntryVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminUserListItemVO {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: string;
    suspended_at: string | null;
    created_at: string;
}

export interface AdminUserListResponseVO {
    users: AdminUserListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminUserDetailVO {
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

export interface AdminCreateUserResponseVO {
    id: string;
    username: string;
}

export interface AdminUpdateUserResponseVO {
    updated: boolean;
}

export interface AdminSuspendUserResponseVO {
    suspended: boolean;
}

export interface AdminDeleteUserResponseVO {
    deleted: boolean;
}

export interface AdminSetUserRoleResponseVO {
    role: string;
}

export interface AdminResetUserPasswordResponseVO {
    reset: boolean;
}

export interface AdminTeamListItemVO {
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

export interface AdminTeamListResponseVO {
    teams: AdminTeamListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminSetTeamListedResponseVO {
    listed: boolean;
}

export interface AdminScopeListItemVO {
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

export interface AdminScopeListResponseVO {
    scopes: AdminScopeListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminCreateScopeResponseVO {
    id: number;
    slug: string;
}

export interface AdminUpdateScopeResponseVO {
    updated: boolean;
}

export interface AdminDeleteScopeResponseVO {
    deleted: boolean;
}

export interface AdminOrgListItemVO {
    id: number;
    slug: string;
    display_name: string;
    member_count: number;
    scope_count: number;
    created_at: string;
}

export interface AdminOrgListResponseVO {
    orgs: AdminOrgListItemVO[];
    total: number;
    limit: number;
    offset: number;
}

export interface AdminCreateOrgResponseVO {
    id: number;
    slug: string;
}

export interface AdminDeleteOrgResponseVO {
    deleted: boolean;
}
