import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { InAppNotificationPageVO, InAppNotificationVO, OrgListItemVO } from '../types/vo.js';
import type { NotifInboxDTO, NotifInboxItemDTO, NotifInboxOrgDTO, NotifInboxSummaryDTO } from '../types/dto.js';
import { ApiError } from '../repositories/api_error.js';

export type InboxListParams = {
    org_id?: string;
    realm_id?: string;
    types?: string[];
    q?: string;
    since_ms?: number;
    until_ms?: number;
    limit?: number;
};

function reason(err: unknown): string {
    return err instanceof ApiError ? err.message : 'Could not load notifications';
}

function str(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v : null;
}

/** Core row → inbox item, tagged with the org whose inbox returned it. */
export function to_inbox_item(row: InAppNotificationVO, org: OrgListItemVO | null): NotifInboxItemDTO {
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

/** Merge per-org pages: dedupe by id, newest first. */
export function merge_newest(pages: Array<{ org: OrgListItemVO; rows: InAppNotificationVO[] }>): NotifInboxItemDTO[] {
    const seen = new Map<string, NotifInboxItemDTO>();
    for (const { org, rows } of pages) {
        for (const r of rows) if (!seen.has(r.id)) seen.set(r.id, to_inbox_item(r, org));
    }
    return [...seen.values()].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
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
 * The caller's in-app inbox across every org they belong to.
 *
 * Core's `/v1/notifications/get` is bounded by one org, so the per-org
 * fan-out and merge live here — the SPA makes one call.
 */
export class InboxService {
    static readonly CONCURRENCY = 4;
    static readonly DEFAULT_LIMIT = 50;
    /** Rows per org inspected for the bell. */
    static readonly SUMMARY_WINDOW = 20;
    static readonly SUMMARY_LATEST = 6;

    private _orgs: OrgsRepository;
    private _control: ControlRepository;

    constructor(orgs: OrgsRepository, control: ControlRepository) {
        this._orgs = orgs;
        this._control = control;
    }

    async list(token: string, params: InboxListParams = {}): Promise<NotifInboxDTO> {
        const { orgs: member } = await this._orgs.get(token, { mine: true });
        const orgs = params.org_id ? member.filter((o) => o.id === params.org_id) : member;
        if (params.org_id && orgs.length === 0) throw new ApiError('forbidden', 'Not a member of that org', 403);

        const limit = params.limit ?? InboxService.DEFAULT_LIMIT;
        const body = {
            ...(params.realm_id ? { realms: [params.realm_id] } : {}),
            ...(params.types?.length ? { types: params.types } : {}),
            ...(params.q ? { q: params.q } : {}),
            ...(params.since_ms != null ? { since_ms: params.since_ms } : {}),
            ...(params.until_ms != null ? { until_ms: params.until_ms } : {}),
            // One extra row per org tells us whether there is an older page.
            limit: Math.min(limit + 1, 100),
        };
        const settled = await map_limited(orgs, InboxService.CONCURRENCY, async (org) => {
            const [page] = await Promise.allSettled([this._control.notifications({ org_id: org.id, ...body }, token)]);
            return { org, page };
        });

        const statuses: NotifInboxOrgDTO[] = settled.map(({ org, page }) => ({
            id: org.id, slug: org.slug, display_name: org.display_name || org.slug,
            status: page.status === 'fulfilled' ? 'ok' : 'error',
            error: page.status === 'rejected' ? reason(page.reason) : null,
        }));
        const ok = settled.filter((s): s is { org: OrgListItemVO; page: PromiseFulfilledResult<InAppNotificationPageVO> } => s.page.status === 'fulfilled');
        const merged = merge_newest(ok.map((s) => ({ org: s.org, rows: s.page.value.items })));
        const more = merged.length > limit || ok.some((s) => s.page.value.total > s.page.value.items.length);
        const items = merged.slice(0, limit);
        return {
            items,
            // Core's until_ms is inclusive; step 1ms back from the oldest row shown.
            next_until_ms: more && items.length ? items[items.length - 1].at - 1 : null,
            orgs: statuses,
            partial: statuses.some((s) => s.status === 'error'),
        };
    }

    /** Bell summary for the given orgs (the overview's orgs). */
    async summary(token: string, orgs: OrgListItemVO[], seen_ms: number): Promise<NotifInboxSummaryDTO> {
        if (orgs.length === 0) return { new_count: 0, capped: false, latest: [], status: 'ok' };
        const settled = await map_limited(orgs, InboxService.CONCURRENCY, async (org) => {
            const [page] = await Promise.allSettled([
                this._control.notifications({ org_id: org.id, limit: InboxService.SUMMARY_WINDOW }, token),
            ]);
            return { org, page };
        });
        const ok = settled.filter((s): s is { org: OrgListItemVO; page: PromiseFulfilledResult<InAppNotificationPageVO> } => s.page.status === 'fulfilled');
        if (ok.length === 0) return { new_count: 0, capped: false, latest: [], status: 'error' };
        const merged = merge_newest(ok.map((s) => ({ org: s.org, rows: s.page.value.items })));
        const fresh = merged.filter((i) => i.at > seen_ms);
        // If any org's whole window is new, there may be more we didn't look at.
        const capped = ok.some((s) => s.page.value.items.length >= InboxService.SUMMARY_WINDOW
            && s.page.value.items.every((r) => r.created_at > seen_ms));
        return {
            new_count: fresh.length,
            capped,
            latest: merged.slice(0, InboxService.SUMMARY_LATEST),
            status: ok.length === settled.length ? 'ok' : 'partial',
        };
    }
}
