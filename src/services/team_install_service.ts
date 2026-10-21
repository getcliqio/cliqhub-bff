/**
 * Install one published team into several realms (the team page's Install dialog).
 *
 * Core installs into one realm per call (`realms/add_team`), so the BFF:
 *   1. checks every realm first (pre-flight), mirroring Core's route policy for that call
 *      (realm standing `operate` + org permission `realms.teams.manage`) and its org rule
 *      (a team outside the realm's org needs `teams.install` there, unless the org owns its scope).
 *      If any realm fails, nothing is installed and every failing realm is named;
 *   2. then installs into each realm in turn. If Core refuses some, the error names the realms
 *      where installation did not succeed (and those where it did).
 *
 * A pre-flight read that fails (not a refusal) leaves that realm to Core.
 */
import { get_logger } from '../lib/log.js';
import { best_effort, error_fields } from '../lib/best_effort.js';
import { ApiError } from '../errors/api_error.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlOrgTeamVO, ControlRealmVO } from '../types/core/control.js';
import type { OrgDetailVO, OrgListItemVO } from '../types/core/orgs.js';

const log = get_logger('team_install');

/** The org permission Core's `realms/add_team` policy requires. */
export const REALM_TEAMS_PERMISSION = 'realms.teams.manage';
/** The org permission needed to bring a team into an org's library. */
export const ORG_TEAMS_PERMISSION = 'teams.install';

export interface TeamInstallInput {
    scope: string;
    slug: string;
    realm_ids: string[];
    /** The version the realms run (default: the latest published). */
    version?: string;
}

export interface TeamInstallViewer {
    user_id: string;
    site_admin: boolean;
}

/** One realm that will not (pre-flight) or did not (Core) get the team. */
export interface TeamInstallFailure {
    realm_id: string;
    realm_slug: string | null;
    code: string;
    error: string;
}

export interface TeamInstallData {
    installed: Array<{ realm_id: string; realm_slug: string }>;
}

/** What the viewer holds in one org, read once per org. */
interface OrgStanding {
    org: OrgListItemVO;
    detail: OrgDetailVO | null;
    teams: ControlOrgTeamVO[] | null;
}

function message_of(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.message : fallback;
}

