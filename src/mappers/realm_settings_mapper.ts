/** Realm › Settings — session → viewer; Core members, invites and tokens → settings rows. */

import type { SessionRecord } from '../repositories/session_store.js';
import type { ControlRealmMemberVO } from '../types/core/control.js';
import type { InvitationListItemVO } from '../types/core/invitations.js';
import type { TokenVO } from '../types/core/tokens.js';
import type {
    RealmSettingsInviteData, RealmSettingsMemberData, RealmSettingsTokenData, RealmSettingsViewer,
} from '../schemas/realm_settings_types.js';

/** The session's effective user (act-as target wins) and whether they are a site admin. */
export function to_realm_settings_viewer(session: SessionRecord): RealmSettingsViewer {
    return { user_id: session.act_as_user_id || session.user_id, site_admin: session.role === 'admin' };
}

/** Realm member row; `is_you` marks the viewer. */
export function to_realm_settings_member_data(m: ControlRealmMemberVO, is_you: boolean): RealmSettingsMemberData {
    return { member_type: m.member_type, member_id: m.member_id, username: m.username ?? null, role: m.role, is_you };
}

/** Pending invite row. */
export function to_realm_settings_invite_data(i: InvitationListItemVO): RealmSettingsInviteData {
    return { invite_id: i.invite_id, email: i.email, role: i.role, expires_at: i.expires_at ?? null };
}

/** Realm access-token row (metadata only, never the secret). */
export function to_realm_settings_token_data(t: TokenVO): RealmSettingsTokenData {
    return { id: String(t.id), name: t.name, created_at: t.created_at, last_used_at: t.last_used_at };
}
