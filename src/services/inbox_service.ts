/**
 * Inbox — the caller's in-app notifications across every org they belong to.
 *
 * Composes Core: `POST /v1/orgs/get { mine }` → per org `POST /v1/notifications/get`.
 */

import { get_logger } from '../lib/log.js';
import { error_fields } from '../lib/best_effort.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import type { ControlRepository } from '../repositories/control_repository.js';
import type { InAppNotificationPageVO } from '../types/core/notifications.js';
import type { OrgListItemVO } from '../types/core/orgs.js';
import type { InboxGetInput, InboxSummaryInput, NotifInboxData, NotifInboxOrgData, NotifInboxSummaryData } from '../schemas/inbox_types.js';
import { to_merged_inbox_items_data } from '../mappers/inbox_mapper.js';
import { ApiError } from '../errors/api_error.js';

const log = get_logger('svc.inbox');

/** Message shown for a failed org: Core's own message for an ApiError, else a generic one. */
function reason(err: unknown): string {
    return err instanceof ApiError ? err.message : 'Could not load notifications';
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
 * The caller's in-app inbox across every org they belong to.
 *
 * Core's `/v1/notifications/get` is bounded by one org, so the per-org
 * fan-out and merge live here — the SPA makes one call.
 */
export class InboxService {
    /** Orgs read in parallel. */
    static readonly CONCURRENCY = 4;
    /** Page size when the caller gives none. */
    static readonly DEFAULT_LIMIT = 50;
    /** Rows per org inspected for the bell. */
    static readonly SUMMARY_WINDOW = 20;
    /** Rows returned for the bell's dropdown. */
    static readonly SUMMARY_LATEST = 6;

    constructor(
        private readonly _orgs: OrgsRepository,
        private readonly _control: ControlRepository,
    ) {}

    /**
     * One page of notifications across the caller's orgs (or one org), newest first.
     * One org failing marks it `error` (and the page `partial`) instead of failing the call.
     *
     * @param input - Filters + cursor (`until_ms`); `org_id` must be a membership → else 403.
     * @param token - The caller's Core token (session `target_token`).
     * @throws ApiError 403 when `org_id` is not one of the caller's orgs.
     */
    async get(input: InboxGetInput, token: string): Promise<NotifInboxData> {
        const { orgs: member } = await this._orgs.get({ mine: true }, token);
        const orgs = input.org_id ? member.filter((o) => o.id === input.org_id) : member;
        if (input.org_id && orgs.length === 0) throw new ApiError('forbidden', 'Not a member of that org', 403);

        const limit = input.limit ?? InboxService.DEFAULT_LIMIT;
        const body = {
            ...(input.realm_id ? { realms: [input.realm_id] } : {}),
            ...(input.types?.length ? { types: input.types } : {}),
            ...(input.q ? { q: input.q } : {}),
            ...(input.since_ms != null ? { since_ms: input.since_ms } : {}),
            ...(input.until_ms != null ? { until_ms: input.until_ms } : {}),
            // One extra row per org tells us whether there is an older page.
            limit: Math.min(limit + 1, 100),
        };
        const settled = await map_limited(orgs, InboxService.CONCURRENCY, async (org) => {
            const [page] = await Promise.allSettled([this._control.notifications({ org_id: org.id, ...body }, token)]);
            // The failed org is reported in `orgs[]` (status error) and the page is `partial`.
            if (page.status === 'rejected') log.warn('inbox_org_failed', { org_id: org.id, ...error_fields(page.reason) });
            return { org, page };
        });

        const statuses: NotifInboxOrgData[] = settled.map(({ org, page }) => ({
            id: org.id, slug: org.slug, display_name: org.display_name || org.slug,
            status: page.status === 'fulfilled' ? 'ok' : 'error',
            error: page.status === 'rejected' ? reason(page.reason) : null,
        }));
        const ok = settled.filter((s): s is { org: OrgListItemVO; page: PromiseFulfilledResult<InAppNotificationPageVO> } => s.page.status === 'fulfilled');
        const merged = to_merged_inbox_items_data(ok.map((s) => ({ org: s.org, rows: s.page.value.items })));
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

    /**
     * Bell summary for the given orgs (the overview's orgs): new-row count since `seen_ms`
     * over the newest SUMMARY_WINDOW rows per org, plus the latest few rows.
     *
     * @param input - Orgs to look at and when the inbox was last opened.
     * @param token - The caller's Core token.
     */
    async summary(input: InboxSummaryInput, token: string): Promise<NotifInboxSummaryData> {
        const { orgs, seen_ms } = input;
        if (orgs.length === 0) return { new_count: 0, capped: false, latest: [], status: 'ok' };
        const settled = await map_limited(orgs, InboxService.CONCURRENCY, async (org) => {
            const [page] = await Promise.allSettled([
                this._control.notifications({ org_id: org.id, limit: InboxService.SUMMARY_WINDOW }, token),
            ]);
            // Counted from the orgs that answered; status says `partial` / `error`.
            if (page.status === 'rejected') log.warn('inbox_summary_org_failed', { org_id: org.id, ...error_fields(page.reason) });
            return { org, page };
        });
        const ok = settled.filter((s): s is { org: OrgListItemVO; page: PromiseFulfilledResult<InAppNotificationPageVO> } => s.page.status === 'fulfilled');
        if (ok.length === 0) return { new_count: 0, capped: false, latest: [], status: 'error' };
        const merged = to_merged_inbox_items_data(ok.map((s) => ({ org: s.org, rows: s.page.value.items })));
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
