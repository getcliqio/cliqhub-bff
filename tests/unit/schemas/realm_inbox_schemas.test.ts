import { describe, it, expect } from 'vitest';
import { realm_inbox_get_schema, run_detail_get_schema } from '../../../src/schemas/realm_inbox_schemas.js';

describe('realm_inbox_get_schema', () => {
    it('accepts org_slug + slug and trims', () => {
        expect(realm_inbox_get_schema.parse({ org_slug: ' acme ', slug: 'prod' })).toEqual({ org_slug: 'acme', slug: 'prod' });
    });
    it.each([{}, { org_slug: 'acme' }, { slug: 'prod' }, { org_slug: '', slug: 'prod' }, { org_slug: 'a', slug: 'b', realm_id: 'x' }])('rejects %j', (b) => {
        expect(realm_inbox_get_schema.safeParse(b).success).toBe(false);
    });
});

describe('run_detail_get_schema', () => {
    it('accepts a run id', () => {
        expect(run_detail_get_schema.parse({ run_id: 'r1' })).toEqual({ run_id: 'r1' });
    });
    it.each([{}, { run_id: '' }, { run_id: 'r', extra: 1 }, { run_id: 'x'.repeat(201) }])('rejects %j', (b) => {
        expect(run_detail_get_schema.safeParse(b).success).toBe(false);
    });
});
