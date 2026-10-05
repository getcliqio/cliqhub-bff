/**
 * Control plane — typed reads (and the one rule write) over Core's realm, run,
 * review, daemon and notification routes: the same paths the SPA reaches
 * through the hub passthrough. BFF composition services use it so the browser
 * makes one call instead of fanning out. Every call is made as the bearer
 * (the session's `target_token`).
 *
 * These routes answer with flat bodies (`{ ok, realm }`, `{ ok, data }`,
 * `{ ok, members }`), so reads go through `CoreClient.post_body` and each
 * method picks its field out. Returns Core shapes (`types/core/control.ts`,
 * `types/core/notifications.ts`).
 */

import type { CoreClient } from './core_client.js';
import type { SortDir } from '../lib/core_list.js';
import type {
    ControlDaemonVO, ControlPageVO, ControlRealmListItemVO, ControlRealmMemberVO, ControlRealmVO,
    ControlReviewVO, ControlRunPhaseVO, ControlRunVO, ControlArtifactVO } from '../types/core/control.js';
import type { InAppNotificationPageVO, InAppNotificationVO, NotifChannelVO, NotifRuleVO } from '../types/core/notifications.js';

/** Core run states (`runs/get` `state` filter). */
export type ControlRunState = 'running' | 'awaiting_input' | 'completed' | 'failed' | 'cancelled' | 'crashed';

/** `runs/get` filter for one realm (sorted newest-updated first unless `sort_by`, default 25). */
export interface ControlRunsFilter {
    realm_id: string;
    state?: ControlRunState | ControlRunState[];
    since_ms?: number;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_dir?: SortDir;
}

/** `runs/get` filter for one team (optionally narrowed to an org or realm). */
export interface ControlTeamRunsFilter {
    team_id: string;
    org_id?: string;
    realm_id?: string;
    state?: ControlRunState | ControlRunState[];
    since_ms?: number;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_dir?: SortDir;
}

/** `realms/get` page request (sorted by slug). */
export interface ControlRealmsPageFilter {
    org_id?: string;
    query?: string;
    limit: number;
    offset: number;
}

/** `{orgs,realms}/set_notification_rules` body — realm rule when `realm_id` is set. */
export interface ControlSetRuleInput {
    org_id?: string;
    realm_id?: string;
    team_slug?: string;
    event: string;
    channel_id: string;
}

/** Typed control-plane reads (realms, runs, reviews, daemons, notifications) and the notification-rule write. */
export class ControlRepository {
    constructor(private readonly _core: CoreClient) {}

    /** `POST /v1/realms/get_by_id { slug, org_slug }` — the realm; 403/404 when the caller is not a member. */
    async realm_by_slug(org_slug: string, slug: string, token: string): Promise<ControlRealmVO> {
        const res = await this._core.post_body<{ realm: ControlRealmVO }>('/v1/realms/get_by_id', { slug, org_slug }, token);
        return res.realm;
    }

    /** `POST /v1/realms/get_by_id { realm_id }` — the realm by id. */
    async realm_by_id(realm_id: string, token: string): Promise<ControlRealmVO> {
        const res = await this._core.post_body<{ realm: ControlRealmVO }>('/v1/realms/get_by_id', { realm_id }, token);
        return res.realm;
    }

    /** `POST /v1/reviews/get { realm_id, statuses: [pending] }` — one page of a realm's pending reviews. */
    async pending_reviews(realm_id: string, token: string, limit = 50): Promise<ControlPageVO<ControlReviewVO>> {
        const res = await this._core.post_body<{ data: ControlPageVO<ControlReviewVO> }>(
            '/v1/reviews/get', { realm_id, statuses: ['pending'], limit }, token,
        );
        return page(res.data);
    }

    /** `POST /v1/runs/get { realm_id, … }` — one page of a realm's runs, newest-updated first. */
    async runs(filter: ControlRunsFilter, token: string): Promise<ControlPageVO<ControlRunVO>> {
        const res = await this._core.post_body<{ data: ControlPageVO<ControlRunVO> }>(
            '/v1/runs/get',
            { sort_by: 'last_updated_at', sort_dir: 'desc', limit: 25, ...filter },
            token,
        );
        return page(res.data);
    }

    /**
     * `POST /v1/runs/get { team_id, … }` — runs of one team. Realm-gated by Core;
     * without org_id / realm_id it spans the caller's realms in every org.
     */
    async runs_for_team(filter: ControlTeamRunsFilter, token: string): Promise<ControlPageVO<ControlRunVO>> {
        const body: Record<string, unknown> = { sort_by: 'last_updated_at', sort_dir: 'desc', limit: 25 };
        for (const [k, v] of Object.entries(filter)) if (v !== undefined) body[k] = v;
        const res = await this._core.post_body<{ data: ControlPageVO<ControlRunVO> }>('/v1/runs/get', body, token);
        return page(res.data);
    }

    /** `POST /v1/runs/get { org_id, limit }` — newest runs across an org. */
    async runs_for_org(org_id: string, token: string, limit = 1): Promise<ControlPageVO<ControlRunVO>> {
        const res = await this._core.post_body<{ data: ControlPageVO<ControlRunVO> }>('/v1/runs/get', { org_id, limit }, token);
        return page(res.data);
    }

