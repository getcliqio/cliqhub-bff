/**
 * Getting started — onboarding progress of the signed-in user.
 *
 * Composes Core: `POST /v1/orgs/get { mine }` → per org `POST /internal/dashboard/realms`
 * + `POST /v1/runs/get { org_id, limit: 1 }` → `POST /v1/teams/get { realm_id, limit: 1 }`
 * per realm until one has a team.
 */

import { get_logger } from '../lib/log.js';
import { best_effort, error_fields } from '../lib/best_effort.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { DashboardRealmVO } from '../types/core/dashboard.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type { GettingStartedGetInput, GettingStartedData, GettingStartedRealmRefData } from '../schemas/getting_started_types.js';

const log = get_logger('svc.getting_started');

type RealmRow = DashboardRealmVO & { org_slug: string };

/**
 * Onboarding checklist, computed from data that already exists:
 *   daemon  → any realm with an enrolled daemon (dashboard realms rollup)
 *   cli     → implied by a daemon (the CLI is how daemons enrol)
 *   team    → any realm roster with at least one team (/v1/teams/get { realm_id })
 *   run     → any run in any org (/v1/runs/get { org_id, limit: 1 })
 * Composed in the BFF so the browser makes one call.
 */
export class GettingStartedService {
    /** Orgs read in parallel. */
    static readonly CONCURRENCY = 4;
    /** Realms probed for a team roster before giving up (onboarding users have few). */
    static readonly MAX_TEAM_PROBES = 10;

    constructor(
        private readonly _orgs: OrgsRepository,
        private readonly _dashboard: DashboardRepository,
        private readonly _control: ControlRepository,
        private readonly _teams: TeamsRepository,
    ) {}

    /**
     * Which onboarding steps are done (cli, daemon, team, run) and where "open realm" should go.
     * A failing Core read marks the answer `partial` instead of failing the call.
     *
     * @param _input - No fields (strict empty body).
     * @param token - The caller's Core token (session `target_token`).
     */
    async get(_input: GettingStartedGetInput, token: string): Promise<GettingStartedData> {
        const { orgs } = await this._orgs.get({ mine: true }, token);
        let partial = false;

        const per_org = await this.map_limited(orgs, async (org: OrgListItemVO) => {
            const [realms, runs] = await Promise.allSettled([
                this._dashboard.realms({ org_id: org.id }, token),
                this._control.runs_for_org(org.id, token, 1),
            ]);
            if (realms.status === 'rejected') log.warn('getting_started_realms_failed', { org_id: org.id, ...error_fields(realms.reason) });
            if (runs.status === 'rejected') log.warn('getting_started_runs_failed', { org_id: org.id, ...error_fields(runs.reason) });
            if (realms.status === 'rejected' || runs.status === 'rejected') partial = true;
            return {
                org,
                realms: realms.status === 'fulfilled'
                    ? (realms.value.realms ?? []).map((r) => ({ ...r, org_slug: r.org_slug ?? org.slug }))
                    : [] as RealmRow[],
                run: runs.status === 'fulfilled' ? runs.value.items[0] ?? null : null,
            };
        });

        const realms: RealmRow[] = per_org.flatMap((o) => o.realms);
        const with_daemon = realms.filter((r) => (r.daemons?.total ?? 0) > 0);
        const online = realms.reduce((n, r) => n + (r.daemons?.online ?? 0), 0);
        const total_daemons = realms.reduce((n, r) => n + (r.daemons?.total ?? 0), 0);
        const ref = (r: RealmRow | undefined | null): GettingStartedRealmRefData | null => (r ? { org_slug: r.org_slug, slug: r.slug } : null);

        // Team: probe realms (daemon realms first) until one has a roster entry.
        let team_realm: RealmRow | null = null;
        const probe = [...with_daemon, ...realms.filter((r) => !with_daemon.includes(r))].slice(0, GettingStartedService.MAX_TEAM_PROBES);
        for (const r of probe) {
            // Core answers `PagedData` `{ items, total, offset, limit }`; total counts the whole roster.
            const page = await best_effort(log, 'getting_started_team_probe_failed', this._teams.get({ realm_id: r.id, limit: 1 }, token), null, { realm_id: r.id });
            if (page === null) { partial = true; continue; }
            if (Number(page.total ?? 0) > 0 || (page.items?.length ?? 0) > 0) { team_realm = r; break; }
        }

        const run_hit = per_org.find((o) => o.run);
        const run_realm = run_hit?.run?.realm_id ? realms.find((r) => r.id === run_hit.run!.realm_id) ?? null : null;

        const daemon_done = with_daemon.length > 0;
        const run_done = Boolean(run_hit);
        // A run implies a team was installed at some point, even if the roster changed since.
        const team_done = Boolean(team_realm) || run_done;
        const steps = [daemon_done, daemon_done, team_done, run_done];

        return {
            cli: { done: daemon_done },
            daemon: { done: daemon_done, online, total: total_daemons, realm: ref(with_daemon[0]) },
            team: { done: team_done, realm: ref(team_realm) },
            run: { done: run_done, run_id: run_hit?.run?.run_id ?? null, realm: ref(run_realm) },
            realm: ref(with_daemon[0] ?? realms[0]),
            done_count: steps.filter(Boolean).length,
            total: steps.length,
            partial,
        };
    }

    /** `Promise.all` over `items` with at most CONCURRENCY calls in flight; results keep input order. */
    private async map_limited<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
        const out: R[] = new Array(items.length);
        let next = 0;
        const worker = async (): Promise<void> => {
            while (next < items.length) {
                const i = next++;
                out[i] = await fn(items[i]);
            }
        };
        await Promise.all(Array.from({ length: Math.min(GettingStartedService.CONCURRENCY, items.length) }, () => worker()));
        return out;
    }
}
