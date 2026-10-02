/** Inbox — Core in-app notification rows → inbox items (tagged with the org whose inbox returned them). */

import type { InAppNotificationVO } from '../types/core/notifications.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type { NotifInboxItemData } from '../schemas/inbox_types.js';

/** A non-blank string, or null. */
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Core row → inbox item, tagged with the org whose inbox returned it. */
export function to_inbox_item_data(row: InAppNotificationVO, org: OrgListItemVO | null): NotifInboxItemData {
    const payload = (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>;
    // Account-wide rows (no realm) come back from every org's inbox — don't pin them to one org.
    const owner = row.realm_id ? org : null;
    return {
        id: row.id,
        event: row.event,
        title: row.title ?? null,
        message: row.message ?? null,
        severity: row.severity ?? null,
        org_id: owner?.id ?? null,
        org_slug: owner?.slug ?? null,
        realm_id: row.realm_id ?? null,
        realm_slug: row.realm_slug ?? null,
        team: row.team ?? null,
        run_id: row.run_id ?? null,
        phase: row.phase ?? null,
        review_id: str(payload.review_id),
        channel_id: str(payload.channel_id),
        original_event: str(payload.original_event_type),
        at: row.created_at,
    };
}

/** Merge per-org pages into inbox items: dedupe by id, newest first. */
export function to_merged_inbox_items_data(pages: Array<{ org: OrgListItemVO; rows: InAppNotificationVO[] }>): NotifInboxItemData[] {
    const seen = new Map<string, NotifInboxItemData>();
    for (const { org, rows } of pages) {
        for (const r of rows) if (!seen.has(r.id)) seen.set(r.id, to_inbox_item_data(r, org));
    }
    return [...seen.values()].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
}