/** "a, b and c". */
function names(list: string[]): string {
    return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export class TeamInstallService {
    constructor(
        private readonly _orgs_repo: OrgsRepository,
        private readonly _control_repo: ControlRepository,
    ) {}

    /**
     * Pre-flight every realm, then install into each.
     *
     * @returns The realms the team was added to (all of them).
     * @throws ApiError 403 `install_blocked` when the pre-flight refuses any realm (nothing installed;
     *   `details.failed` lists each realm and why).
     * @throws ApiError `install_incomplete` when Core refused some realms after the pre-flight passed
     *   (`details.installed` / `details.failed`); the status is Core's for the first failure.
     */
    async install(input: TeamInstallInput, token: string, viewer: TeamInstallViewer): Promise<TeamInstallData> {
        const realm_ids = [...new Set(input.realm_ids)];
        const label = `@${input.scope}/${input.slug}`;

        const orgs = await best_effort(log, 'install_orgs_failed', this._orgs_repo.get({ mine: true }, token).then((r) => r.orgs), null, {});
        const standing = new Map<string, Promise<OrgStanding | null>>();
        const org_standing = (org_slug: string | null | undefined): Promise<OrgStanding | null> => {
            const org = org_slug ? orgs?.find((o) => o.slug === org_slug) : undefined;
            if (!org) return Promise.resolve(null);
            if (!standing.has(org.id)) {
                standing.set(org.id, Promise.all([
                    best_effort(log, 'install_org_detail_failed', this._orgs_repo.get_by_id({ org_id: org.id }, token), null, { org_id: org.id }),
                    best_effort(log, 'install_org_teams_failed', this._control_repo.org_teams(org.id, token), null, { org_id: org.id }),
                ]).then(([detail, teams]) => ({ org, detail, teams })));
            }
            return standing.get(org.id)!;
        };

        // 1. Pre-flight, all realms.
        const checked = await Promise.all(realm_ids.map(async (realm_id) => {
            let realm: ControlRealmVO;
            try {
                realm = await this._control_repo.realm_by_id(realm_id, token);
            } catch (err) {
                if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
                    return { realm_id, realm: null, failure: { realm_id, realm_slug: null, code: 'realm_not_found', error: 'You can’t see this realm.' } };
                }
                log.warn('install_realm_read_failed', { realm_id, ...error_fields(err) });
                return { realm_id, realm: null, failure: null };
            }
            const failure = await this._preflight(realm, await org_standing(realm.org_slug), input, label, token, viewer);
            return { realm_id, realm, failure };
        }));
        const blocked = checked.flatMap((c) => (c.failure ? [c.failure] : []));
        if (blocked.length) {
            log.info('team_install_blocked', { scope: input.scope, slug: input.slug, realms: realm_ids.length, blocked: blocked.length });
            const lines = blocked.map((f) => `${f.realm_slug ?? f.realm_id}: ${f.error}`);
            throw new ApiError(
                'install_blocked',
                `Nothing was installed. Fix ${blocked.length === 1 ? 'this realm' : 'these realms'} and try again — ${lines.join(' ')}`,
                403,
                { failed: blocked },
            );
        }

        // 2. Install, one realm at a time.
        const installed: TeamInstallData['installed'] = [];
        const failed: TeamInstallFailure[] = [];
        let first_status = 0;
        for (const c of checked) {
            const realm_slug = c.realm?.slug ?? c.realm_id;
            try {
                await this._control_repo.add_team({ realm_id: c.realm_id, scope: input.scope, slug: input.slug, ...(input.version ? { version: input.version } : {}) }, token);
                installed.push({ realm_id: c.realm_id, realm_slug });
            } catch (err) {
                log.warn('team_install_failed', { realm_id: c.realm_id, scope: input.scope, slug: input.slug, ...error_fields(err) });
                if (!first_status) first_status = err instanceof ApiError ? err.status : 502;
                failed.push({
                    realm_id: c.realm_id, realm_slug, code: err instanceof ApiError ? err.code : 'upstream_error',
                    error: message_of(err, 'Core did not answer.'),
                });
            }
        }
        log.info('team_installed', { scope: input.scope, slug: input.slug, installed: installed.length, failed: failed.length });
        if (failed.length) {
            const done = installed.length ? `Installed in ${names(installed.map((i) => i.realm_slug))}. ` : '';
            const why = failed.map((f) => `${f.realm_slug}: ${f.error}`).join(' ');
            throw new ApiError(
                'install_incomplete',
                `${done}Installation was not successful on ${names(failed.map((f) => f.realm_slug ?? f.realm_id))} — ${why}`,
                first_status || 502,
                { installed, failed },
            );
        }
        return { installed };
    }

    /** Why the viewer can't add the team to this realm, or null when Core should accept it. */
    private async _preflight(
        realm: ControlRealmVO,
        org: OrgStanding | null,
        input: TeamInstallInput,
        label: string,
        token: string,
        viewer: TeamInstallViewer,
    ): Promise<TeamInstallFailure | null> {
        const fail = (code: string, error: string): TeamInstallFailure => ({ realm_id: realm.id, realm_slug: realm.slug, code, error });
        if (viewer.site_admin) return null;
        // Unknown org standing (a read failed): Core decides.
        if (org && !org.detail) return null;

        const me = org?.detail?.members.find((m) => m.user_id === viewer.user_id && m.status === 'active');
        const role = me?.role_id ? org!.detail!.roles.find((r) => r.id === me.role_id) ?? null : null;
        const org_admin = Boolean(role && (role.is_system || role.slug === 'admin'));
        const holds = (perm: string) => Boolean(role && (role.is_system || role.permissions.includes(perm)));

        // Realm standing: org owner/admin or realm owner → admin; else the realm member role.
        if (!org_admin && realm.owner_user_id !== viewer.user_id) {
            let realm_role: string | null;
            try {
                const members = await this._control_repo.realm_members(realm.id, token);
                realm_role = members.find((m) => m.member_type === 'user' && m.member_id === viewer.user_id)?.role ?? null;
            } catch (err) {
                log.warn('install_realm_members_failed', { realm_id: realm.id, ...error_fields(err) });
                return null;
            }
            if (!realm_role) return fail('not_a_member', 'You’re not a member of this realm.');
            if (realm_role === 'member') return fail('level_too_low', 'You can only view this realm; installing needs operator or admin.');
        }
        // The org role grants the permission (a guest outside the org is judged on the realm role alone).
        if (role && !holds(REALM_TEAMS_PERMISSION)) {
            return fail('missing_permission', `Your role (${role.name}) can’t install teams in realms (needs ${REALM_TEAMS_PERMISSION}).`);
        }
        // The team must be in the realm's org, or the org owns it, or the viewer may add it.
        if (org?.teams) {
            const in_org = org.teams.some((t) => t.name === input.slug && (t.scope ?? '') === input.scope);
            const owned = org.detail!.scopes.some((s) => s.slug === input.scope);
            if (!in_org && !owned && !holds(ORG_TEAMS_PERMISSION)) {
                return fail('team_not_in_org', `${label} isn’t in ${org.org.display_name || org.org.slug} yet. Ask someone who can add teams to the org to add it first.`);
            }
        }
        return null;
    }
}
