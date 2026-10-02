import { describe, it, expect } from 'vitest';
import { RealmInboxGetInput } from '../../../src/schemas/realm_inbox_types.js';
import { RunDetailGetInput } from '../../../src/schemas/run_detail_types.js';

describe('RealmInboxGetInput', () => {
    it('accepts org_slug + slug and trims', () => {
        expect(RealmInboxGetInput.parse({ org_slug: ' acme ', slug: 'prod' })).toEqual({ org_slug: 'acme', slug: 'prod' });
    });
    it.each([{}, { org_slug: 'acme' }, { slug: 'prod' }, { org_slug: '', slug: 'prod' }, { org_slug: 'a', slug: 'b', realm_id: 'x' }])('rejects %j', (b) => {
        expect(RealmInboxGetInput.safeParse(b).success).toBe(false);
    });
});

describe('RunDetailGetInput', () => {
    it('accepts a run id', () => {
        expect(RunDetailGetInput.parse({ run_id: 'r1' })).toEqual({ run_id: 'r1' });
    });
    it.each([{}, { run_id: '' }, { run_id: 'r', extra: 1 }, { run_id: 'x'.repeat(201) }])('rejects %j', (b) => {
        expect(RunDetailGetInput.safeParse(b).success).toBe(false);
    });
});
