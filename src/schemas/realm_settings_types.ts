/**
 * Realm › Settings — everything the realm Settings tab shows (request schema + response data).
 *
 * Routes (controllers/realm_settings_controller.ts):
 *   POST /v1/realm_settings/get
 *
 * BFF composition over Core: `/v1/realms/get_by_id` → `/v1/realms/get_members`
 * + `/v1/invitations/get { target_type: realm, status: pending }` + `/v1/auth/get_tokens { type: realm }`.
 */

import { z } from 'zod';
import type { ControlRealmData } from './realm_inbox_types.js';
import { RealmRefFields } from './realm_ref.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_settings/get */
export const RealmSettingsGetInput = z.object(RealmRefFields).strict();
export type RealmSettingsGetInput = z.infer<typeof RealmSettingsGetInput>;

// ─── Caller ─────────────────────────────────────────────────────────────────

/** Who is looking (from the session; `mappers/realm_settings_mapper.ts`). */
export interface RealmSettingsViewer {
    /** Effective user (the act-as target while acting as someone). */
    user_id: string;
    /** Site admin — always treated as a realm admin. */
    site_admin: boolean;
}

// ─── Response data ──────────────────────────────────────────────────────────

/** One realm member (daemons are left out). */
export interface RealmSettingsMemberData {
    member_type: string;
    member_id: string;
    username: string | null;
    role: string;
    /** This row is the viewer. */
    is_you: boolean;
}

/** One pending realm invite. */
export interface RealmSettingsInviteData {
    invite_id: string;
    email: string;
    role: string;
    expires_at: string | null;
}

/** One realm access token (no secret). */
export interface RealmSettingsTokenData {
    id: string;
    name: string;
    created_at: string;
    last_used_at: string | null;
}

/** Load status of one best-effort section. */
export interface RealmSettingsSectionData {
    status: 'ok' | 'error';
    error: string | null;
}

/** `realm_settings/get` */
export interface RealmSettingsData {
    realm: ControlRealmData;
    /** The viewer's realm role; is_admin also true for site admins (org admins are enforced by Core on write). */
    you: { role: string | null; is_admin: boolean };
    members: RealmSettingsMemberData[];
    invites: RealmSettingsInviteData[];
    tokens: RealmSettingsTokenData[];
    sections: Record<'members' | 'invites' | 'tokens', RealmSettingsSectionData>;
    partial: boolean;
}
