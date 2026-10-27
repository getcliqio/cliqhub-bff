import { describe, it, expect } from 'vitest';
import {
    to_overview_org_data, to_overview_error_org_data, to_overview_hug_items, to_overview_run_items,
    sum_overview_counts, empty_overview_counts,
} from '../../../src/mappers/overview_mapper.js';

const ORG = { id: 'o1', slug: 'acme', display_name: '', role: 'owner', member_count: 1, scope_count: 1, status: 'active', owner: null, deleted_at: null } as any;

describe('overview mapper', () => {
    it('org card: open Hugs summed from realms, needs_you = open Hugs (awaiting runs not counted again), realms newest first', () => {
        const o = to_overview_org_data(ORG, { counts: { awaiting_input: 2, active_runs: 1, open_hugs: 99 } }, {
            realms: [
                { id: 'r1', slug: 'a', name: '', last_activity_at: 1, open_hugs: 3 },
                { id: 'r2', slug: 'b', name: 'B', last_activity_at: 5, open_hugs: 1, runs: { awaiting_input: 2 } },
            ],
        } as any);
        expect(o).toMatchObject({ display_name: 'acme', status: 'ok', error: null });
        expect(o.counts).toMatchObject({ open_hugs: 4, awaiting_input: 2, needs_you: 4, active_runs: 1, failed_24h: 0 });
        expect(o.realms.map((r) => [r.slug, r.name, r.needs_you])).toEqual([['b', 'B', 1], ['a', 'a', 3]]);
    });

    it('error card has zero counts and no realms', () => {
        expect(to_overview_error_org_data(ORG, 'nope')).toMatchObject({ status: 'error', error: 'nope', realms: [], counts: empty_overview_counts() });
    });

    it('org cards carry the org\'s lifecycle state', () => {
        const waiting = { ...ORG, status: 'waiting_for_owner' };
        expect(to_overview_org_data(waiting, { counts: {} }, { realms: [] } as any)).toMatchObject({ org_status: 'waiting_for_owner', status: 'ok' });
        expect(to_overview_error_org_data(waiting, 'nope')).toMatchObject({ org_status: 'waiting_for_owner', status: 'error' });
    });

    it('Hugs: only open and unanswered, with a fallback title; runs: awaiting_input → input', () => {
        const hugs = to_overview_hug_items(ORG, [
            { hug_id: 'x', phase: 'qa', status: 'open' },
            { hug_id: 'y', status: 'closed' },
            { hug_id: 'z', status: 'open', responded: true },
        ] as any);
        expect(hugs).toEqual([expect.objectContaining({ id: 'x', kind: 'hug', title: 'Input for qa', org_slug: 'acme', state: 'open', at: null })]);
        const runs = to_overview_run_items(ORG, [{ run_id: 'r', state: 'awaiting_input', started_at: 7 }, { run_id: 's', state: 'running', team_label: 'T' }]);
        expect(runs.map((r) => [r.kind, r.title, r.at])).toEqual([['input', 'r', 7], ['run', 'T', null]]);
    });

    it('sums counts', () => {
        const c = { ...empty_overview_counts(), needs_you: 1, daemons_total: 2 };
        expect(sum_overview_counts([c, c])).toMatchObject({ needs_you: 2, daemons_total: 4 });
    });
});
