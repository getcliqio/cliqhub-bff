import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { RealmTeamsDTO, RealmTeamRowDTO } from '../types/dto.js';
import type { RealmTeamsGetInput } from '../schemas/realm_teams_schemas.js';
import { to_control_realm_dto } from '../types/mappers.js';

type Coverage_row = {
    slug?: string; name?: string; label?: string; version?: string | null; origin?: 'published' | 'local';
    in_team_list?: boolean; installed_count?: number; online_daemon_count?: number;
    last_run_at?: number | null; missing_agents?: string[]; sample_team_id?: string | null;
};

/** `@scope/slug` → { scope, slug } (Core's realm coverage rows carry the label, not the scope). */
export function parse_label(label: string | undefined, fallback_slug: string): { scope: string | null; slug: string } {
    const m = /^@?([^/]+)\/(.+)$/.exec(label ?? '');
    return m ? { scope: m[1], slug: m[2] } : { scope: null, slug: fallback_slug };
}

/** True when `latest` is a higher dotted version than `current`. */
export function is_newer(latest: string | null | undefined, current: string | null | undefined): boolean {
    if (!latest || !current || latest === current) return false;
    const parse = (v: string) => v.replace(/^v/, '').split(/[.+-]/).map((x) => Number.parseInt(x, 10));
    const a = parse(latest);
    const b = parse(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = Number.isFinite(a[i]) ? a[i] : 0;
        const y = Number.isFinite(b[i]) ? b[i] : 0;
        if (x !== y) return x > y;
    }
    return false;
}

function rows_of(res: unknown): { items: Coverage_row[]; total: number } {
    const r = res as { data?: { items?: Coverage_row[]; rows?: Coverage_row[]; total?: number }; items?: Coverage_row[]; total?: number };
    const payload = r?.data ?? r;
    const items = (payload as { items?: Coverage_row[] }).items ?? (payload as { rows?: Coverage_row[] }).rows ?? [];
    const total = typeof (payload as { total?: number }).total === 'number' ? (payload as { total: number }).total : items.length;
    return { items, total };
}

async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

/**
 * Realm › Teams. One page of the realm's teams (with daemon coverage),
 * chip counts, and whether a newer published version exists — one response.
 */
export class RealmTeamsService {
    static readonly DEFAULT_LIMIT = 25;

    private _control: ControlRepository;
    private _teams: TeamsRepository;

    constructor(control: ControlRepository, teams: TeamsRepository) {
        this._control = control;
        this._teams = teams;
    }

    async get(token: string, p: RealmTeamsGetInput): Promise<RealmTeamsDTO> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const limit = p.limit ?? RealmTeamsService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const list = (f: Record<string, unknown>) => this._teams.get({ realm_id, sort_by: 'team', sort_dir: 'asc', ...f } as never, token).then(rows_of);

        const [page, all, full, partial, none] = await Promise.allSettled([
            list({ limit, offset, ...(p.q ? { query: p.q } : {}), ...(p.coverage ? { coverage: p.coverage } : {}) }),
            list({ limit: 1 }),
            list({ limit: 1, coverage: 'full' }),
            list({ limit: 1, coverage: 'partial' }),
            list({ limit: 1, coverage: 'none' }),
        ]);
        if (page.status === 'rejected') throw page.reason;
        const n = (r: PromiseSettledResult<{ total: number }>) => (r.status === 'fulfilled' ? r.value.total : null);

        const base = page.value.items.map((r) => {
            const { scope, slug } = parse_label(r.label, r.slug ?? r.name ?? '');
            return { r, scope, slug };
        });
        // Latest published version, for "update available" (published teams only).
        const latest = await map_limited(base, 6, async ({ r, scope, slug }) => {
            if (r.origin !== 'published' || !scope) return null;
            try {
                const v = await this._teams.get_versions({ name: slug, scope, latest_only: true });
                return v?.version ?? null;
            } catch {
                return null;
            }
        });

        const items: RealmTeamRowDTO[] = base.map(({ r, scope, slug }, i) => ({
            scope,
            slug,
            label: r.label ?? (scope ? `@${scope}/${slug}` : slug),
            version: r.version ?? null,
            latest_version: latest[i],
            update_available: is_newer(latest[i], r.version),
            origin: r.origin ?? 'local',
            in_team_list: Boolean(r.in_team_list),
            installed_count: r.installed_count ?? 0,
            online_daemon_count: r.online_daemon_count ?? 0,
            last_run_at: r.last_run_at ?? null,
            missing_agents: r.missing_agents ?? [],
        }));

        return {
            realm: to_control_realm_dto(realm),
            items,
            total: page.value.total,
            offset,
            limit,
            counts: { all: n(all), full: n(full), partial: n(partial), none: n(none) },
            partial: [all, full, partial, none].some((r) => r.status === 'rejected'),
        };
    }
}
