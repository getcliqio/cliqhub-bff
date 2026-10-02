/**
 * Notification center — composes Core's per-org and per-realm notification data into one view.
 *
 * Core routes composed:
 *   get:       /v1/orgs/get { mine } → per org /v1/orgs/get_notification_rules,
 *              /v1/notification_channels/get, /v1/orgs/get_by_id (viewer's role; not for site admins);
 *              /v1/realms/get_by_id or a page of /v1/realms/get → per realm
 *              /v1/realms/get_notification_rules, /v1/notification_channels/get,
 *              /v1/realms/get_members (realm-admin check); /v1/events/types/list
 *   check:     /v1/realms/get_by_id, /v1/orgs/get { mine }, org + realm rules and channels,
 *              /v1/teams/get { realm_id } (roster), /v1/events/types/list
 *   set_rules: /v1/{orgs,realms}/set_notification_rules, once per event
 */

import { get_logger } from '../lib/log.js';
import { best_effort, error_fields, warn_rejected } from '../lib/best_effort.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { NotifChannelVO, NotifRuleVO } from '../types/core/notifications.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type {
    NotificationCenterGetInput, NotificationCenterCheckInput, NotificationCenterSetRulesInput,
    NotifChannelData, NotifOrgData, NotifRealmData, NotifRealmRefData, NotifRuleData, NotifScopeKind,
    NotificationCenterData, NotificationCheckData, NotifCheckRowData, NotifSetRulesData,
    NotifRealmPageData, NotifViewer,
} from '../schemas/notification_center_types.js';
import { ApiError } from '../errors/api_error.js';
import { mark_replaces, resolve_event, sort_rules, type TieredRule } from './notification_rules.js';
import {
    to_notif_channel_data, to_notif_check_entry_data, to_notif_rule_data,
} from '../mappers/notification_center_mapper.js';

const log = get_logger('svc.notification_center');

/** Core permission names behind the notification write routes. */
const ORG_RULES_EDIT = 'rules.manage';
const ORG_CHANNELS_EDIT = 'channels.manage';
const REALM_EDIT = 'rules.manage.realm';

/** Message shown in place of a failed section: Core's own for an ApiError, else `fallback`. */
function reason(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.message : fallback;
}