    /** `POST /v1/orgs/get_notification_rules { org_id }` — an org's notification rules. */
    async org_notification_rules(org_id: string, token: string): Promise<NotifRuleVO[]> {
        const res = await this._core.post_body<{ data: NotifRuleVO[] }>('/v1/orgs/get_notification_rules', { org_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** `POST /v1/realms/get_notification_rules { realm_id }` — realm + team-in-realm rules. */
    async realm_notification_rules(realm_id: string, token: string): Promise<NotifRuleVO[]> {
        const res = await this._core.post_body<{ data: NotifRuleVO[] }>('/v1/realms/get_notification_rules', { realm_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** `POST /v1/notification_channels/get { org_id, account: true }` — an org's channels (+ the caller's own). */
    async org_channels(org_id: string, token: string): Promise<NotifChannelVO[]> {
        const res = await this._core.post_body<{ data: NotifChannelVO[] }>('/v1/notification_channels/get', { org_id, account: true }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** `POST /v1/notification_channels/get { realm_id }` — a realm's channels. */
    async realm_channels(realm_id: string, token: string): Promise<NotifChannelVO[]> {
        const res = await this._core.post_body<{ data: NotifChannelVO[] }>('/v1/notification_channels/get', { realm_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** `POST /v1/notifications/get { org_id, … }` — one org's slice of the caller's in-app inbox. */
    async notifications(params: Record<string, unknown> & { org_id: string }, token: string): Promise<InAppNotificationPageVO> {
        const res = await this._core.post_body<{ data?: { items?: InAppNotificationVO[]; total?: number } }>('/v1/notifications/get', params, token);
        const items = Array.isArray(res.data?.items) ? res.data!.items! : [];
        return { items, total: typeof res.data?.total === 'number' ? res.data!.total! : items.length };
    }

    /** `POST /v1/realms/get` — one page of the caller's realms (Core searches slug + name). */
    async realms_page(params: ControlRealmsPageFilter, token: string): Promise<ControlPageVO<ControlRealmListItemVO>> {
        const body: Record<string, unknown> = { limit: params.limit, offset: params.offset, sort_by: 'slug', sort_dir: 'asc' };
        if (params.org_id) body.org_id = params.org_id;
        if (params.query) body.query = params.query;
        const res = await this._core.post_body<{ data?: Partial<ControlPageVO<ControlRealmListItemVO>> }>('/v1/realms/get', body, token);
        return page(res.data);
    }

    /** `POST /v1/daemons/get { realm_id, limit, offset: 0 }` — daemons in a realm (realms have few). */
    async realm_daemons(realm_id: string, limit: number, token: string): Promise<ControlPageVO<ControlDaemonVO>> {
        const res = await this._core.post_body<{ data?: Partial<ControlPageVO<ControlDaemonVO>> }>('/v1/daemons/get', { realm_id, limit, offset: 0 }, token);
        return page(res.data);
    }

    /** `POST /v1/realms/get_members { realm_id }` — the realm roster (users, groups, daemons). */
    async realm_members(realm_id: string, token: string): Promise<ControlRealmMemberVO[]> {
        const res = await this._core.post_body<{ members?: ControlRealmMemberVO[] }>('/v1/realms/get_members', { realm_id }, token);
        return Array.isArray(res.members) ? res.members : [];
    }

    /**
     * `POST /v1/realms/set_notification_rules` (with `realm_id`) or
     * `/v1/orgs/set_notification_rules` — upserts one rule (idempotent per scope + event + channel).
     */
    async set_rule(body: ControlSetRuleInput, token: string): Promise<NotifRuleVO> {
        const path = body.realm_id ? '/v1/realms/set_notification_rules' : '/v1/orgs/set_notification_rules';
        const res = await this._core.post_body<{ data: NotifRuleVO }>(path, body, token);
        return res.data;
    }

    /** `POST /v1/events/types/list` — the event types rules can subscribe to. */
    async event_types(token: string): Promise<string[]> {
        const res = await this._core.post_body<{ types?: string[] }>('/v1/events/types/list', {}, token);
        return Array.isArray(res.types) ? res.types : [];
    }

    /** `POST /v1/runs/get_by_id { run_id }` — one run, or null when Core has none. */
    async run_by_id(run_id: string, token: string): Promise<ControlRunVO | null> {
        const res = await this._core.post_body<{ data: ControlRunVO | null }>('/v1/runs/get_by_id', { run_id }, token);
        return res.data ?? null;
    }

    /**
     * `POST /v1/artifacts/get { run_id, include_records: true }` — everything the run's phases
     * produced: stored files and run records (no download links kept: they expire).
     */
    async run_artifacts(run_id: string, token: string): Promise<ControlArtifactVO[]> {
        const res = await this._core.post_body<{ data: ControlArtifactVO[] }>('/v1/artifacts/get', { run_id, include_records: true }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** `POST /v1/runs/get_status { run_id }` — a run's phases. */
    async run_phases(run_id: string, token: string): Promise<ControlRunPhaseVO[]> {
        const res = await this._core.post_body<{ data: ControlRunPhaseVO[] }>('/v1/runs/get_status', { run_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }
}

/** Tolerant `{ items, total }` read: missing items → [], missing total → items.length. */
function page<T>(data: Partial<ControlPageVO<T>> | undefined): ControlPageVO<T> {
    const items = Array.isArray(data?.items) ? data!.items : [];
    return { items, total: typeof data?.total === 'number' ? data.total : items.length };
}
