import { describe, it, expect } from 'vitest';
import { OverviewGetInput } from '../../../src/schemas/overview_types.js';
import { GettingStartedGetInput } from '../../../src/schemas/getting_started_types.js';
import { InboxGetInput } from '../../../src/schemas/inbox_types.js';

describe('OverviewGetInput', () => {
    it('accepts an empty body', () => {
        expect(OverviewGetInput.parse({})).toEqual({});
    });
    it('accepts a list of org UUIDs', () => {
        const id = '11111111-1111-4111-8111-111111111111';
        expect(OverviewGetInput.parse({ org_ids: [id] })).toEqual({ org_ids: [id] });
    });
    it.each([
        [{ org_ids: [] }],
        [{ org_ids: ['not-a-uuid'] }],
        [{ org_id: '11111111-1111-4111-8111-111111111111' }],
        [{ org_ids: Array.from({ length: 51 }, () => '11111111-1111-4111-8111-111111111111') }],
    ])('rejects %j', (body) => {
        expect(OverviewGetInput.safeParse(body).success).toBe(false);
    });
});

describe('GettingStartedGetInput', () => {
    it('accepts only an empty body', () => {
        expect(GettingStartedGetInput.parse({})).toEqual({});
        expect(GettingStartedGetInput.safeParse({ x: 1 }).success).toBe(false);
    });
});

describe('InboxGetInput', () => {
    it('accepts filters and a cursor', () => {
        const body = { org_id: '11111111-1111-4111-8111-111111111111', types: ['run.failed'], q: 'x', until_ms: 5, limit: 10 };
        expect(InboxGetInput.parse(body)).toEqual(body);
    });
    it.each([[{ limit: 101 }], [{ org_id: 'nope' }], [{ unknown: 1 }]])('rejects %j', (body) => {
        expect(InboxGetInput.safeParse(body).success).toBe(false);
    });
});
