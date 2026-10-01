import type { CoreApiClient } from './core_api_client.js';
import type {
    ControlPageVO, ControlRealmVO, ControlReviewVO, ControlRunPhaseVO, ControlRunVO, InAppNotificationPageVO, InAppNotificationVO, NotifChannelVO, NotifRuleVO,
} from '../types/vo.js';

type RunState = 'running' | 'awaiting_input' | 'completed' | 'failed' | 'cancelled' | 'crashed';

/**
 * Typed reads over existing Core control-plane routes (the same paths the
 * SPA reaches through the hub passthrough). Used by BFF composition
 * services so the browser makes one call instead of fanning out.
 * Every call is made as the bearer — the session's `target_token`.
 */
export class ControlRepository {
    private _core: CoreApiClient;

    constructor(core: CoreApiClient) {
        this._core = core;
    }

    async realm_by_slug(org_slug: string, slug: string, token: string): Promise<ControlRealmVO> {
        const res = await this._core.post<{ realm: ControlRealmVO }>('/v1/realms/get_by_id', { slug, org_slug }, token);
        return res.realm;
    }

    async realm_by_id(realm_id: string, token: string): Promise<ControlRealmVO> {
        const res = await this._core.post<{ realm: ControlRealmVO }>('/v1/realms/get_by_id', { realm_id }, token);
        return res.realm;
    }

    async pending_reviews(realm_id: string, token: string, limit = 50): Promise<ControlPageVO<ControlReviewVO>> {
        const res = await this._core.post<{ data: ControlPageVO<ControlReviewVO> }>(
            '/v1/reviews/get', { realm_id, statuses: ['pending'], limit }, token,
        );
        return page(res.data);
    }

