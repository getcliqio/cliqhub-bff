/**
 * Notifications — rules, channels and in-app notifications as Core sends them
 * (`/v1/{orgs,realms}/get_notification_rules`, `/v1/notification_channels/get`, `/v1/notifications/get`).
 */

/** A notification rule (`get_notification_rules`). */
export interface NotifRuleVO {
    id: string;
    realm_id: string | null;
    org_id: string | null;
    team_slug: string | null;
    event: string;
    channel_id: string;
    priority: number;
    /** Who the rule tells: `invitee`, `org_owners`, `inviter` or user ids; null → the channel's own destinations. */
    recipients: string[] | null;
    /** Set on the rules every org is seeded with. */
    system_key: string | null;
    /** A locked rule cannot be changed or removed (409 `locked`). */
    locked: boolean;
    lock_reason: string | null;
    created_at?: number;
    updated_at?: number;
}

/** One channel destination as Core stores it; extra keys depend on `type` (webhook_url, address, url, …). */
export interface NotifDestinationVO {
    type: string;
    [key: string]: unknown;
}

/** A notification channel with its destinations (`notification_channels/get`). */
export interface NotifChannelVO {
    id: string;
    realm_id: string | null;
    org_id: string | null;
    user_id: string | null;
    name: string;
    destinations: NotifDestinationVO[];
    enabled: number | boolean;
    /** Set on the channels every org is seeded with. */
    system_key: string | null;
    /** A locked channel cannot be changed or removed (409 `locked`). */
    locked: boolean;
    lock_reason: string | null;
    rule_count?: number;
}

/** In-app inbox row from Core `POST /v1/notifications/get` (per org). */
export interface InAppNotificationVO {
    id: string;
    event: string;
    title: string | null;
    message: string | null;
    realm_id: string | null;
    realm_slug: string | null;
    user_id: string | null;
    team: string | null;
    run_id: string | null;
    phase: string | null;
    severity: string | null;
    payload?: Record<string, unknown> | null;
    created_at: number;
}

/** A page of in-app notifications (`notifications/get`). */
export interface InAppNotificationPageVO {
    items: InAppNotificationVO[];
    total: number;
}
