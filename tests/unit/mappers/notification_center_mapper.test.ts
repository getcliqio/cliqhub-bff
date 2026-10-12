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
        // A personal channel names whose it is, so the UI can tell "you" from another person.
        expect(to_notif_channel_data({ ...base, realm_id: null, user_id: 'u1' }, ORG, null).owner).toMatchObject({ kind: 'personal', user_id: 'u1' });
        const realm = to_notif_channel_data({ ...base, realm_id: 'r1', user_id: null }, ORG, REALM);
        expect(realm).toEqual({
            id: 'c', name: 'n', enabled: true, rule_count: 0, system_key: null, locked: false, lock_reason: null,
            owner: { kind: 'realm', org_id: 'o1', org_slug: 'acme', realm_id: 'r1', realm_slug: 'prod', user_id: null },
            destinations: [{ type: 'slack', label: 'Slack webhook ••••1234' }],
        });
    });

    it('rule scope: a realm rule, or org-wide without a realm', () => {
        const vo = {
            id: 'x', realm_id: 'r1', org_id: null, event: 'run.*', channel_id: 'c', priority: 2,
            system_key: null, locked: false, lock_reason: null,
        };
        expect(to_notif_rule_data(vo, ORG, REALM, '#ops')).toMatchObject({ scope: { kind: 'realm', realm_slug: 'prod' }, channel_name: '#ops', priority: 2, replaces: [] });
        expect(to_notif_rule_data(vo, ORG, null, null).scope).toEqual({ kind: 'org', org_id: ORG.id, org_slug: ORG.slug, realm_id: null, realm_slug: null });
    });

    it('locked channel and rule: system_key, lock and lock_reason carried; rules have no recipients', () => {
        const channel = to_notif_channel_data({
            id: 'ch_x', name: 'Ops', org_id: 'o1', realm_id: null, user_id: null,
            destinations: [{ type: 'cliqhub' }], enabled: 1,
            system_key: 'test.locked', locked: true, lock_reason: 'Kept.',
        }, ORG, null);
        expect(channel).toMatchObject({ system_key: 'test.locked', locked: true, lock_reason: 'Kept.', enabled: true });

        const rule = to_notif_rule_data({
            id: 'r', realm_id: 'r1', org_id: null, event: 'run.failed', channel_id: 'ch_x', priority: 0,
            system_key: 'realm.members.run.failed', locked: false, lock_reason: null,
        }, ORG, REALM, 'All realm members');
        expect(rule).toMatchObject({ event: 'run.failed', system_key: 'realm.members.run.failed', locked: false, scope: { kind: 'realm' } });
        expect(rule).not.toHaveProperty('recipients');
    });

    it('check entry', () => {
        expect(to_notif_check_entry_data({ id: 'x', event: 'run.*', channel_id: 'c', tier: 'realm' }, null))
            .toEqual({ rule_id: 'x', selector: 'run.*', tier: 'realm', channel_id: 'c', channel_name: null });
    });
});
