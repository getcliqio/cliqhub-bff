import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { DashboardRepository } from '../repositories/dashboard_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { TeamsRepository } from '../repositories/teams_repository.js';
import type { NotifChannelVO, NotifRuleVO, OrgListItemVO } from '../types/vo.js';
import type {
    NotifChannelDTO, NotifOrgDTO, NotifRealmDTO, NotifRuleDTO, NotifScopeKind, NotificationCenterDTO,
    NotificationCheckDTO, NotifCheckRowDTO, NotifSetRulesDTO, NotifRealmPageDTO,
} from '../types/dto.js';
import { ApiError } from '../repositories/api_error.js';
import { destination_label, resolve_event, selectors_overlap, TIER_RANK, type Tiered_rule } from '../lib/notification_logic.js';

type Realm_ctx = { id: string; slug: string; name: string; org_id: string; org_slug: string };

/** Who is looking — the effective user (take-over aware). */
export type Notif_viewer = { user_id: string; site_admin: boolean };

/** Core permission names behind the notification write routes. */
const ORG_EDIT = 'channels.manage';
const REALM_EDIT = 'rules.manage.realm';

function reason(err: unknown, fallback: string): string {
    return err instanceof ApiError ? err.message : fallback;
}

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
    static readonly ORG_CONCURRENCY = 4;
    static readonly REALM_CONCURRENCY = 6;
    /** Realms per page (their rules + channels are fetched); org-wide data always loads. */
    static readonly REALM_PAGE = 10;

    private _orgs: OrgsRepository;
    private _dashboard: DashboardRepository;
    private _control: ControlRepository;
    private _teams: TeamsRepository;

    constructor(orgs: OrgsRepository, dashboard: DashboardRepository, control: ControlRepository, teams: TeamsRepository) {
        this._orgs = orgs;
        this._dashboard = dashboard;
        this._control = control;
        this._teams = teams;
    }

    /**
     * What the viewer may edit, mirroring Core's checks: site admin and org
     * owner → everything; otherwise the org role's permissions. Custom roles
     * are resolved with `/v1/orgs/list_roles`. Null when unknown (Core decides).
     */
    private async org_permissions(org: OrgListItemVO, viewer: Notif_viewer | null, token: string): Promise<Set<string> | 'all' | null> {
        if (viewer?.site_admin || org.role === 'owner') return 'all';
        try {
            const res = await this._orgs.list_roles({ org_id: org.id }, token);
            const role = (res.roles ?? []).find((r) => r.slug === org.role);
            if (role?.is_system) return 'all';
            return new Set(role?.permissions ?? []);
        } catch {
            return null;
        }
    }

    /**
     * Which realms this response covers: one realm (realm view), or one page
     * of Core's realm search. Only those realms' rules and channels are read.
     */
    private async realm_page(
        orgs_in: OrgListItemVO[],
        params: { org_id?: string; realm_id?: string; realm_q?: string; realm_limit?: number; realm_offset?: number },
        token: string,
    ): Promise<{ realm_ctx: Realm_ctx[]; realm_page: NotifRealmPageDTO }> {
        const by_slug = new Map(orgs_in.map((o) => [o.slug, o]));
        const limit = params.realm_limit ?? NotificationCenterService.REALM_PAGE;
        const offset = params.realm_offset ?? 0;
        const q = params.realm_q ?? null;
        try {
            if (params.realm_id) {
                // Realm lookup is also the membership gate.
                const r = await this._control.realm_by_id(params.realm_id, token);
                const org = r.org_slug ? by_slug.get(r.org_slug) : undefined;
                if (!org) throw new ApiError('forbidden', 'Realm is outside this view', 403);
                return {
                    realm_ctx: [{ id: r.id, slug: r.slug, name: r.name || r.slug, org_id: org.id, org_slug: org.slug }],
                    realm_page: { offset: 0, limit: 1, total: 1, q: null, status: 'ok', error: null },
                };
            }
            const page = await this._control.realms_page({ org_id: params.org_id, query: q ?? undefined, limit, offset }, token);
            const realm_ctx = page.items
                .map((r) => ({ r, org: r.org_slug ? by_slug.get(r.org_slug) : undefined }))
                .filter((x): x is { r: typeof x.r; org: OrgListItemVO } => Boolean(x.org))
                .map(({ r, org }) => ({ id: r.id, slug: r.slug, name: r.name || r.slug, org_id: org.id, org_slug: org.slug }));
            return { realm_ctx, realm_page: { offset, limit, total: page.total, q, status: 'ok', error: null } };
        } catch (err) {
            if (params.realm_id && err instanceof ApiError && (err.status === 403 || err.status === 404)) throw err;
            return { realm_ctx: [], realm_page: { offset, limit, total: 0, q, status: 'error', error: reason(err, 'Could not load realms') } };
        }
    }

    async get(
        token: string,
        params: { org_id?: string; realm_id?: string; realm_q?: string; realm_limit?: number; realm_offset?: number } = {},
        viewer: Notif_viewer | null = null,
    ): Promise<NotificationCenterDTO> {
        const { orgs: member_orgs } = await this._orgs.get(token, { mine: true });
        const orgs_in = params.org_id ? member_orgs.filter((o) => o.id === params.org_id) : member_orgs;
        if (params.org_id && orgs_in.length === 0) throw new ApiError('forbidden', 'Not a member of that org', 403);

        const per_org = await map_limited(orgs_in, NotificationCenterService.ORG_CONCURRENCY, async (org) => {
            const [rules, channels, perms] = await Promise.allSettled([
                this._control.org_notification_rules(org.id, token),
                this._control.org_channels(org.id, token),
                this.org_permissions(org, viewer, token),
            ]);
            return { org, rules, channels, perms: perms.status === 'fulfilled' ? perms.value : null };
        });
        const has = (org_id: string, perm: string): boolean | null => {
            const p = per_org.find((x) => x.org.id === org_id)?.perms ?? null;
            if (p === null) return null;
            return p === 'all' || p.has(perm);
        };

        const orgs: NotifOrgDTO[] = per_org.map(({ org, rules, channels }) => {
            const failed = [rules, channels].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
            return {
                id: org.id, slug: org.slug, display_name: org.display_name || org.slug, role: org.role,
                status: failed ? 'error' : 'ok',
                error: failed ? reason(failed.reason, 'Could not load notifications') : null,
                // Unknown (role lookup failed) → let Core decide on write.
                can_edit: has(org.id, ORG_EDIT) ?? true,
            };
        });

        const { realm_ctx, realm_page } = await this.realm_page(orgs_in, params, token);

        const per_realm = await map_limited(realm_ctx, NotificationCenterService.REALM_CONCURRENCY, async (realm) => {
            // Org role grants realm edits in most cases; only then ask whether the viewer is a realm admin.
            const via_org = has(realm.org_id, REALM_EDIT);
            const [rules, channels, admin] = await Promise.allSettled([
                this._control.realm_notification_rules(realm.id, token),
                this._control.realm_channels(realm.id, token),
                via_org === false && viewer
                    ? this._control.realm_members(realm.id, token).then((m) => m.some((x) => x.member_type === 'user' && x.member_id === viewer.user_id && x.role === 'admin'))
                    : Promise.resolve(via_org ?? true),
            ]);
            return { realm, rules, channels, can_edit: admin.status === 'fulfilled' ? admin.value : false };
        });

        const realms: NotifRealmDTO[] = per_realm.map(({ realm, rules, channels, can_edit }) => {
            const failed = [rules, channels].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
            return { ...realm, status: failed ? 'error' : 'ok', error: failed ? reason(failed.reason, 'Could not load notifications') : null, can_edit };
        });

        // Channels (dedupe by id — Core may return a channel in more than one list).
        const org_by_id = new Map(orgs_in.map((o) => [o.id, o]));
        const realm_by_id = new Map(realm_ctx.map((r) => [r.id, r]));
        const channel_map = new Map<string, NotifChannelDTO>();
        const add_channel = (c: NotifChannelVO, fallback_org: OrgListItemVO, realm: Realm_ctx | null) => {
            if (channel_map.has(c.id)) return;
            const org = (c.org_id && org_by_id.get(c.org_id)) || fallback_org;
            channel_map.set(c.id, {
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
            });
        };
        for (const p of per_org) if (p.channels.status === 'fulfilled') for (const c of p.channels.value) add_channel(c, p.org, null);
        for (const p of per_realm) {
            if (p.channels.status !== 'fulfilled') continue;
            const org = org_by_id.get(p.realm.org_id)!;
            for (const c of p.channels.value) add_channel(c, org, p.realm);
        }

        // Rules with scope.
        const rules: NotifRuleDTO[] = [];
        const to_rule = (r: NotifRuleVO, org: OrgListItemVO, realm: Realm_ctx | null): NotifRuleDTO => ({
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
            channel_name: channel_map.get(r.channel_id)?.name ?? null,
            priority: r.priority ?? 0,
            replaces: [],
        });
        for (const p of per_org) if (p.rules.status === 'fulfilled') for (const r of p.rules.value) rules.push(to_rule(r, p.org, null));
        for (const p of per_realm) {
            if (p.rules.status !== 'fulfilled') continue;
            const org = org_by_id.get(p.realm.org_id)!;
            for (const r of p.rules.value) rules.push(to_rule(r, org, realm_by_id.get(p.realm.id) ?? p.realm));
        }
        mark_replaces(rules);

        let event_types: string[] = [];
        let types_failed = false;
        try {
            event_types = await this._control.event_types(token);
        } catch {
            types_failed = true;
        }

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

    async check(token: string, params: { realm_id: string; team_slug?: string }): Promise<NotificationCheckDTO> {
        // Realm lookup is also the membership gate.
        const realm = await this._control.realm_by_id(params.realm_id, token);
        const { orgs } = await this._orgs.get(token, { mine: true });
        const org = orgs.find((o) => o.slug === realm.org_slug);
        if (!org) throw new ApiError('forbidden', 'Not a member of this realm’s org', 403);

        const [org_rules, realm_rules, org_channels, realm_channels, roster, types] = await Promise.allSettled([
            this._control.org_notification_rules(org.id, token),
            this._control.realm_notification_rules(realm.id, token),
            this._control.org_channels(org.id, token),
            this._control.realm_channels(realm.id, token),
            this._teams.get({ realm_id: realm.id, limit: 200 }, token),
            this._control.event_types(token),
        ]);
        const val = <T>(r: PromiseSettledResult<T>, d: T): T => (r.status === 'fulfilled' ? r.value : d);
        const partial = [org_rules, realm_rules, org_channels, realm_channels, roster, types].some((r) => r.status === 'rejected');

        const channel_names = new Map<string, string>();
        for (const c of [...val(org_channels, []), ...val(realm_channels, [])]) channel_names.set(c.id, c.name);

        const team_slug = params.team_slug?.trim() || null;
        const in_play: Array<Tiered_rule & { rule: NotifRuleVO }> = [
            ...val(org_rules, []).map((r) => ({ id: r.id, event: r.event, channel_id: r.channel_id, tier: 'org' as NotifScopeKind, rule: r })),
            ...val(realm_rules, [])
                .filter((r) => !r.team_slug || (team_slug && r.team_slug === team_slug))
                .map((r) => ({ id: r.id, event: r.event, channel_id: r.channel_id, tier: (r.team_slug ? 'team' : 'realm') as NotifScopeKind, rule: r })),
        ];

        // Every catalogued event plus any concrete events rules mention (e.g. custom.*).
        const events = new Set(val(types, [] as string[]));
        for (const r of [...val(org_rules, []), ...val(realm_rules, [])]) if (!r.event.includes('*')) events.add(r.event);

        const row_of = (t: Tiered_rule) => ({ rule_id: t.id, selector: t.event, tier: t.tier, channel_id: t.channel_id, channel_name: channel_names.get(t.channel_id) ?? null });
        const rows: NotifCheckRowDTO[] = [...events].sort().map((event) => {
            const { winners, replaced } = resolve_event(event, in_play);
            return { event, winners: winners.map(row_of), replaced: replaced.map(row_of) };
        });

        const roster_val = val(roster, {} as unknown) as { rows?: Array<{ slug?: string }>; teams?: Array<{ slug?: string }>; data?: { rows?: Array<{ slug?: string }> } };
        const roster_rows = roster_val.data?.rows ?? roster_val.rows ?? roster_val.teams ?? [];
        const teams = new Set<string>();
        for (const t of roster_rows) if (t.slug) teams.add(t.slug);
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
     * reported per event; if every write fails the same way, that error is thrown.
     */
    async set_rules(token: string, body: { org_id?: string; realm_id?: string; team_slug?: string; events: string[]; channel_id: string }): Promise<NotifSetRulesDTO> {
        const events = [...new Set(body.events.map((e) => e.trim()).filter(Boolean))];
        const base = body.realm_id
            ? { realm_id: body.realm_id, ...(body.team_slug ? { team_slug: body.team_slug } : {}) }
            : { org_id: body.org_id! };
        const results = await map_limited(events, 4, async (event) => {
            try {
                const rule = await this._control.set_rule({ ...base, event, channel_id: body.channel_id }, token);
                return { event, rule_id: rule?.id ?? '', error: null as unknown };
            } catch (err) {
                return { event, rule_id: '', error: err };
            }
        });
        const failed = results.filter((r) => r.error);
        if (failed.length === results.length && failed[0]?.error instanceof ApiError) throw failed[0].error;
        return {
            saved: results.filter((r) => !r.error).map((r) => ({ event: r.event, rule_id: r.rule_id })),
            failed: failed.map((r) => ({ event: r.event, error: reason(r.error, 'Could not save this rule') })),
        };
    }
}

/** For each rule, list broader-tier rules in the same context whose selectors overlap. */
export function mark_replaces(rules: NotifRuleDTO[]): void {
    for (const r of rules) {
        if (r.scope.kind === 'org') continue;
        r.replaces = rules
            .filter((b) => TIER_RANK[b.scope.kind] < TIER_RANK[r.scope.kind])
            .filter((b) => b.scope.org_id === r.scope.org_id)
            .filter((b) => b.scope.kind === 'org' || b.scope.realm_id === r.scope.realm_id)
            .filter((b) => selectors_overlap(b.event, r.event))
            .map((b) => b.id);
    }
}

const TIER_ORDER: Record<NotifScopeKind, number> = { org: 0, realm: 1, team: 2 };

function sort_rules(rules: NotifRuleDTO[]): NotifRuleDTO[] {
    // Group by event, then broad → specific so overrides read top-down.
    return [...rules].sort((a, b) =>
        a.event.localeCompare(b.event)
        || TIER_ORDER[a.scope.kind] - TIER_ORDER[b.scope.kind]
        || (a.scope.realm_slug ?? '').localeCompare(b.scope.realm_slug ?? '')
        || (a.scope.team_slug ?? '').localeCompare(b.scope.team_slug ?? ''));
}
