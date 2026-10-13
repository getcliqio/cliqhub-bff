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
import { get_logger } from '../lib/log.js';
import { warn_rejected } from '../lib/best_effort.js';

const log = get_logger('svc.realm_summary');

export class RealmSummaryService {
    /** Teams read for the summary (the page shows chips; "View all" goes to the list). */
    static readonly TEAMS_LIMIT = 100;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: RealmTeamsService,
        private readonly _daemons: RealmDaemonsService,
        private readonly _settings: RealmSettingsService,
    ) {}

    /**
     * @param ref - The realm (`org_slug` + `slug`).
     * @param token - Caller's Core token.
     * @param viewer - Who is looking (for `you` and the people list).
     */
    async get(ref: RealmRefInput, token: string, viewer: RealmSettingsViewer): Promise<RealmSummaryData> {
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
                items: t.items.map((r) => ({ scope: r.scope, slug: r.slug, label: r.label, version: r.version, missing_agents: r.missing_agents })),
            } : null,
            daemons: d ? {
                online: d.counts.online,
                total: d.counts.all,
                items: d.items.map((x) => ({ id: x.id, name: x.name || x.hostname || x.id.slice(0, 8), status: x.status })),
                truncated: d.truncated,
            } : null,
            people: s && s.sections.members.status === 'ok' ? {
                total: s.members.length,
                by_role,
                items: s.members.map((m) => ({ member_id: m.member_id, username: m.username, role: m.role, is_you: m.is_you })),
                pending_invites: s.sections.invites.status === 'ok' ? s.invites.length : null,
            } : null,
            you: s?.you ?? { role: null, is_admin: viewer.site_admin },
        };
    }
}
