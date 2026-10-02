/**
 * Realm inbox — everything in one realm that needs a person.
 *
 * Composes Core: `/v1/realms/get_by_id { slug, org_slug }` (membership gate)
 * → `/v1/reviews/get` (pending) + `/v1/runs/get` (awaiting_input | failed+crashed 24h | running).
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlPageVO } from '../types/core/control.js';
import type {
    InboxItemData, InboxSectionKey, InboxSectionStatusData, RealmInboxData, RealmInboxGetInput,
} from '../schemas/realm_inbox_types.js';
import { ApiError } from '../errors/api_error.js';
import { get_logger, type BffLogger } from '../lib/log.js';
import { error_fields, warn_rejected } from '../lib/best_effort.js';
import { to_control_realm_data, to_inbox_review_item, to_inbox_run_item, to_section_data } from '../mappers/realm_inbox_mapper.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const log = get_logger('svc.realm_inbox');

/**
 * Realm inbox: pending reviews, runs awaiting input, recent failures and
 * running runs for one realm. Four Core list reads, composed here so the
 * SPA makes a single `POST /v1/realm_inbox/get`.
 */
export class RealmInboxService {
    /** Cap on merged lists returned to the SPA. */
    static readonly MAX_ITEMS = 50;

    constructor(
        private readonly _control: ControlRepository,
        private readonly _now: () => number = Date.now,
    ) {}

    /**
     * Pending reviews, awaiting input and failures (24h) merged newest first, plus
     * running runs. A failed section is reported in `sections` and flags `partial`.
     *
     * @param params - The realm (`org_slug` + `slug`); resolving it is the membership gate.
     * @param token - Caller's Core token (session target_token).
     */
    async get(params: RealmInboxGetInput, token: string): Promise<RealmInboxData> {
        // Realm resolution is also the membership gate — a 403/404 here fails the whole call.
        const realm = await this._control.realm_by_slug(params.org_slug, params.slug, token);
        const realm_id = realm.id;

        // Independent sections; one failing must not blank the inbox.
        const [reviews, awaiting, failed, running] = await Promise.allSettled([
            this._control.pending_reviews(realm_id, token),
            this._control.runs({ realm_id, state: 'awaiting_input', limit: 50 }, token),
            this._control.runs({ realm_id, state: ['failed', 'crashed'], since_ms: this._now() - DAY_MS, limit: 25 }, token),
            this._control.runs({ realm_id, state: 'running', limit: 25 }, token),
        ]);

        const items: InboxItemData[] = [
            ...value_items(reviews).map(to_inbox_review_item),
            ...value_items(awaiting).map((r) => to_inbox_run_item(r, 'input')),
            ...value_items(failed).map((r) => to_inbox_run_item(r, 'failed')),
        ];
        const live = value_items(running).map((r) => to_inbox_run_item(r, 'run'));

        warn_rejected(log, 'realm_inbox_section_failed', { reviews, awaiting_input: awaiting, failed, running }, { realm_id });

        const sections: Record<InboxSectionKey, InboxSectionStatusData> = {
            reviews: to_section_data(reviews),
            awaiting_input: to_section_data(awaiting),
            failed: to_section_data(failed),
            running: to_section_data(running),
        };

        return {
            realm: to_control_realm_data(realm),
            items: newest_first(items, RealmInboxService.MAX_ITEMS),
            live: newest_first(live, RealmInboxService.MAX_ITEMS),
            counts: {
                reviews: total(reviews),
                awaiting_input: total(awaiting),
                failed_24h: total(failed),
                running: total(running),
            },
            sections,
            partial: Object.values(sections).some((s) => s.status === 'error'),
        };
    }
}

/** Items of a fulfilled page read; none when it failed. */
function value_items<T>(r: PromiseSettledResult<ControlPageVO<T>>): T[] {
    return r.status === 'fulfilled' ? r.value.items : [];
}

/** Total of a fulfilled page read; 0 when it failed. */
function total<T>(r: PromiseSettledResult<ControlPageVO<T>>): number {
    return r.status === 'fulfilled' ? r.value.total : 0;
}

/** Newest first by `at`, capped. */
export function newest_first(items: InboxItemData[], cap: number): InboxItemData[] {
    // Items without a timestamp sink to the bottom.
    return [...items].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, cap);
}
