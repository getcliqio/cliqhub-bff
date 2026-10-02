import { describe, it, expect } from 'vitest';
import {
    to_overview_org_data, to_overview_error_org_data, to_overview_review_items, to_overview_run_items,
    sum_overview_counts, empty_overview_counts,
} from '../../../src/mappers/overview_mapper.js';

const ORG = { id: 'o1', slug: 'acme', display_name: '', role: 'owner', member_count: 1, scope_count: 1, status: 'active', owner: null, deleted_at: null } as any;

describe('overview mapper', () => {
    it('org card: pending reviews summed from realms, needs_you = pending + awaiting, realms newest first', () => {
        const o = to_overview_org_data(ORG, { counts: { awaiting_input: 2, active_runs: 1, pending_reviews: 99 } }, {
            realms: [
                { id: 'r1', slug: 'a', name: '', last_activity_at: 1, pending_reviews: 3 },
                { id: 'r2', slug: 'b', name: 'B', last_activity_at: 5, pending_reviews: 1, runs: { awaiting_input: 2 } },
            ],
        });
        expect(o).toMatchObject({ display_name: 'acme', status: 'ok', error: null });
        expect(o.counts).toMatchObject({ pending_reviews: 4, awaiting_input: 2, needs_you: 6, active_runs: 1, failed_24h: 0 });
        expect(o.realms.map((r) => [r.slug, r.name, r.needs_you])).toEqual([['b', 'B', 3], ['a', 'a', 3]]);
    });

    it('error card has zero counts and no realms', () => {
        expect(to_overview_error_org_data(ORG, 'nope')).toMatchObject({ status: 'error', error: 'nope', realms: [], counts: empty_overview_counts() });
    });

    it('org cards carry the org\'s lifecycle state', () => {
        const waiting = { ...ORG, status: 'waiting_for_owner' };
        expect(to_overview_org_data(waiting, { counts: {} }, { realms: [] } as any)).toMatchObject({ org_status: 'waiting_for_owner', status: 'ok' });
        expect(to_overview_error_org_data(waiting, 'nope')).toMatchObject({ org_status: 'waiting_for_owner', status: 'error' });
    });

    it('reviews: only pending, with a fallback title; runs: awaiting_input → input', () => {
        const reviews = to_overview_review_items(ORG, [
            { review_id: 'x', phase: 'qa' },
            { review_id: 'y', status: 'approved' },
        ]);
        expect(reviews).toEqual([expect.objectContaining({ id: 'x', kind: 'review', title: 'Review qa', org_slug: 'acme', at: null })]);
        const runs = to_overview_run_items(ORG, [{ run_id: 'r', state: 'awaiting_input', started_at: 7 }, { run_id: 's', state: 'running', team_label: 'T' }]);
        expect(runs.map((r) => [r.kind, r.title, r.at])).toEqual([['input', 'r', 7], ['run', 'T', null]]);
    });

    it('sums counts', () => {
        const c = { ...empty_overview_counts(), needs_you: 1, daemons_total: 2 };
        expect(sum_overview_counts([c, c])).toMatchObject({ needs_you: 2, daemons_total: 4 });
    });
});
