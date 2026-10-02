import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsRepository } from '../../../src/repositories/reports_repository.js';
import { hub_legacy_uuid } from '../../helpers/hub_legacy_uuid.js';

describe('ReportsRepository', () => {
    const mock_client = { post: vi.fn(), get: vi.fn() };
    const repo = new ReportsRepository(mock_client as any);

    beforeEach(() => vi.resetAllMocks());

    describe('audit', () => {
        it('calls POST /internal/reports/audit with params and token', async () => {
            mock_client.post.mockResolvedValue({
                entries: [{ id: 1, admin_id: hub_legacy_uuid(99), admin_username: 'admin', action: 'user.suspend', target_type: 'user', target_id: '5', details: '{}', created_at: '2025-06-01' }],
                total: 1, limit: 50, offset: 0,
            });

            const result = await repo.audit({ action: 'user.suspend', limit: 10 }, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/reports/audit', { action: 'user.suspend', limit: 10 }, 'jwt-abc');
            expect(result.entries).toHaveLength(1);
        });

        it('passes empty params when no filters', async () => {
            mock_client.post.mockResolvedValue({ entries: [], total: 0, limit: 50, offset: 0 });

            await repo.audit({}, 'jwt-abc');

            expect(mock_client.post).toHaveBeenCalledWith('/internal/reports/audit', {}, 'jwt-abc');
        });
    });
});
