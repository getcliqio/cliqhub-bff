/**
 * Before a run is queued: does every agent the team uses (its own steps, support steps and
 * every sub-team's, at any depth) have its required settings in that realm?
 *
 * Composes Core routes (all existing): realms/get_by_id { realm_id } (org slug),
 * orgs/get { mine } (org id), teams/get_by_id (the team, then each sub-team through
 * TeamPageService.sub_teams), agents/get_settings { org_id, realm_id } (`missing_required`
 * per agent, Core's own reading of each setting's `when`).
 *
 * Best effort: when a read fails the check passes and Core decides, so a slow or failed read
 * never blocks a run. Only a definite "missing" refuses.
 */

import { get_logger } from '../lib/log.js';
import { error_fields } from '../lib/best_effort.js';
import { ApiError } from '../errors/api_error.js';
import { to_team_phases_data } from '../mappers/team_page_mapper.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { AgentSettingsVO } from '../types/core/agents.js';
import type { TeamPhaseData } from '../schemas/team_page_types.js';
import type { TeamPageService } from './team_page_service.js';

const log = get_logger('svc.run_preflight');

/** One agent the team uses whose required settings are missing in the realm. */
export interface MissingAgentSettings {
    agent: string;
    /** Setting keys, as `agents.<agent>.<key>` takes them (e.g. `api_key`). */
    missing: string[];
}

/** The keys a settings row says are required and not set (Core's `missing_required`, or derived). */
export function missing_keys(row: AgentSettingsVO): string[] {
    if (Array.isArray(row.missing_required)) return row.missing_required.map(String);
    if (row.all_required_configured) return [];
    return (row.settings?.required ?? []).map((d) => d.key).filter((k) => !row.values?.[k]);
}

/** Agent names the steps use (team steps carry no agent). */
export function agents_of(phases: TeamPhaseData[]): string[] {
    return phases.map((p) => p.agent).filter((a): a is string => Boolean(a));
}

export class RunPreflightService {
    constructor(
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
        private readonly _reads: CoreReadRepository,
        private readonly _orgs: OrgsRepository,
        private readonly _team_page: TeamPageService,
    ) {}

    /**
     * The agents the team (with its sub-teams) uses that miss required settings in the realm;
     * empty when all are set up or the check could not be made.
     */
    async missing_settings(realm_id: string, team_ref: string, token: string): Promise<{ agents: MissingAgentSettings[]; realm: string | null }> {
        const none = { agents: [], realm: null };
        const m = /^@?([^/]+)\/(.+)$/.exec(team_ref);
        if (!m) return none;
        try {
            const realm = await this._control.realm_by_id(realm_id, token);
            const orgs = await this._orgs.get({ mine: true }, token);
            const org = orgs.orgs.find((o) => o.slug === realm.org_slug);
            if (!org) return none;
            const team = await this._teams.get_by_id({ scope: m[1], name: m[2] }, token);
            const { phases, support } = to_team_phases_data(team.workflow, team.roles);
            const subs = await this._team_page.sub_teams(phases, token, String(team.id));
            const used = new Set([...agents_of(phases), ...agents_of(support), ...Object.values(subs.map).flatMap((t) => agents_of(t.phases))]);
            if (!used.size) return none;
            const raw = (await this._reads.read('agents.get_settings', { org_id: org.id, realm_id }, token)) as { data?: unknown };
            const rows = (Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []) as AgentSettingsVO[];
            const out: MissingAgentSettings[] = [];
            for (const name of [...used].sort()) {
                const row = rows.find((r) => r.name === name);
                const missing = row ? missing_keys(row) : [];
                if (missing.length) out.push({ agent: name, missing });
            }
            return { agents: out, realm: realm.name || realm.slug || null };
        } catch (err) {
            log.warn('run_preflight_skipped', { realm_id, team_ref, ...error_fields(err) });
            return none;
        }
    }

    /**
     * Refuses the run when an agent the team uses misses a required setting in the realm.
     *
     * @throws ApiError 422 `agent_settings_missing`, `details.agents` naming each agent and key.
     */
    async check(realm_id: string, team_ref: string, token: string): Promise<void> {
        const { agents: missing, realm: realm_label } = await this.missing_settings(realm_id, team_ref, token);
        if (!missing.length) return;
        const lines = missing.map((a) => `${a.agent}: ${a.missing.map((k) => `agents.${a.agent}.${k}`).join(', ')}`);
        log.info('run_refused_agent_settings', { realm_id, team_ref, agents: missing.map((a) => a.agent) });
        throw new ApiError(
            'agent_settings_missing',
            `This team can't run in ${realm_label ?? 'this realm'} yet: set ${lines.join('; ')} in the realm's agent settings, then start the run again.`,
            422,
            { agents: missing },
        );
    }
}
