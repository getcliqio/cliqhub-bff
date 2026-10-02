/**
 * Notification center — Core VO → BFF data, and the session → viewer mapping.
 * Rule rows are built with `replaces: []`; `mark_replaces` (services/notification_rules.ts) fills it.
 */

import type { SessionRecord } from '../repositories/session_store.js';
import type { NotifChannelVO, NotifRuleVO } from '../types/core/notifications.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type {
    NotifChannelData, NotifCheckEntryData, NotifRealmRefData, NotifRuleData, NotifViewer,
} from '../schemas/notification_center_types.js';
import { destination_label, type TieredRule } from '../services/notification_rules.js';

type OrgRef = Pick<OrgListItemVO, 'id' | 'slug'>;

/** The effective user (take-over aware) and whether they are a site admin. */
export function to_notif_viewer(session: SessionRecord): NotifViewer {
    return { user_id: session.act_as_user_id || session.user_id, site_admin: session.role === 'admin' };
}

/** A channel with its owner (org, realm or personal), masked destinations and lock. */
export function to_notif_channel_data(c: NotifChannelVO, org: OrgRef, realm: NotifRealmRefData | null): NotifChannelData {
    return {
        id: c.id,
        name: c.name,
        owner: {
            kind: c.user_id ? 'personal' : c.realm_id ? 'realm' : 'org',
            org_id: org.id,
            org_slug: org.slug,
            realm_id: realm?.id ?? null,
            realm_slug: realm?.slug ?? null,
        },
        destinations: (c.destinations ?? []).map((d) => ({ type: d.type, label: destination_label(d) })),
        enabled: Boolean(c.enabled),
        rule_count: c.rule_count ?? 0,
        system_key: c.system_key ?? null,
        locked: c.locked === true,
        lock_reason: c.lock_reason ?? null,
    };
}

/** A rule with its scope (org-wide, realm or team-in-realm), channel name, recipients and lock. */
export function to_notif_rule_data(
    r: NotifRuleVO, org: OrgRef, realm: NotifRealmRefData | null, channel_name: string | null,
): NotifRuleData {
    return {
        id: r.id,
        event: r.event,
        scope: {
            kind: realm ? (r.team_slug ? 'team' : 'realm') : 'org',
            org_id: org.id,
            org_slug: org.slug,
            realm_id: realm?.id ?? null,
            realm_slug: realm?.slug ?? null,
            team_slug: realm ? r.team_slug ?? null : null,
        },
        channel_id: r.channel_id,
        channel_name,
        priority: r.priority ?? 0,
        replaces: [],
        recipients: [...(r.recipients ?? [])],
        system_key: r.system_key ?? null,
        locked: r.locked === true,
        lock_reason: r.lock_reason ?? null,
    };
}

/** One matching rule in a `check` row. */
export function to_notif_check_entry_data(t: TieredRule, channel_name: string | null): NotifCheckEntryData {
    return { rule_id: t.id, selector: t.event, tier: t.tier, channel_id: t.channel_id, channel_name };
}
