import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountService } from '../../../src/services/account_service.js';

describe('AccountService', () => {
    const mock_repo = {
        update_profile: vi.fn(),
        change_password: vi.fn(),
    };

    const service = new AccountService(mock_repo as any);

    beforeEach(() => vi.clearAllMocks());

    describe('update_profile', () => {
        it('maps VO to DTO and strips suspended fields', async () => {
            mock_repo.update_profile.mockResolvedValue({
                user: {
                    id: 1, username: 'alice', display_name: 'Alice W', email: 'alice@test.com',
                    role: 'user', suspended_at: '2025-06-01', suspended_reason: 'spam', created_at: '2025-01-01',
                },
            });

            const dto = await service.update_profile({ display_name: 'Alice W' }, 'jwt');

            expect(dto.user.display_name).toBe('Alice W');
            expect(dto.user).not.toHaveProperty('suspended_at');
            expect(dto.user).not.toHaveProperty('suspended_reason');
        });
    });

    describe('change_password', () => {
        it('maps VO to DTO', async () => {
            mock_repo.change_password.mockResolvedValue({ message: 'Password changed' });

            const dto = await service.change_password(
                { current_password: 'old', new_password: 'newpass88' }, 'jwt',
            );

            expect(dto.message).toBe('Password changed');
        });
    });
});
