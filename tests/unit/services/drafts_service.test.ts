import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftsService } from '../../../src/services/drafts_service.js';

describe('DraftsService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_by_id: vi.fn(),
        new_draft: vi.fn(),
        update: vi.fn(),
        delete_draft: vi.fn(),
    };

    let service: DraftsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new DraftsService(mock_repo as any);
    });

    describe('get', () => {
        it('maps list VO to DTO', async () => {
            mock_repo.get.mockResolvedValue({
                drafts: [{ id: 1, title: 'Draft', updated_at: '2025-01-01' }],
            });

            const dto = await service.get('jwt');

            expect(dto.drafts).toHaveLength(1);
            expect(dto.drafts[0].id).toBe(1);
        });
    });

    describe('get_by_id', () => {
        it('maps detail VO to DTO and strips user_id', async () => {
            mock_repo.get_by_id.mockResolvedValue({
                id: 1, user_id: 42, title: 'Draft',
                team_json: '{}', created_at: '2025-01-01', updated_at: '2025-01-01',
            });

            const dto = await service.get_by_id({ id: 1 }, 'jwt');

            expect(dto.id).toBe(1);
            expect(dto.title).toBe('Draft');
            expect(dto).not.toHaveProperty('user_id');
        });
    });

    describe('new_draft', () => {
        it('maps new draft VO to DTO', async () => {
            mock_repo.new_draft.mockResolvedValue({ id: 42 });

            const dto = await service.new_draft({ team_json: '{}' }, 'jwt');

            expect(dto.id).toBe(42);
        });
    });

    describe('update', () => {
        it('maps update VO to DTO', async () => {
            mock_repo.update.mockResolvedValue({ id: 5 });

            const dto = await service.update({ id: 5, team_json: '{}' }, 'jwt');

            expect(dto.id).toBe(5);
        });
    });

    describe('delete_draft', () => {
        it('maps delete VO to DTO', async () => {
            mock_repo.delete_draft.mockResolvedValue({ deleted: true });

            const dto = await service.delete_draft({ id: 3 }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });
});
