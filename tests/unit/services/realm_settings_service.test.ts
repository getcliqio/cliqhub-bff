import { describe, it, expect, vi } from 'vitest';
import { RealmSettingsService } from '../../../src/services/realm_settings_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

function mocks() {
    return {
        control: {
            realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }),
            realm_members: vi.fn().mockResolvedValue([
                { member_type: 'user', member_id: 'u1', username: 'sapan', role: 'admin' },
                { member_type: 'user', member_id: 'u2', username: 'lena', role: 'member' },
                { member_type: 'daemon', member_id: 'd1', username: null, role: 'member' },
            ]),
        },
        tokens: { get: vi.fn().mockResolvedValue({ tokens: [{ id: 7, name: 'ci', permissions: {}, created_at: '2026-01-01', last_used_at: null }], total: 1 }) },
        invites: { get: vi.fn().mockResolvedValue({ target_type: 'realm', realm_id: 'r1', invites: [{ invite_id: 'i1', email: 'new@x.com', role: 'operator', kind: 'realm', status: 'pending', expires_at: '2026-10-10' }] }) },
    };
}

describe('RealmSettingsService', () => {
    it('realm, people (no daemons), invites and tokens; viewer role', async () => {
        const m = mocks();
        const dto = await new RealmSettingsService(m.control as any, m.tokens as any, m.invites as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok', { user_id: 'u1', site_admin: false });
        expect(m.tokens.get).toHaveBeenCalledWith({ type: 'realm', realm_id: 'r1' }, 'tok');
        expect(m.invites.get).toHaveBeenCalledWith({ target_type: 'realm', realm_id: 'r1', status: 'pending' }, 'tok');
        expect(dto.members.map((x) => [x.username, x.is_you])).toEqual([['sapan', true], ['lena', false]]);
        expect(dto.you).toEqual({ role: 'admin', is_admin: true });
        expect(dto.tokens).toEqual([{ id: '7', name: 'ci', created_at: '2026-01-01', last_used_at: null }]);
        expect(dto.invites[0]).toEqual({ invite_id: 'i1', email: 'new@x.com', role: 'operator', expires_at: '2026-10-10' });
        expect(dto.partial).toBe(false);
    });

    it('a failing section is reported; non-admin viewer; realm gate first', async () => {
        const m = mocks();
        m.tokens.get.mockRejectedValue(new ApiError('forbidden', 'Admins only', 403));
        const dto = await new RealmSettingsService(m.control as any, m.tokens as any, m.invites as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok', { user_id: 'u2', site_admin: false });
        expect(dto.sections.tokens).toEqual({ status: 'error', error: 'Admins only' });
        expect(dto.you).toEqual({ role: 'member', is_admin: false });
        m.control.realm_by_slug.mockRejectedValue(new ApiError('not_found', 'no', 404));
        await expect(new RealmSettingsService(m.control as any, m.tokens as any, m.invites as any).get({ org_slug: 'a', slug: 'b' }, 'tok', { user_id: 'u', site_admin: false })).rejects.toMatchObject({ status: 404 });
    });
});
