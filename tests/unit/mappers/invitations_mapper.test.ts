import { describe, it, expect } from 'vitest';
import {
    to_invitations_accept_data, to_invitation_list_item_data, to_invitations_get_by_token_data,
    to_invitations_create_data, to_invitations_get_data,
} from '../../../src/mappers/invitations_mapper.js';
import { scopes_from_slugs } from '../../../src/mappers/session_mapper.js';
import type { AcceptOutcome } from '../../../src/services/invitations_service.js';
import type { LoginData } from '../../../src/schemas/session_types.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const ACCEPTED = {
    decision: 'accept' as const,
    user: { id: USER_ID, username: 'newbie', status: 'active' as const, created: true },
    org: { id: ORG_ID, slug: 'acme' },
    realm: null,
    membership: { role: 'member', status: 'active' },
};

const LOGIN: LoginData = {
    user: { id: USER_ID, username: 'newbie', display_name: 'newbie', email: 'n@test.com', role: 'user', suspended_at: null, created_at: 'c', preferences: {} },
    scopes: scopes_from_slugs(['newbie']),
    org_slugs: ['acme'],
    default_realm_id: null,
    default_realm_slug: null,
    default_realm_qualified: null,
    enroll_token: null,
    orgs: [],
};

describe('to_invitations_accept_data', () => {
    it('decline → { decision: decline } only', () => {
        expect(to_invitations_accept_data({ decision: 'decline' }, false)).toEqual({ decision: 'decline' });
    });

    it('accept without a session: the acceptance alone (browser and CLI)', () => {
        const outcome: AcceptOutcome = { decision: 'accept', accepted: ACCEPTED, session: null };
        expect(to_invitations_accept_data(outcome, false)).toEqual(ACCEPTED);
        expect(to_invitations_accept_data(outcome, true)).toEqual(ACCEPTED);
    });

    it('accept with a session, browser: sign-in data under `session`, no token', () => {
        const outcome: AcceptOutcome = {
            decision: 'accept', accepted: ACCEPTED,
            session: { session_id: 'sid', target_token: 'cliq_tok_new', login: LOGIN },
        };

        const data = to_invitations_accept_data(outcome, false);

        expect(data).toEqual({ ...ACCEPTED, session: LOGIN });
        expect(JSON.stringify(data)).not.toContain('cliq_tok_new');
        expect(JSON.stringify(data)).not.toContain('sid');
    });

    it('accept with a session, CLI: scope slugs and the bearer token under `session`', () => {
        const outcome: AcceptOutcome = {
            decision: 'accept', accepted: ACCEPTED,
            session: { session_id: 'sid', target_token: 'cliq_tok_new', login: LOGIN },
        };

        const data = to_invitations_accept_data(outcome, true);

        expect(data).toMatchObject({ ...ACCEPTED, session: { scopes: ['newbie'], token: 'cliq_tok_new', org_slugs: ['acme'] } });
    });
});

describe('to_invitations_create_data', () => {
    it('defaults a missing invite_url to null', () => {
        const data = to_invitations_create_data({
            invite_id: 'i', status: 'pending', email: 'e', role: 'member', expires_at: 'x',
            resent: false, email_sent: true, invite_url: undefined as unknown as null,
        });
        expect(data.invite_url).toBeNull();
    });
});

describe('to_invitation_list_item_data', () => {
    it('maps deliveries and never copies a token', () => {
        const data = to_invitation_list_item_data({
            invite_id: 'i', email: 'e', role: 'member', kind: 'org', status: 'pending',
            inviter: { id: USER_ID, display_name: 'Sapan' }, send_count: 1, last_sent_at: null,
            expires_at: 'x', created_at: 'c',
            deliveries: [{ kind: 'reminder', sent_at: 's', email_sent: false }],
            token: 'secret',
        } as never);
        expect(data.deliveries).toEqual([{ kind: 'reminder', sent_at: 's', email_sent: false, provider_message_id: null }]);
        expect(data).not.toHaveProperty('token');
    });

    it('treats missing deliveries as none', () => {
        const data = to_invitation_list_item_data({
            invite_id: 'i', email: 'e', role: 'member', kind: 'realm', status: 'expired',
            inviter: null, send_count: 0, last_sent_at: null, expires_at: 'x', created_at: 'c',
        });
        expect(data.deliveries).toEqual([]);
    });
});

describe('to_invitations_get_by_token_data', () => {
    it('maps the preview of a realm invite', () => {
        const vo = {
            invite_id: 'i', kind: 'realm' as const, status: 'revoked' as const,
            org: { slug: 'acme', display_name: 'Acme' }, realm: { slug: 'prod', display_name: 'Prod' },
            role: 'operator', inviter: { display_name: 'Sapan' }, invitee_email: 'p@example.test',
            account_exists: true, expires_at: 'x',
        };
        expect(to_invitations_get_by_token_data(vo)).toEqual(vo);
    });
});

describe('to_invitations_get_data', () => {
    it('keeps the target and the page (total, page, page_size)', () => {
        const data = to_invitations_get_data({ target_type: 'realm', realm_id: 'r1', invites: [], total: 3, page: 2, page_size: 2 });
        expect(data).toEqual({ target_type: 'realm', realm_id: 'r1', invites: [], total: 3, page: 2, page_size: 2 });
    });
});
