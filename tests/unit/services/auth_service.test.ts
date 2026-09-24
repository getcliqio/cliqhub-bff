import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth_service.js';

describe('AuthService', () => {
    const mock_auth_repo = {
        new_token: vi.fn(),
        revoke_token: vi.fn(),
        list_tokens: vi.fn(),
        rotate_token: vi.fn(),
    };

    let service: AuthService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new AuthService(mock_auth_repo as any);
    });

    describe('new_token', () => {
        it('delegates to auth_repo and returns DTO', async () => {
            mock_auth_repo.new_token.mockResolvedValue({
                token: 'cliq_tok_abc', name: 'CI', id: 9, realm_ids: [],
            });

            const dto = await service.new_token(
                { type: 'user', name: 'CI', permissions: { org: 'acme' } },
                'cliq_tok_session',
            );

            expect(mock_auth_repo.new_token).toHaveBeenCalledWith(
                { type: 'user', name: 'CI', permissions: { org: 'acme' } },
                'cliq_tok_session',
            );
            expect(dto).toEqual({
                token: 'cliq_tok_abc', name: 'CI', id: 9, realm_ids: [],
            });
        });

        it('maps a2a mint response with realm_id', async () => {
            mock_auth_repo.new_token.mockResolvedValue({
                token: 'cliq_tok_a2a',
                bearer: 'cliq_tok_a2a',
                name: 'a2a',
                realm_id: 'realm-1',
                has_bearer: true,
                bearer_prefix: 'cliq_tok_',
            });

            const dto = await service.new_token(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );

            expect(mock_auth_repo.new_token).toHaveBeenCalledWith(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(dto).toEqual({
                token: 'cliq_tok_a2a',
                bearer: 'cliq_tok_a2a',
                name: 'a2a',
                realm_id: 'realm-1',
                realm_ids: ['realm-1'],
                has_bearer: true,
                bearer_prefix: 'cliq_tok_',
            });
        });
    });

    describe('revoke_token', () => {
        it('delegates to auth_repo', async () => {
            mock_auth_repo.revoke_token.mockResolvedValue({ deleted: true });
            const dto = await service.revoke_token(
                { type: 'user', token_id: 5 },
                'cliq_tok_session',
            );
            expect(mock_auth_repo.revoke_token).toHaveBeenCalledWith(
                { type: 'user', token_id: 5 },
                'cliq_tok_session',
            );
            expect(dto.deleted).toBe(true);
        });
    });

    describe('list_tokens', () => {
        it('delegates to auth_repo', async () => {
            mock_auth_repo.list_tokens.mockResolvedValue({
                tokens: [
                    { id: 1, name: 'CLI', created_at: '2025-01-01', last_used_at: null },
                ],
            });
            const dto = await service.list_tokens(
                { type: 'user', limit: 50, offset: 0 },
                'cliq_tok_session',
            );
            expect(dto.tokens).toHaveLength(1);
        });
    });

    describe('rotate_token', () => {
        it('delegates to auth_repo with opts object', async () => {
            mock_auth_repo.rotate_token.mockResolvedValue({ token: 'cliq_tok_rotated' });
            const dto = await service.rotate_token(
                { type: 'user', token_id: 5 },
                'cliq_tok_session',
            );
            expect(mock_auth_repo.rotate_token).toHaveBeenCalledWith(
                { type: 'user', token_id: 5 },
                'cliq_tok_session',
            );
            expect(dto).toEqual({ token: 'cliq_tok_rotated' });
        });

        it('maps a2a rotate response with realm_id', async () => {
            mock_auth_repo.rotate_token.mockResolvedValue({
                token: 'cliq_tok_a2a_new',
                bearer: 'cliq_tok_a2a_new',
                realm_id: 'realm-1',
                has_bearer: true,
                bearer_prefix: 'cliq_tok_',
            });
            const dto = await service.rotate_token(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(mock_auth_repo.rotate_token).toHaveBeenCalledWith(
                { type: 'a2a', realm_id: 'realm-1' },
                'cliq_tok_session',
            );
            expect(dto).toEqual({
                token: 'cliq_tok_a2a_new',
                bearer: 'cliq_tok_a2a_new',
                type: 'a2a',
                realm_id: 'realm-1',
                has_bearer: true,
                bearer_prefix: 'cliq_tok_',
            });
        });
    });
});
