/**
 * Realm page summary — the realm's header details, teams, daemons and people in one read.
 *
 * Composes the realm Teams, Daemons and Settings reads (each resolves the realm, which is the
 * membership gate). A part that fails is `null`; the page shows what it has.
 */

import type { RealmSummaryData } from '../schemas/realm_inbox_types.js';
import type { RealmRefInput } from '../schemas/realm_ref.js';
import type { RealmSettingsViewer } from '../schemas/realm_settings_types.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { RealmTeamsService } from './realm_teams_service.js';
import type { RealmDaemonsService } from './realm_daemons_service.js';
import type { RealmSettingsService } from './realm_settings_service.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.realm_summary');

export class RealmSummaryService {
    /** Teams read for the summary counts (a realm's whole team list; realms have few). */
    static readonly TEAMS_LIMIT = 100;
    /** Rows per page in the realm page's Teams and Members tables. */
    static readonly PAGE = 5;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: RealmTeamsService,
        private readonly _daemons: RealmDaemonsService,
        private readonly _settings: RealmSettingsService,
        private readonly _catalog: TeamsRepository,
    ) {}

    /**
     * @param ref - The realm (`org_slug` + `slug`).
     * @param token - Caller's Core token.
     * @param viewer - Who is looking (for `you` and the people list).
     * @param pages - Which page of teams / members (offsets; pages of {@link RealmSummaryService.PAGE}).
     */
    async get(ref: RealmRefInput, token: string, viewer: RealmSettingsViewer, pages: { teams_offset?: number; members_offset?: number } = {}): Promise<RealmSummaryData> {
        const realm = await this._control.realm_by_slug(ref.org_slug, ref.slug, token);
        const [teams, daemons, settings] = await Promise.allSettled([
            this._teams.get({ ...ref, limit: RealmSummaryService.TEAMS_LIMIT }, token),
            this._daemons.get(ref, token),
            this._settings.get(ref, token, viewer),
        ]);
        warn_rejected(log, 'realm_summary_section_failed', { teams, daemons, settings }, { realm_id: realm.id });

        const t = teams.status === 'fulfilled' ? teams.value : null;
        const d = daemons.status === 'fulfilled' ? daemons.value : null;
        const s = settings.status === 'fulfilled' ? settings.value : null;
        const by_role: Record<string, number> = {};
        for (const m of s?.members ?? []) by_role[m.role] = (by_role[m.role] ?? 0) + 1;

        const P = RealmSummaryService.PAGE;
        // Teams: most recently run first, then by name; this page only gets a catalog read (its description).
        const teams_sorted = [...(t?.items ?? [])].sort((x, y) => (y.last_run_at ?? 0) - (x.last_run_at ?? 0) || x.label.localeCompare(y.label));
        const t_off = Math.min(pages.teams_offset ?? 0, Math.max(0, teams_sorted.length - 1));
        const t_page = teams_sorted.slice(t_off, t_off + P);
        const described = await Promise.all(t_page.map(async (r) => (r.scope && r.origin === 'hub'
            ? (await this._catalog.get_by_id({ name: r.slug, scope: r.scope }, token).catch(() => null))?.description || null
            : null)));
        // People: admins, then operators, then members; you first within your role.
        const RANK: Record<string, number> = { admin: 0, operator: 1, member: 2 };
        const people_sorted = [...(s?.members ?? [])].sort((x, y) => (RANK[x.role] ?? 3) - (RANK[y.role] ?? 3) || Number(y.is_you) - Number(x.is_you) || (x.username ?? '').localeCompare(y.username ?? ''));
        const m_off = Math.min(pages.members_offset ?? 0, Math.max(0, people_sorted.length - 1));

        return {
            realm: {
                description: realm.description ?? null,
                created_at: realm.created_at ?? null,
                updated_at: realm.updated_at ?? null,
                created_by_username: realm.created_by_username ?? null,
            },
            teams: t ? {
                total: t.total,
                missing_agents: t.items.filter((r) => r.missing_agents.length > 0).length,
                offset: t_off,
                limit: P,
                items: t_page.map((r, i) => ({
                    scope: r.scope, slug: r.slug, label: r.label, version: r.version,
                    latest_version: r.update_available ? r.latest_version : null,
                    missing_agents: r.missing_agents, last_run_at: r.last_run_at, description: described[i] ?? null,
                })),
            } : null,
            daemons: d ? {
                online: d.counts.online,
                total: d.counts.all,
                items: d.items.map((x) => ({ id: x.id, name: x.name || x.hostname || x.id.slice(0, 8), status: x.status })),
                truncated: d.truncated,
            } : null,
            people: s && s.sections.members.status === 'ok' ? {
                total: s.members.length,
                offset: m_off,
                limit: P,
                by_role,
                items: people_sorted.slice(m_off, m_off + P).map((m) => ({ member_id: m.member_id, username: m.username, role: m.role, is_you: m.is_you })),
                pending_invites: s.sections.invites.status === 'ok' ? s.invites.length : null,
            } : null,
            you: s?.you ?? { role: null, is_admin: viewer.site_admin },
        };
    }
}
