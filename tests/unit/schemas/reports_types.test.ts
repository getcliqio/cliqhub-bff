import { describe, it, expect } from 'vitest';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';
import { ReportsAuditInput } from '../../../src/schemas/reports_types.js';

describe('ReportsAuditInput', () => {
    it('accepts empty object', () => {
        expect(ReportsAuditInput.safeParse({}).success).toBe(true);
    });

    it('accepts all filter params', () => {
        expect(ReportsAuditInput.safeParse({
            action: 'user.suspend', target_type: 'user', admin_id: hub_legacy_uuid(99), target_id: '5',
            since_ms: 0, until_ms: 1_700_000_000_000, limit: 10, offset: 0,
        }).success).toBe(true);
    });

    it('rejects limit over 100', () => {
        expect(ReportsAuditInput.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects limit of 0', () => {
        expect(ReportsAuditInput.safeParse({ limit: 0 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(ReportsAuditInput.safeParse({ offset: -1 }).success).toBe(false);
    });

    it('accepts offset of 0', () => {
        expect(ReportsAuditInput.safeParse({ offset: 0 }).success).toBe(true);
    });

    it('rejects non-uuid admin_id', () => {
        expect(ReportsAuditInput.safeParse({ admin_id: 0 }).success).toBe(false);
        expect(ReportsAuditInput.safeParse({ admin_id: 'admin' }).success).toBe(false);
    });

    it('accepts uuid admin_id', () => {
        expect(ReportsAuditInput.safeParse({ admin_id: hub_legacy_uuid(1) }).success).toBe(true);
    });

    it('rejects target_id over 200 chars', () => {
        expect(ReportsAuditInput.safeParse({ target_id: 'x'.repeat(201) }).success).toBe(false);
        expect(ReportsAuditInput.safeParse({ target_id: 'x'.repeat(200) }).success).toBe(true);
    });

    it('rejects negative or fractional time bounds', () => {
        expect(ReportsAuditInput.safeParse({ since_ms: -1 }).success).toBe(false);
        expect(ReportsAuditInput.safeParse({ until_ms: 1.5 }).success).toBe(false);
    });
});
