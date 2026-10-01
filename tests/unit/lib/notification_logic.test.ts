import { describe, it, expect } from 'vitest';
import { destination_label, matching_selectors, resolve_event, selectors_overlap } from '../../../src/lib/notification_logic.js';

describe('notification_logic', () => {
    it('matching selectors mirror Core (exact, family, *)', () => {
        expect(matching_selectors('phase.escalated')).toEqual(['phase.escalated', 'phase.*', '*']);
    });
    it.each([
        ['run.failed', 'run.failed', true], ['run.*', 'run.failed', true], ['*', 'hug.review_requested', true],
        ['run.*', 'phase.*', false], ['run.failed', 'run.crashed', false], ['run.*', 'run.*', true],
    ])('overlap(%s, %s) = %s', (a, b, want) => {
        expect(selectors_overlap(a, b)).toBe(want);
        expect(selectors_overlap(b, a)).toBe(want);
    });
    it('the most specific tier with any match wins; all its matches fire', () => {
        const rules = [
            { id: 'o1', event: 'run.failed', channel_id: 'c-org', tier: 'org' as const },
            { id: 'r1', event: 'run.*', channel_id: 'c-realm', tier: 'realm' as const },
            { id: 'r2', event: 'run.failed', channel_id: 'c-realm2', tier: 'realm' as const },
        ];
        const res = resolve_event('run.failed', rules);
        expect(res.winners.map((r) => r.id)).toEqual(['r1', 'r2']);
        expect(res.replaced.map((r) => r.id)).toEqual(['o1']);
        expect(resolve_event('phase.failed', rules)).toEqual({ winners: [], replaced: [] });
    });
    it('labels destinations without leaking secrets', () => {
        expect(destination_label({ type: 'slack', webhook_url: 'https://hooks.slack.com/services/T/B/abcd1234' })).toBe('Slack webhook ••••1234');
        expect(destination_label({ type: 'email', address: 'ops@acme.com' })).toBe('ops@acme.com');
        expect(destination_label({ type: 'webhook', url: 'https://events.pagerduty.com/v2/enqueue', headers: { Authorization: 'x' } })).toBe('Webhook · events.pagerduty.com');
        expect(destination_label({ type: 'cliqhub' })).toBe('In-app (CliqHub)');
    });
});
