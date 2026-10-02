/**
 * Realm › Settings — realm, people, pending invites and access tokens in one read.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/realms/get_members` + `/v1/invitations/get { target_type: realm, status: pending }`
 * + `/v1/auth/get_tokens { type: realm }`.
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { TokensRepository } from '../repositories/tokens_repository.js';
import type { InvitationsRepository } from '../repositories/invitations_repository.js';
import type { RealmSettingsData, RealmSettingsGetInput, RealmSettingsViewer } from '../schemas/realm_settings_types.js';
import { to_control_realm_data, to_section_data } from '../mappers/realm_inbox_mapper.js';
import {
    to_realm_settings_invite_data, to_realm_settings_member_data, to_realm_settings_token_data,
} from '../mappers/realm_settings_mapper.js';
import { get_logger } from '../lib/log.js';
import { ApiError } from '../errors/api_error.js';
import { error_fields } from '../lib/best_effort.js';

const log = get_logger('svc.realm_settings');

/** Realm › Settings page read. */
export class RealmSettingsService {
    constructor(
        private readonly _control: ControlRepository,
        private readonly _tokens: TokensRepository,
        private readonly _invitations: InvitationsRepository,
    ) {}

    /**
     * Everything the realm Settings tab shows. Members, invites and tokens are
     * best-effort (non-admins typically get 403 on tokens / invites): a failed
     * section is reported in `sections` and flags `partial`.
     *
     * @param p - The realm (`org_slug` + `slug`).
     * @param token - Caller's Core token (session target_token).
     * @param viewer - Who is looking (`to_realm_settings_viewer(session)`).
     */
    async get(p: RealmSettingsGetInput, token: string, viewer: RealmSettingsViewer): Promise<RealmSettingsData> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const [members, invites, tokens] = await Promise.allSettled([
            this._control.realm_members(realm.id, token),
            this._invitations.get({ target_type: 'realm', realm_id: realm.id, status: 'pending' }, token),
            this._tokens.get({ type: 'realm', realm_id: realm.id }, token),
        ]);

        // Non-admins routinely get 403 on invites / tokens — that is debug; anything else is a warn.
        for (const [key, r] of Object.entries({ members, invites, tokens })) {
            if (r.status !== 'rejected') continue;
            const routine = r.reason instanceof ApiError && r.reason.status === 403;
            (routine ? log.debug : log.warn)('realm_settings_section_failed', { realm_id: realm.id, section: key, ...error_fields(r.reason) });
        }

        const people = members.status === 'fulfilled' ? members.value.filter((m) => m.member_type !== 'daemon') : [];
        const me = people.find((m) => m.member_type === 'user' && m.member_id === viewer.user_id);
        const inv = invites.status === 'fulfilled' ? (invites.value?.invites ?? []) : [];
        const tok = tokens.status === 'fulfilled' ? (tokens.value?.tokens ?? []) : [];

        return {
            realm: to_control_realm_data(realm),
            you: { role: me?.role ?? null, is_admin: viewer.site_admin || me?.role === 'admin' },
            members: people.map((m) => to_realm_settings_member_data(m, m === me)),
            invites: inv.map(to_realm_settings_invite_data),
            tokens: tok.map(to_realm_settings_token_data),
            sections: { members: to_section_data(members), invites: to_section_data(invites), tokens: to_section_data(tokens) },
            partial: [members, invites, tokens].some((r) => r.status === 'rejected'),
        };
    }
}
