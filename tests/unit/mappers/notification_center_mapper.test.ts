import { describe, it, expect } from 'vitest';
import {
    to_notif_viewer, to_notif_channel_data, to_notif_rule_data, to_notif_check_entry_data,
} from '../../../src/mappers/notification_center_mapper.js';

const ORG = { id: 'o1', slug: 'acme' };
const REALM = { id: 'r1', slug: 'prod', name: 'Prod', org_id: 'o1', org_slug: 'acme' };

describe('notification_center_mapper', () => {
    it('viewer is the acted-as user; site admin from the session role', () => {
        expect(to_notif_viewer({ user_id: 'admin', act_as_user_id: 'u2', role: 'admin' } as any)).toEqual({ user_id: 'u2', site_admin: true });
        expect(to_notif_viewer({ user_id: 'u1', act_as_user_id: '', role: 'user' } as any)).toEqual({ user_id: 'u1', site_admin: false });
    });

    it('channel owner kind: personal > realm > org; destinations masked', () => {
        const base = { id: 'c', name: 'n', org_id: 'o1', destinations: [{ type: 'slack', webhook_url: 'https://h/abcd1234' }], enabled: 1, system_key: null, locked: false, lock_reason: null };
        expect(to_notif_channel_data({ ...base, realm_id: null, user_id: 'u1' }, ORG, null).owner.kind).toBe('personal');
        const realm = to_notif_channel_data({ ...base, realm_id: 'r1', user_id: null }, ORG, REALM);
        expect(realm).toEqual({
            id: 'c', name: 'n', enabled: true, rule_count: 0, system_key: null, locked: false, lock_reason: null,
            owner: { kind: 'realm', org_id: 'o1', org_slug: 'acme', realm_id: 'r1', realm_slug: 'prod' },
            destinations: [{ type: 'slack', label: 'Slack webhook ••••1234' }],
        });
    });

    it('rule scope: team only inside a realm', () => {
        const vo = {
            id: 'x', realm_id: 'r1', org_id: null, team_slug: 'dev', event: 'run.*', channel_id: 'c', priority: 2,
            recipients: [], system_key: null, locked: false, lock_reason: null,
        };
        expect(to_notif_rule_data(vo, ORG, REALM, '#ops')).toMatchObject({ scope: { kind: 'team', team_slug: 'dev', realm_slug: 'prod' }, channel_name: '#ops', priority: 2, replaces: [] });
        expect(to_notif_rule_data(vo, ORG, null, null).scope).toMatchObject({ kind: 'org', team_slug: null, realm_id: null });
    });

    it('locked system channel and rule: system_key, lock, lock_reason and recipients carried', () => {
        const channel = to_notif_channel_data({
            id: 'ch_email', name: 'Email', org_id: 'o1', realm_id: null, user_id: null,
            destinations: [{ type: 'email', provider: 'brevo' }], enabled: 1,
            system_key: 'org.email', locked: true, lock_reason: 'Org email is built in.',
        }, ORG, null);
        expect(channel).toMatchObject({ system_key: 'org.email', locked: true, lock_reason: 'Org email is built in.', enabled: true });

        const rule = to_notif_rule_data({
            id: 'r', realm_id: null, org_id: 'o1', team_slug: null, event: 'invite.org.sent', channel_id: 'ch_email', priority: 0,
            recipients: ['invitee'], system_key: 'invite.sent.invitee', locked: true,
            lock_reason: 'Invites must reach the invited person.',
        }, ORG, null, 'Email');
        expect(rule).toMatchObject({
            event: 'invite.org.sent', recipients: ['invitee'], system_key: 'invite.sent.invitee',
            locked: true, lock_reason: 'Invites must reach the invited person.', scope: { kind: 'org' },
        });
    });

    it('unlocked default rule: editable, recipients as sent', () => {
        const rule = to_notif_rule_data({
            id: 'r', realm_id: null, org_id: 'o1', team_slug: null, event: 'invite.org.accepted', channel_id: 'c', priority: 0,
            recipients: ['org_owners', 'inviter'], system_key: 'invite.accepted.owners', locked: false, lock_reason: null,
        }, ORG, null, null);
        expect(rule).toMatchObject({ locked: false, lock_reason: null, recipients: ['org_owners', 'inviter'] });
    });

    it('rule without named recipients (Core null): empty list, the channel\'s own destinations', () => {
        const rule = to_notif_rule_data({
            id: 'r', realm_id: null, org_id: 'o1', team_slug: null, event: 'run.failed', channel_id: 'c', priority: 0,
            recipients: null, system_key: null, locked: false, lock_reason: null,
        }, ORG, null, null);
        expect(rule.recipients).toEqual([]);
    });

    it('check entry', () => {
        expect(to_notif_check_entry_data({ id: 'x', event: 'run.*', channel_id: 'c', tier: 'realm' }, null))
            .toEqual({ rule_id: 'x', selector: 'run.*', tier: 'realm', channel_id: 'c', channel_name: null });
    });
});
