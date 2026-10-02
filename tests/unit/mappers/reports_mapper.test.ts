import { describe, it, expect } from 'vitest';
import { to_audit_log_entry_data, to_reports_audit_data } from '../../../src/mappers/reports_mapper.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

const ENTRY = {
    id: 1, admin_id: hub_legacy_uuid(99), admin_username: 'admin', action: 'user.suspend',
    target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01',
};

describe('to_audit_log_entry_data', () => {
    it('copies every field', () => {
        const data = to_audit_log_entry_data(ENTRY);
        expect(data).toEqual(ENTRY);
        expect(data).not.toBe(ENTRY);
    });
});

describe('to_reports_audit_data', () => {
    it('maps entries and pagination', () => {
        const data = to_reports_audit_data({ entries: [ENTRY], total: 1, limit: 50, offset: 0 });
        expect(data.entries).toHaveLength(1);
        expect(data.entries[0].action).toBe('user.suspend');
        expect(data).toMatchObject({ total: 1, limit: 50, offset: 0 });
    });

    it('handles empty entries', () => {
        const data = to_reports_audit_data({ entries: [], total: 0, limit: 50, offset: 0 });
        expect(data.entries).toHaveLength(0);
    });
});
