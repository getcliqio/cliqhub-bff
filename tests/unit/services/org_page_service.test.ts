import { describe, it, expect, vi } from 'vitest';
import { OrgPageService } from '../../../src/services/org_page_service.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

const ORG = {
    id: 'o1', slug: 'acme', display_name: 'Acme', created_at: '2026-01-01T00:00:00.000Z', my_role: 'admin',
    status: 'active', owner: { user_id: 'u1', username: 'alice', status: 'active' }, deleted_at: null, pending_owner_invite: null,
    members: [
        { user_id: 'u1', username: 'alice', display_name: 'Alice', email: 'alice@example.test', role: 'admin', role_id: 'r-owner', status: 'active', invited_at: null, joined_at: '2026-01-01T00:00:00.000Z', deleted_at: null },
        { user_id: 'u2', username: null, display_name: 'Priya', email: 'priya@example.test', role: 'member', role_id: 'r-member', status: 'pending', invited_at: '2026-10-02T00:00:00.000Z', joined_at: null, deleted_at: null },
        { user_id: 'u3', username: 'bob', display_name: 'Bob', email: 'bob@example.test', role: 'member', role_id: 'r-member', status: 'deleted', invited_at: null, joined_at: '2026-02-01T00:00:00.000Z', deleted_at: '2026-09-01T00:00:00.000Z' },
    ],
    roles: [], scopes: [], available_permissions: [], owner_only_permissions: ['org.delete', 'org.transfer', 'rules.manage'],
};

const INVITE = {
    invite_id: 'i1', email: 'priya@example.test', role: 'member', kind: 'org', status: 'pending',
    inviter: { id: 'u1', display_name: 'Alice' }, send_count: 2, last_sent_at: '2026-10-03', expires_at: '2026-10-16',
    deliveries: [{ kind: 'sent', sent_at: '2026-10-02', email_sent: true, provider_message_id: '<m@relay>' }],
    created_at: '2026-10-02',
};

describe('OrgPageService', () => {
    it('composes the org (members with status), pending invites and permissions in one read', async () => {
        const core = { post_body: vi.fn(async (p: string) => {
            if (p === '/v1/orgs/get_by_id') return { ok: true, data: ORG };
            if (p === '/v1/invitations/get') return { ok: true, data: { target_type: 'org', org_id: 'o1', invites: [INVITE], total: 1, page: 1, page_size: 100 } };
            return { ok: true, data: { permissions: ['org.settings'], owner_only: ['org.delete', 'org.transfer', 'rules.manage'] } };
        }) } as any;
        const dto = await new OrgPageService(new CoreReadRepository(core)).get({ org_id: 'o1' }, 'tok');
        expect(dto.org).toMatchObject({ id: 'o1', status: 'active', owner: { username: 'alice' }, deleted_at: null });
        expect(dto.org.members.map((m) => [m.username, m.status])).toEqual([['alice', 'active'], [null, 'pending'], ['bob', 'deleted']]);
        expect(dto.invites).toEqual([INVITE]);
        expect(dto.permissions).toEqual({ all: ['org.settings'], owner_only: ['org.delete', 'org.transfer', 'rules.manage'] });
        expect(dto.partial).toBe(false);
        expect(core.post_body.mock.calls.find((c: any[]) => c[0] === '/v1/invitations/get')[1])
            .toEqual({ target_type: 'org', org_id: 'o1', status: 'pending', sort: '-created_at', page: 1, page_size: 100 });
    });
    it('invites/permissions failing leaves the page usable (partial)', async () => {
        const core = { post_body: vi.fn(async (p: string) => { if (p === '/v1/orgs/get_by_id') return { ok: true, data: ORG }; throw new Error('403'); }) } as any;
        const dto = await new OrgPageService(new CoreReadRepository(core)).get({ org_id: 'o1' }, 'tok');
        expect(dto).toMatchObject({ invites: null, permissions: null, partial: true });
    });
    it('the org itself failing fails the page', async () => {
        const core = { post_body: vi.fn(async () => { throw new Error('404'); }) } as any;
        await expect(new OrgPageService(new CoreReadRepository(core)).get({ org_id: 'o1' }, 'tok')).rejects.toThrow('404');
    });
});
