import { describe, it, expect } from 'vitest';
import { overview_get_schema } from '../../../src/schemas/overview_schemas.js';

describe('overview_get_schema', () => {
    it('accepts an empty body', () => {
        expect(overview_get_schema.parse({})).toEqual({});
    });
    it('accepts a list of org UUIDs', () => {
        const id = '11111111-1111-4111-8111-111111111111';
        expect(overview_get_schema.parse({ org_ids: [id] })).toEqual({ org_ids: [id] });
    });
    it.each([
        [{ org_ids: [] }],
        [{ org_ids: ['not-a-uuid'] }],
        [{ org_id: '11111111-1111-4111-8111-111111111111' }],
        [{ org_ids: Array.from({ length: 51 }, () => '11111111-1111-4111-8111-111111111111') }],
    ])('rejects %j', (body) => {
        expect(overview_get_schema.safeParse(body).success).toBe(false);
    });
});