    async runs(
        filter: { realm_id: string; state?: RunState | RunState[]; since_ms?: number; query?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<ControlPageVO<ControlRunVO>> {
        const res = await this._core.post<{ data: ControlPageVO<ControlRunVO> }>(
            '/v1/runs/get',
            { sort_by: 'last_updated_at', sort_dir: 'desc', limit: 25, ...filter },
            token,
        );
        return page(res.data);
    }

    /**
     * Runs of one team (Core `team_id` filter). Realm-gated by Core; without
     * org_id / realm_id it spans the caller's realms in every org.
     */
    async runs_for_team(
        filter: { team_id: string; org_id?: string; realm_id?: string; state?: RunState | RunState[]; since_ms?: number; query?: string; limit?: number; offset?: number },
        token: string,
    ): Promise<ControlPageVO<ControlRunVO>> {
        const body: Record<string, unknown> = { sort_by: 'last_updated_at', sort_dir: 'desc', limit: 25 };
        for (const [k, v] of Object.entries(filter)) if (v !== undefined) body[k] = v;
        const res = await this._core.post<{ data: ControlPageVO<ControlRunVO> }>('/v1/runs/get', body, token);
        return page(res.data);
    }

    /** Newest runs across an org (org-scoped recent list). */
    async runs_for_org(org_id: string, token: string, limit = 1): Promise<ControlPageVO<ControlRunVO>> {
        const res = await this._core.post<{ data: ControlPageVO<ControlRunVO> }>('/v1/runs/get', { org_id, limit }, token);
        return page(res.data);
    }

    async org_notification_rules(org_id: string, token: string): Promise<NotifRuleVO[]> {
        const res = await this._core.post<{ data: NotifRuleVO[] }>('/v1/orgs/get_notification_rules', { org_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** Realm + team-in-realm rules for one realm. */
    async realm_notification_rules(realm_id: string, token: string): Promise<NotifRuleVO[]> {
        const res = await this._core.post<{ data: NotifRuleVO[] }>('/v1/realms/get_notification_rules', { realm_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    async org_channels(org_id: string, token: string): Promise<NotifChannelVO[]> {
        const res = await this._core.post<{ data: NotifChannelVO[] }>('/v1/notification_channels/get', { org_id, account: true }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    async realm_channels(realm_id: string, token: string): Promise<NotifChannelVO[]> {
        const res = await this._core.post<{ data: NotifChannelVO[] }>('/v1/notification_channels/get', { realm_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }

    /** One org's slice of the caller's in-app inbox. */
    async notifications(params: Record<string, unknown> & { org_id: string }, token: string): Promise<InAppNotificationPageVO> {
        const res = await this._core.post<{ data?: { items?: InAppNotificationVO[]; total?: number } }>('/v1/notifications/get', params, token);
        const items = Array.isArray(res.data?.items) ? res.data!.items! : [];
        return { items, total: typeof res.data?.total === 'number' ? res.data!.total! : items.length };
    }

    /** One page of the caller's realms (Core searches slug + name). */
    async realms_page(params: { org_id?: string; query?: string; limit: number; offset: number }, token: string): Promise<{ items: Array<{ id: string; slug: string; name: string; org_slug: string | null }>; total: number }> {
        const body: Record<string, unknown> = { limit: params.limit, offset: params.offset, sort_by: 'slug', sort_dir: 'asc' };
        if (params.org_id) body.org_id = params.org_id;
        if (params.query) body.query = params.query;
        const res = await this._core.post<{ data?: { items?: Array<{ id: string; slug: string; name: string; org_slug: string | null }>; total?: number } }>('/v1/realms/get', body, token);
        const items = Array.isArray(res.data?.items) ? res.data!.items! : [];
        return { items, total: typeof res.data?.total === 'number' ? res.data!.total! : items.length };
    }

    /** Daemons in a realm (Core pages; realms have few). */
    async realm_daemons(realm_id: string, limit: number, token: string): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
        const res = await this._core.post<{ data?: { items?: Array<Record<string, unknown>>; total?: number } }>('/v1/daemons/get', { realm_id, limit, offset: 0 }, token);
        const items = Array.isArray(res.data?.items) ? res.data!.items! : [];
        return { items, total: typeof res.data?.total === 'number' ? res.data!.total! : items.length };
    }

    /** Realm roster (members only). Used to find the caller's realm role. */
    async realm_members(realm_id: string, token: string): Promise<Array<{ member_type: string; member_id: string; role: string }>> {
        const res = await this._core.post<{ members?: Array<{ member_type: string; member_id: string; role: string }> }>('/v1/realms/get_members', { realm_id }, token);
        return Array.isArray(res.members) ? res.members : [];
    }

    /** Upsert one rule (Core is idempotent per scope + event + channel). */
    async set_rule(body: { org_id?: string; realm_id?: string; team_slug?: string; event: string; channel_id: string }, token: string): Promise<NotifRuleVO> {
        const path = body.realm_id ? '/v1/realms/set_notification_rules' : '/v1/orgs/set_notification_rules';
        const res = await this._core.post<{ data: NotifRuleVO }>(path, body, token);
        return res.data;
    }

    async event_types(token: string): Promise<string[]> {
        const res = await this._core.post<{ types?: string[] }>('/v1/events/types/list', {}, token);
        return Array.isArray(res.types) ? res.types : [];
    }

    async run_by_id(run_id: string, token: string): Promise<ControlRunVO | null> {
        const res = await this._core.post<{ data: ControlRunVO | null }>('/v1/runs/get_by_id', { run_id }, token);
        return res.data ?? null;
    }

    async run_phases(run_id: string, token: string): Promise<ControlRunPhaseVO[]> {
        const res = await this._core.post<{ data: ControlRunPhaseVO[] }>('/v1/runs/get_status', { run_id }, token);
        return Array.isArray(res.data) ? res.data : [];
    }
}

function page<T>(data: ControlPageVO<T> | undefined): ControlPageVO<T> {
    const items = Array.isArray(data?.items) ? data!.items : [];
    return { items, total: typeof data?.total === 'number' ? data.total : items.length };
}
