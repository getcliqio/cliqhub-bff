import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../../../src/services/reports_service.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

describe('ReportsService', () => {
    const mock_repo = { audit: vi.fn() };
    const service = new ReportsService(mock_repo as any);

    beforeEach(() => vi.resetAllMocks());

    describe('audit', () => {
        it('forwards filters and maps entries with pagination', async () => {
            mock_repo.audit.mockResolvedValue({
                entries: [
                    { id: 1, admin_id: hub_legacy_uuid(99), admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' },
                ],
                total: 1, limit: 50, offset: 0,
            });

            const data = await service.audit({ action: 'user.suspend' }, 'jwt');

            expect(mock_repo.audit).toHaveBeenCalledWith({ action: 'user.suspend' }, 'jwt');
            expect(data.entries).toHaveLength(1);
            expect(data.entries[0].action).toBe('user.suspend');
            expect(data.entries[0].admin_username).toBe('admin');
            expect(data).toMatchObject({ total: 1, limit: 50, offset: 0 });
        });

        it('handles an empty page', async () => {
            mock_repo.audit.mockResolvedValue({ entries: [], total: 0, limit: 50, offset: 0 });

            const data = await service.audit({}, 'jwt');

            expect(data).toEqual({ entries: [], total: 0, limit: 50, offset: 0 });
        });
    });
});
