import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationsService } from '../../../src/services/invitations_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INVITE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ACCEPTED = {
    decision: 'accept' as const,
    user: { id: USER_ID, username: 'priya', status: 'active', created: true },
    org: { id: ORG_ID, slug: 'measureone' },
    realm: null,
    membership: { role: 'member', status: 'active' },
};

const ITEM = {
    invite_id: INVITE_ID, email: 'priya@example.test', role: 'member', kind: 'org', status: 'pending',
    inviter: { id: USER_ID, display_name: 'Sapan' }, send_count: 2, last_sent_at: '2026-10-03T00:00:00Z',
    expires_at: '2026-10-16T10:20:00Z', created_at: '2026-10-02T10:20:00Z',
    deliveries: [{ kind: 'sent', sent_at: '2026-10-02T10:20:00Z', email_sent: true, provider_message_id: '<m1@relay>' }],
};

describe('InvitationsService', () => {
    const mock_repo = {
        create: vi.fn(),
        get: vi.fn(),
        get_by_id: vi.fn(),
        revoke: vi.fn(),
        get_by_token: vi.fn(),
        accept: vi.fn(),
    };
    const mock_session_service = {
        create_from_backend_token: vi.fn(),
    };

    let service: InvitationsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new InvitationsService(mock_repo as any, mock_session_service as any);
    });

    describe('accept', () => {
        it('accept: creates a session from the PAT Core returns and strips the token', async () => {
            mock_repo.accept.mockResolvedValue({ ...ACCEPTED, token: 'cliq_tok_new_user' });
            const created = { session_id: 'sid-9', target_token: 'cliq_tok_new_user', login: { user: { id: USER_ID } } };
            mock_session_service.create_from_backend_token.mockResolvedValue(created);
            const input = { token: 'invite-token', decision: 'accept' as const, username: 'priya', password: 'secret123' };

            const result = await service.accept(input);

            expect(mock_repo.accept).toHaveBeenCalledWith(input, undefined);
            expect(mock_session_service.create_from_backend_token).toHaveBeenCalledWith('cliq_tok_new_user');
            expect(result).toEqual({ decision: 'accept', accepted: ACCEPTED, session: created });
            expect(JSON.stringify(result.decision === 'accept' && result.accepted)).not.toContain('cliq_tok_new_user');
        });

        it('accept: no session when Core returns no token (signed-in caller)', async () => {
            mock_repo.accept.mockResolvedValue(ACCEPTED);

            const result = await service.accept({ token: 'invite-token', decision: 'accept' }, 'cliq_tok_caller');

            expect(mock_repo.accept).toHaveBeenCalledWith({ token: 'invite-token', decision: 'accept' }, 'cliq_tok_caller');
            expect(mock_session_service.create_from_backend_token).not.toHaveBeenCalled();
            expect(result).toEqual({ decision: 'accept', accepted: ACCEPTED, session: null });
        });

        it('accept: an empty token is no token', async () => {
            mock_repo.accept.mockResolvedValue({ ...ACCEPTED, token: '' });

            const result = await service.accept({ token: 'invite-token', decision: 'accept' }, 'cliq_tok_caller');

            expect(mock_session_service.create_from_backend_token).not.toHaveBeenCalled();
            expect(result).toEqual({ decision: 'accept', accepted: ACCEPTED, session: null });
        });

        it('decline: never creates a session, even if Core sent a token', async () => {
            mock_repo.accept.mockResolvedValue({ decision: 'decline', token: 'cliq_tok_x' });

            const result = await service.accept({ token: 'invite-token', decision: 'decline' });

            expect(result).toEqual({ decision: 'decline' });
            expect(mock_session_service.create_from_backend_token).not.toHaveBeenCalled();
        });

        it('propagates session creation failures', async () => {
            mock_repo.accept.mockResolvedValue({ ...ACCEPTED, token: 'cliq_tok_new_user' });
            mock_session_service.create_from_backend_token.mockRejectedValue(new Error('identity down'));

            await expect(service.accept({ token: 'invite-token', decision: 'accept' })).rejects.toThrow('identity down');
        });

        it.each([
            ['expired', 410, { expired_at: '2026-10-16T10:20:00Z' }],
            ['not_pending', 409, { status: 'accepted' }],
            ['sign_in_required', 401, { invitee_email: 'priya@example.test' }],
            ['email_mismatch', 403, { invitee_email: 'priya@example.test' }],
        ])('passes Core %s through unchanged', async (code, status, details) => {
            const err = new ApiError(code, code, status, details);
            mock_repo.accept.mockRejectedValue(err);
            await expect(service.accept({ token: 'invite-token', decision: 'accept' })).rejects.toBe(err);
        });
    });

    describe('create', () => {
        it('forwards role owner and reactivate; maps resent / email_sent / invite_url', async () => {
            const vo = {
                invite_id: INVITE_ID, status: 'pending', email: 'priya@example.test', role: 'owner',
                expires_at: '2026-10-16T10:20:00Z', resent: true, email_sent: false, invite_url: 'https://app.example.test/invite/x',
            };
            mock_repo.create.mockResolvedValue(vo);
            const input = { target_type: 'org' as const, org_id: ORG_ID, email: 'priya@example.test', role: 'owner' as const, reactivate: true };

            const data = await service.create(input, 'tok');

            expect(mock_repo.create).toHaveBeenCalledWith(input, 'tok');
            expect(data).toEqual(vo);
            expect(data).not.toHaveProperty('token');
        });

        it('drops a token Core might still send', async () => {
            mock_repo.create.mockResolvedValue({
                invite_id: INVITE_ID, status: 'pending', email: 'e@example.test', role: 'member',
                expires_at: 'x', resent: false, email_sent: true, invite_url: null, token: 'secret',
            });
            const data = await service.create({ target_type: 'org', org_id: ORG_ID, email: 'e@example.test' }, 'tok');
            expect(data).not.toHaveProperty('token');
        });
    });

    describe('get', () => {
        it('derives target_type from org_id and forwards status / query / sort / page', async () => {
            mock_repo.get.mockResolvedValue({ target_type: 'org', org_id: ORG_ID, invites: [ITEM], total: 26, page: 2, page_size: 25 });

            const data = await service.get({ org_id: ORG_ID, status: 'pending', query: 'priya', sort: '-created_at', page: 2, page_size: 25 }, 'tok');

            expect(mock_repo.get).toHaveBeenCalledWith(
                { target_type: 'org', org_id: ORG_ID, status: 'pending', query: 'priya', sort: '-created_at', page: 2, page_size: 25 }, 'tok',
            );
            expect(data).toEqual({ target_type: 'org', org_id: ORG_ID, invites: [ITEM], total: 26, page: 2, page_size: 25 });
        });

        it('derives target_type realm from realm_id', async () => {
            mock_repo.get.mockResolvedValue({ target_type: 'realm', realm_id: 'r1', invites: [], total: 0, page: 1, page_size: 25 });
            await service.get({ realm_id: 'r1' }, 'tok');
            expect(mock_repo.get).toHaveBeenCalledWith({ target_type: 'realm', realm_id: 'r1' }, 'tok');
        });
    });

    describe('one-invite calls', () => {
        it('get_by_id maps the invite', async () => {
            mock_repo.get_by_id.mockResolvedValue({ target_type: 'org', org_id: ORG_ID, invite: ITEM });
            const data = await service.get_by_id({ invite_id: INVITE_ID }, 'tok');
            expect(mock_repo.get_by_id).toHaveBeenCalledWith({ invite_id: INVITE_ID }, 'tok');
            expect(data.invite).toEqual(ITEM);
        });

        it('revoke maps { invite_id, status }', async () => {
            mock_repo.revoke.mockResolvedValue({ invite_id: INVITE_ID, status: 'revoked' });
            const data = await service.revoke({ invite_id: INVITE_ID }, 'tok');
            expect(mock_repo.revoke).toHaveBeenCalledWith({ invite_id: INVITE_ID }, 'tok');
            expect(data).toEqual({ invite_id: INVITE_ID, status: 'revoked' });
        });

        it('get_by_token maps the preview, signed out', async () => {
            const vo = {
                invite_id: INVITE_ID, kind: 'org', status: 'pending',
                org: { slug: 'measureone', display_name: 'MeasureOne' }, realm: null, role: 'member',
                inviter: { display_name: 'Sapan' }, invitee_email: 'priya@example.test', account_exists: false,
                expires_at: '2026-10-16T10:20:00Z',
            };
            mock_repo.get_by_token.mockResolvedValue(vo);
            const data = await service.get_by_token({ token: 'invite-token' });
            expect(mock_repo.get_by_token).toHaveBeenCalledWith({ token: 'invite-token' }, undefined);
            expect(data).toEqual(vo);
        });
    });
});
