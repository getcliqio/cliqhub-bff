import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import {
    drafts_get_schema, drafts_get_by_id_schema,
    drafts_new_schema, drafts_update_schema, drafts_delete_schema,
} from '../../../src/schemas/drafts_schemas.js';

describe('drafts_get_schema', () => {
    it('accepts empty body', () => {
        expect(drafts_get_schema.safeParse({}).success).toBe(true);
    });
});

describe('drafts_get_by_id_schema', () => {
    it('accepts valid id', () => {
        expect(drafts_get_by_id_schema.safeParse({ id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects non-positive id', () => {
        expect(drafts_get_by_id_schema.safeParse({ id: 0 }).success).toBe(false);
        expect(drafts_get_by_id_schema.safeParse({ id: -1 }).success).toBe(false);
    });

    it('rejects missing id', () => {
        expect(drafts_get_by_id_schema.safeParse({}).success).toBe(false);
    });

    it('rejects non-integer id', () => {
        expect(drafts_get_by_id_schema.safeParse({ id: 1.5 }).success).toBe(false);
    });
});

describe('drafts_new_schema', () => {
    it('accepts team_json only', () => {
        expect(drafts_new_schema.safeParse({ team_json: '{}' }).success).toBe(true);
    });

    it('accepts with title', () => {
        const r = drafts_new_schema.safeParse({ title: 'My Draft', team_json: '{}' });
        expect(r.success).toBe(true);
    });

    it('rejects empty team_json', () => {
        expect(drafts_new_schema.safeParse({ team_json: '' }).success).toBe(false);
    });

    it('rejects missing team_json', () => {
        expect(drafts_new_schema.safeParse({}).success).toBe(false);
    });
});

describe('drafts_update_schema', () => {
    it('accepts id and team_json', () => {
        expect(drafts_update_schema.safeParse({ id: hub_legacy_uuid(5), team_json: '{}' }).success).toBe(true);
    });

    it('accepts with id, title, and team_json', () => {
        const r = drafts_update_schema.safeParse({ id: hub_legacy_uuid(5), title: 'My Draft', team_json: '{}' });
        expect(r.success).toBe(true);
    });

    it('rejects empty team_json', () => {
        expect(drafts_update_schema.safeParse({ id: hub_legacy_uuid(5), team_json: '' }).success).toBe(false);
    });

    it('rejects missing team_json', () => {
        expect(drafts_update_schema.safeParse({ id: hub_legacy_uuid(5) }).success).toBe(false);
    });
});

describe('drafts_delete_schema', () => {
    it('accepts valid id', () => {
        expect(drafts_delete_schema.safeParse({ id: hub_legacy_uuid(3) }).success).toBe(true);
    });

    it('rejects non-positive id', () => {
        expect(drafts_delete_schema.safeParse({ id: 0 }).success).toBe(false);
    });

    it('rejects missing id', () => {
        expect(drafts_delete_schema.safeParse({}).success).toBe(false);
    });
});