/** `Promise.all` over `items` with at most `limit` calls in flight; results keep input order. */
async function map_limited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    const worker = async (): Promise<void> => {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

/**
 * Notification center — every rule and channel the user can see, across
 * orgs and realms, in one response. Core serves rules and channels per org
 * and per realm; the fan-out and the "replaces" / "who gets told" logic
 * live here so the browser makes a single call per view.
 */
export class NotificationCenterService {
    /** Orgs read in parallel. */
    static readonly ORG_CONCURRENCY = 4;
    /** Realms read in parallel. */
    static readonly REALM_CONCURRENCY = 6;
    /** Realms per page (their rules + channels are fetched); org-wide data always loads. */
    static readonly REALM_PAGE = 10;

    constructor(
        private readonly _orgs_repo: OrgsRepository,
        private readonly _dashboard_repo: DashboardRepository,
        private readonly _control_repo: ControlRepository,
        private readonly _teams_repo: TeamsRepository,
    ) {}

    /**
     * What the viewer may edit, mirroring Core's `require_permission`: a site
     * admin → everything; otherwise the role of the viewer's active
     * membership (by `role_id`, from `/v1/orgs/get_by_id`): the owner role
     * (`is_system`) → everything, any other role → its permissions. The
     * owner-only `rules.manage` is therefore never granted to an admin role.
     * Null when unknown (Core decides).
     */
    private async org_permissions(org: OrgListItemVO, viewer: NotifViewer, token: string): Promise<Set<string> | 'all' | null> {
        if (viewer.site_admin) return 'all';
        const detail = await best_effort(log, 'notif_org_role_failed', this._orgs_repo.get_by_id({ org_id: org.id }, token), null, { org_id: org.id });
        if (detail === null) return null;
        const me = detail.members.find((m) => m.user_id === viewer.user_id && m.status === 'active');
        const role = me?.role_id ? detail.roles.find((r) => r.id === me.role_id) : undefined;
        if (role?.is_system) return 'all';
        return new Set(role?.permissions ?? []);
    }

    /**
     * Which realms this response covers: one realm (realm view), or one page
     * of Core's realm search. Only those realms' rules and channels are read.
     * A failed realm search becomes `realm_page.status: 'error'`.
     *
     * @throws ApiError 403/404 when `realm_id` is given and the caller can't see that realm.
     */
    private async realm_page(
        orgs_in: OrgListItemVO[],
        params: NotificationCenterGetInput,
        token: string,
    ): Promise<{ realm_ctx: NotifRealmRefData[]; realm_page: NotifRealmPageData }> {
        const by_slug = new Map(orgs_in.map((o) => [o.slug, o]));
        const limit = params.realm_limit ?? NotificationCenterService.REALM_PAGE;
        const offset = params.realm_offset ?? 0;
        const q = params.realm_q ?? null;
        try {
            if (params.realm_id) {
                // Realm lookup is also the membership gate.
                const r = await this._control_repo.realm_by_id(params.realm_id, token);
                const org = r.org_slug ? by_slug.get(r.org_slug) : undefined;
                if (!org) throw new ApiError('forbidden', 'Realm is outside this view', 403);
                return {
                    realm_ctx: [{ id: r.id, slug: r.slug, name: r.name || r.slug, org_id: org.id, org_slug: org.slug }],
                    realm_page: { offset: 0, limit: 1, total: 1, q: null, status: 'ok', error: null },
                };
            }
            const page = await this._control_repo.realms_page({ org_id: params.org_id, query: q ?? undefined, limit, offset }, token);
            const realm_ctx = page.items
                .map((r) => ({ r, org: r.org_slug ? by_slug.get(r.org_slug) : undefined }))
                .filter((x): x is { r: typeof x.r; org: OrgListItemVO } => Boolean(x.org))
                .map(({ r, org }) => ({ id: r.id, slug: r.slug, name: r.name || r.slug, org_id: org.id, org_slug: org.slug }));
            return { realm_ctx, realm_page: { offset, limit, total: page.total, q, status: 'ok', error: null } };
        } catch (err) {
            if (params.realm_id && err instanceof ApiError && (err.status === 403 || err.status === 404)) throw err;
            // Org-wide data still renders; the realm section shows the error.
            log.warn('notif_realm_page_failed', { org_id: params.org_id, realm_id: params.realm_id, ...error_fields(err) });
            return { realm_ctx: [], realm_page: { offset, limit, total: 0, q, status: 'error', error: reason(err, 'Could not load realms') } };
        }
    }

    /**
     * Every rule and channel the viewer can see: all org-wide data for their orgs
     * (or one org), plus one page of realms (or one realm) with their rules and
     * channels, each flagged with what the viewer may edit. Failures per org or
     * realm are reported in place and set `partial`.
     *
     * @throws ApiError 403 when `org_id` is not one of the viewer's orgs, or `realm_id` is outside the view.
     */
    async get(input: NotificationCenterGetInput, token: string, viewer: NotifViewer): Promise<NotificationCenterData> {
        const { orgs: member_orgs } = await this._orgs_repo.get({ mine: true }, token);
        const orgs_in = input.org_id ? member_orgs.filter((o) => o.id === input.org_id) : member_orgs;
        if (input.org_id && orgs_in.length === 0) throw new ApiError('forbidden', 'Not a member of that org', 403);

        const per_org = await map_limited(orgs_in, NotificationCenterService.ORG_CONCURRENCY, async (org) => {
            const [rules, channels, perms] = await Promise.allSettled([
                this._control_repo.org_notification_rules(org.id, token),
                this._control_repo.org_channels(org.id, token),
                this.org_permissions(org, viewer, token),
            ]);
            warn_rejected(log, 'notif_org_read_failed', { rules, channels, perms }, { org_id: org.id });
            return { org, rules, channels, perms: perms.status === 'fulfilled' ? perms.value : null };
        });
        const has = (org_id: string, perm: string): boolean | null => {
            const p = per_org.find((x) => x.org.id === org_id)?.perms ?? null;
            if (p === null) return null;
            return p === 'all' || p.has(perm);
        };

        const orgs: NotifOrgData[] = per_org.map(({ org, rules, channels }) => {
            const failed = [rules, channels].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
            return {
                id: org.id, slug: org.slug, display_name: org.display_name || org.slug, role: org.role,
                status: failed ? 'error' : 'ok',
                error: failed ? reason(failed.reason, 'Could not load notifications') : null,
                // Unknown (role lookup failed) → let Core decide on write.
                can_edit: has(org.id, ORG_RULES_EDIT) ?? true,
                can_edit_channels: has(org.id, ORG_CHANNELS_EDIT) ?? true,
            };
        });

        const { realm_ctx, realm_page } = await this.realm_page(orgs_in, input, token);

        const per_realm = await map_limited(realm_ctx, NotificationCenterService.REALM_CONCURRENCY, async (realm) => {
            // Org role grants realm edits in most cases; only then ask whether the viewer is a realm admin.
            const via_org = has(realm.org_id, REALM_EDIT);
            const [rules, channels, admin] = await Promise.allSettled([
                this._control_repo.realm_notification_rules(realm.id, token),
                this._control_repo.realm_channels(realm.id, token),
                via_org === false
                    ? this._control_repo.realm_members(realm.id, token).then((m) => m.some((x) => x.member_type === 'user' && x.member_id === viewer.user_id && x.role === 'admin'))
                    : Promise.resolve(via_org ?? true),
            ]);
            // A failed realm-admin check means read-only (`can_edit: false`); Core still decides on write.
            warn_rejected(log, 'notif_realm_read_failed', { rules, channels, admin }, { realm_id: realm.id });
            return { realm, rules, channels, can_edit: admin.status === 'fulfilled' ? admin.value : false };
        });

        const realms: NotifRealmData[] = per_realm.map(({ realm, rules, channels, can_edit }) => {
            const failed = [rules, channels].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
            return { ...realm, status: failed ? 'error' : 'ok', error: failed ? reason(failed.reason, 'Could not load notifications') : null, can_edit };
        });

        // Channels (dedupe by id — Core may return a channel in more than one list).
        const org_by_id = new Map(orgs_in.map((o) => [o.id, o]));
        const realm_by_id = new Map(realm_ctx.map((r) => [r.id, r]));
        const channel_map = new Map<string, NotifChannelData>();
        const add_channel = (c: NotifChannelVO, fallback_org: OrgListItemVO, realm: NotifRealmRefData | null) => {
            if (channel_map.has(c.id)) return;
            const org = (c.org_id && org_by_id.get(c.org_id)) || fallback_org;
            channel_map.set(c.id, to_notif_channel_data(c, org, realm));
        };
        for (const p of per_org) if (p.channels.status === 'fulfilled') for (const c of p.channels.value) add_channel(c, p.org, null);
        for (const p of per_realm) {
            if (p.channels.status !== 'fulfilled') continue;
            const org = org_by_id.get(p.realm.org_id)!;
            for (const c of p.channels.value) add_channel(c, org, p.realm);
        }

        // Rules with scope.
        const rules: NotifRuleData[] = [];
        const to_rule = (r: NotifRuleVO, org: OrgListItemVO, realm: NotifRealmRefData | null): NotifRuleData =>
            to_notif_rule_data(r, org, realm, channel_map.get(r.channel_id)?.name ?? null);
        for (const p of per_org) if (p.rules.status === 'fulfilled') for (const r of p.rules.value) rules.push(to_rule(r, p.org, null));
        for (const p of per_realm) {
            if (p.rules.status !== 'fulfilled') continue;
            const org = org_by_id.get(p.realm.org_id)!;
            for (const r of p.rules.value) rules.push(to_rule(r, org, realm_by_id.get(p.realm.id) ?? p.realm));
        }
        mark_replaces(rules);

        const types = await best_effort(log, 'notif_event_types_failed', this._control_repo.event_types(token), null);
        const event_types: string[] = types ?? [];
        const types_failed = types === null;

        return {
            orgs,
            realms,
            channels: [...channel_map.values()].sort((a, b) => a.name.localeCompare(b.name)),
            rules: sort_rules(rules),
            event_types,
            realm_page,
            partial: types_failed || realm_page.status === 'error' || orgs.some((o) => o.status === 'error') || realms.some((r) => r.status === 'error'),
        };
    }

    /**
     * Who gets told for each event in a realm (optionally for one team): per event,
     * the rules at the winning tier and the broader rules they replace. Also lists
     * the teams that can be checked (realm roster + teams that already have rules).
     * Failed reads leave their part empty and set `partial`.
     *
     * @throws ApiError 403 when the realm's org is not one of the caller's orgs.
     */
    async check(input: NotificationCenterCheckInput, token: string): Promise<NotificationCheckData> {
        // Realm lookup is also the membership gate.
        const realm = await this._control_repo.realm_by_id(input.realm_id, token);
        const { orgs } = await this._orgs_repo.get({ mine: true }, token);
        const org = orgs.find((o) => o.slug === realm.org_slug);
        if (!org) throw new ApiError('forbidden', 'Not a member of this realm’s org', 403);

        const [org_rules, realm_rules, org_channels, realm_channels, roster, types] = await Promise.allSettled([
            this._control_repo.org_notification_rules(org.id, token),
            this._control_repo.realm_notification_rules(realm.id, token),
            this._control_repo.org_channels(org.id, token),
            this._control_repo.realm_channels(realm.id, token),
            this._teams_repo.get({ realm_id: realm.id, limit: 200 }, token),
            this._control_repo.event_types(token),
        ]);
        warn_rejected(log, 'notif_check_read_failed', { org_rules, realm_rules, org_channels, realm_channels, roster, types }, { realm_id: realm.id, org_id: org.id });
        const val = <T>(r: PromiseSettledResult<T>, d: T): T => (r.status === 'fulfilled' ? r.value : d);
        const partial = [org_rules, realm_rules, org_channels, realm_channels, roster, types].some((r) => r.status === 'rejected');

        const channel_names = new Map<string, string>();
        for (const c of [...val(org_channels, []), ...val(realm_channels, [])]) channel_names.set(c.id, c.name);

        const team_slug = input.team_slug?.trim() || null;
        const in_play: Array<TieredRule & { rule: NotifRuleVO }> = [
            ...val(org_rules, []).map((r) => ({ id: r.id, event: r.event, channel_id: r.channel_id, tier: 'org' as NotifScopeKind, rule: r })),
            ...val(realm_rules, [])
                .filter((r) => !r.team_slug || (team_slug && r.team_slug === team_slug))
                .map((r) => ({ id: r.id, event: r.event, channel_id: r.channel_id, tier: (r.team_slug ? 'team' : 'realm') as NotifScopeKind, rule: r })),
        ];

        // Every catalogued event plus any concrete events rules mention (e.g. custom.*).
        const events = new Set(val(types, [] as string[]));
        for (const r of [...val(org_rules, []), ...val(realm_rules, [])]) if (!r.event.includes('*')) events.add(r.event);

        const row_of = (t: TieredRule) => to_notif_check_entry_data(t, channel_names.get(t.channel_id) ?? null);
        const rows: NotifCheckRowData[] = [...events].sort().map((event) => {
            const { winners, replaced } = resolve_event(event, in_play);
            return { event, winners: winners.map(row_of), replaced: replaced.map(row_of) };
        });

        // Realm roster: Core `teams/get { realm_id }` → `{ items: TeamData[] }`; slug falls back to name.
        const teams = new Set<string>();
        for (const t of val(roster, null)?.items ?? []) {
            const slug = t.slug ?? t.name;
            if (slug) teams.add(slug);
        }
        for (const r of val(realm_rules, [])) if (r.team_slug) teams.add(r.team_slug);

        return {
            realm: { id: realm.id, slug: realm.slug, name: realm.name || realm.slug, org_id: org.id, org_slug: org.slug },
            team_slug,
            teams: [...teams].sort(),
            rows,
            partial,
        };
    }

    /**
     * Save one rule per event at one level, all to the same channel. Core
     * takes one event per write, so the loop lives here. Partial success is
     * reported per event with Core's code and details (409 `locked` for a
     * locked rule); when every write fails, the first error is thrown as Core sent it.
     *
     * @throws ApiError the first write's error when every write failed with an ApiError.
     */
    async set_rules(input: NotificationCenterSetRulesInput, token: string): Promise<NotifSetRulesData> {
        const events = [...new Set(input.events.map((e) => e.trim()).filter(Boolean))];
        const base = input.realm_id
            ? { realm_id: input.realm_id, ...(input.team_slug ? { team_slug: input.team_slug } : {}) }
            : { org_id: input.org_id! };
        const results = await map_limited(events, 4, async (event) => {
            try {
                const rule = await this._control_repo.set_rule({ ...base, event, channel_id: input.channel_id }, token);
                return { event, rule_id: rule?.id ?? '', error: null as unknown };
            } catch (err) {
                // One event failing must not stop the others; it is reported in `failed`.
                log.warn('notif_set_rule_failed', { ...base, channel_id: input.channel_id, event, ...error_fields(err) });
                return { event, rule_id: '', error: err };
            }
        });
        const failed = results.filter((r) => r.error);
        if (failed.length === results.length && failed[0]?.error instanceof ApiError) throw failed[0].error;
        log.info('notification_rules_set', {
            level: input.realm_id ? (input.team_slug ? 'team' : 'realm') : 'org',
            ...base, channel_id: input.channel_id,
            saved: results.length - failed.length, failed: failed.length,
        });
        return {
            saved: results.filter((r) => !r.error).map((r) => ({ event: r.event, rule_id: r.rule_id })),
            failed: failed.map((r) => ({
                event: r.event,
                error: reason(r.error, 'Could not save this rule'),
                code: r.error instanceof ApiError ? r.error.code : null,
                details: r.error instanceof ApiError ? r.error.details ?? null : null,
            })),
        };
    }
}
