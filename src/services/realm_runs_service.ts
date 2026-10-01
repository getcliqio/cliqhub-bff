import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlRunVO } from '../types/vo.js';
import type { RealmRunsDTO, RealmRunRowDTO } from '../types/dto.js';
import type { RealmRunsGetInput } from '../schemas/realm_runs_schemas.js';
import { to_control_realm_dto } from '../types/mappers.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
type RunState = 'running' | 'awaiting_input' | 'completed' | 'failed' | 'cancelled' | 'crashed';

export function to_run_row(r: ControlRunVO): RealmRunRowDTO {
    return {
        run_id: r.run_id,
        run_name: r.run_name ?? null,
        team: r.team_label ?? r.team_id ?? null,
        state: r.state,
        current_phase: r.current_phase ?? null,
        daemon_id: r.daemon_id ?? null,
        started_at: r.started_at ?? null,
        completed_at: r.completed_at ?? null,
        updated_at: r.last_updated_at ?? null,
        error: r.error ?? null,
    };
}

/**
 * Realm › Runs. One page of runs (Core pages and filters) and the counts
 * behind the state chips, in one response.
 */
export class RealmRunsService {
    static readonly DEFAULT_LIMIT = 25;

    private _control: ControlRepository;
    private _now: () => number;

    constructor(control: ControlRepository, now: () => number = Date.now) {
        this._control = control;
        this._now = now;
    }

    async get(token: string, p: RealmRunsGetInput): Promise<RealmRunsDTO> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const realm_id = realm.id;
        const limit = p.limit ?? RealmRunsService.DEFAULT_LIMIT;
        const offset = p.offset ?? 0;
        const state: RunState | RunState[] | undefined = p.state === 'failed' ? ['failed', 'crashed'] : p.state;
        const week = this._now() - WEEK_MS;

        const count = (f: { state?: RunState | RunState[]; since_ms?: number }) =>
            this._control.runs({ realm_id, limit: 1, ...f }, token).then((x) => x.total);
        const [page, all, running, awaiting, failed] = await Promise.allSettled([
            this._control.runs({ realm_id, limit, offset, ...(state ? { state } : {}), ...(p.q ? { query: p.q } : {}), ...(p.since_ms ? { since_ms: p.since_ms } : {}) }, token),
            count({}),
            count({ state: 'running' }),
            count({ state: 'awaiting_input' }),
            count({ state: ['failed', 'crashed'], since_ms: week }),
        ]);
        if (page.status === 'rejected') throw page.reason;
        const n = (r: PromiseSettledResult<number>) => (r.status === 'fulfilled' ? r.value : null);

        return {
            realm: to_control_realm_dto(realm),
            items: page.value.items.map(to_run_row),
            total: page.value.total,
            offset,
            limit,
            counts: { all: n(all), running: n(running), awaiting_input: n(awaiting), failed_7d: n(failed) },
            partial: [all, running, awaiting, failed].some((r) => r.status === 'rejected'),
        };
    }
}
