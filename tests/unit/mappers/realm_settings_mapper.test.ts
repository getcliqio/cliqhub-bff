import { describe, it, expect } from 'vitest';
import { to_realm_settings_viewer, to_realm_settings_token_data, to_realm_settings_member_data, to_realm_settings_invite_data } from '../../../src/mappers/realm_settings_mapper.js';

const session = (over: Record<string, unknown> = {}) => ({ user_id: 'u1', act_as_user_id: '', role: 'user', ...over }) as any;

describe('realm settings mapper', () => {
    it('viewer is the act-as target when set, and site_admin follows the effective role', () => {
        expect(to_realm_settings_viewer(session())).toEqual({ user_id: 'u1', site_admin: false });
        expect(to_realm_settings_viewer(session({ act_as_user_id: 'u9', role: 'admin' }))).toEqual({ user_id: 'u9', site_admin: true });
    });
    it('token ids become strings; missing usernames become null', () => {
        expect(to_realm_settings_token_data({ id: 7, name: 'ci', permissions: {}, created_at: 'c', last_used_at: null }))
            .toEqual({ id: '7', name: 'ci', created_at: 'c', last_used_at: null });
        expect(to_realm_settings_member_data({ member_type: 'group', member_id: 'g1', role: 'member' }, false))
            .toEqual({ member_type: 'group', member_id: 'g1', username: null, role: 'member', is_you: false });
    });
    it('invite rows keep Core\'s invite_id, like org invite rows', () => {
        expect(to_realm_settings_invite_data({
            invite_id: 'i1', email: 'new@x.com', role: 'operator', kind: 'realm', status: 'pending', inviter: null,
            send_count: 1, last_sent_at: null, expires_at: '2026-10-10', created_at: '2026-10-01',
        })).toEqual({ invite_id: 'i1', email: 'new@x.com', role: 'operator', expires_at: '2026-10-10' });
    });
});
