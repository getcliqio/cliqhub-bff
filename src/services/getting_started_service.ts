import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { DashboardRealmVO, OrgListItemVO } from '../types/vo.js';
import type { GettingStartedDTO, GettingStartedRealmRefDTO } from '../types/dto.js';

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
    static readonly CONCURRENCY = 4;
    /** Realms probed for a team roster before giving up (onboarding users have few). */
    static readonly MAX_TEAM_PROBES = 10;

    private _orgs: OrgsRepository;
    private _dashboard: DashboardRepository;
    private _control: ControlRepository;
    private _teams: TeamsRepository;

    constructor(orgs: OrgsRepository, dashboard: DashboardRepository, control: ControlRepository, teams: TeamsRepository) {
        this._orgs = orgs;
        this._dashboard = dashboard;
        this._control = control;
        this._teams = teams;
    }

    async get(token: string): Promise<GettingStartedDTO> {
        const { orgs } = await this._orgs.get(token, { mine: true });
        let partial = false;

        const per_org = await this.map_limited(orgs, async (org: OrgListItemVO) => {
            const [realms, runs] = await Promise.allSettled([
                this._dashboard.realms(org.id, token),
                this._control.runs_for_org(org.id, token, 1),
            ]);
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
        const ref = (r: RealmRow | undefined | null): GettingStartedRealmRefDTO | null => (r ? { org_slug: r.org_slug, slug: r.slug } : null);

        // Team: probe realms (daemon realms first) until one has a roster entry.
        let team_realm: RealmRow | null = null;
        const probe = [...with_daemon, ...realms.filter((r) => !with_daemon.includes(r))].slice(0, GettingStartedService.MAX_TEAM_PROBES);
        for (const r of probe) {
            try {
                const res = await this._teams.get({ realm_id: r.id, limit: 1 }, token) as unknown as { total?: number; data?: { total?: number } };
                if (Number(res.data?.total ?? res.total ?? 0) > 0) { team_realm = r; break; }
            } catch {
                partial = true;
            }
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
