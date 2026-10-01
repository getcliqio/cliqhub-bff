import type { ControlRepository } from '../repositories/control_repository.js';
import type { AuthRepository } from '../repositories/auth_repository.js';
import type { InvitationsRepository } from '../repositories/invitations_repository.js';
import type { RealmSettingsDTO } from '../types/dto.js';
import type { RealmSettingsGetInput } from '../schemas/realm_settings_schemas.js';
import { ApiError } from '../repositories/api_error.js';
import { to_control_realm_dto } from '../types/mappers.js';

type Member_vo = { member_type: string; member_id: string; username: string | null; role: string; created_at?: number | string };
type Invite_vo = { id: string; email: string; role: string; expires_at?: string | null; created_at?: string | null };

function section(r: PromiseSettledResult<unknown>): { status: 'ok' | 'error'; error: string | null } {
    return r.status === 'fulfilled' ? { status: 'ok', error: null } : { status: 'error', error: r.reason instanceof ApiError ? r.reason.message : 'Could not load' };
}

/** Realm › Settings: realm, people, pending invites and access tokens in one read. */
export class RealmSettingsService {
    private _control: ControlRepository;
    private _auth: AuthRepository;
    private _invites: InvitationsRepository;

    constructor(control: ControlRepository, auth: AuthRepository, invites: InvitationsRepository) {
        this._control = control;
        this._auth = auth;
        this._invites = invites;
    }

    async get(token: string, p: RealmSettingsGetInput, viewer: { user_id: string; site_admin: boolean }): Promise<RealmSettingsDTO> {
        // Realm resolution is also the membership gate.
        const realm = await this._control.realm_by_slug(p.org_slug, p.slug, token);
        const [members, invites, tokens] = await Promise.allSettled([
            this._control.realm_members(realm.id, token) as Promise<Member_vo[]>,
            this._invites.get({ target_type: 'realm', realm_id: realm.id }, token) as Promise<{ data?: { invites?: Invite_vo[] }; invites?: Invite_vo[] }>,
            this._auth.list_tokens({ type: 'realm', realm_id: realm.id }, token),
        ]);

        const people = members.status === 'fulfilled' ? members.value.filter((m) => m.member_type !== 'daemon') : [];
        const me = people.find((m) => m.member_type === 'user' && m.member_id === viewer.user_id);
        const inv = invites.status === 'fulfilled' ? (invites.value.data?.invites ?? invites.value.invites ?? []) : [];
        const tok = tokens.status === 'fulfilled' ? (tokens.value.tokens ?? []) : [];

        return {
            realm: to_control_realm_dto(realm),
            you: { role: me?.role ?? null, is_admin: viewer.site_admin || me?.role === 'admin' },
            members: people.map((m) => ({ member_type: m.member_type, member_id: m.member_id, username: m.username, role: m.role, is_you: m === me })),
            invites: inv.map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: i.expires_at ?? null })),
            tokens: tok.map((t) => ({ id: String(t.id), name: t.name, created_at: t.created_at, last_used_at: t.last_used_at })),
            sections: { members: section(members), invites: section(invites), tokens: section(tokens) },
            partial: [members, invites, tokens].some((r) => r.status === 'rejected'),
        };
    }
}
