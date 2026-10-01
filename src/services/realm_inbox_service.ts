import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlPageVO } from '../types/vo.js';
import type { InboxItemDTO, InboxSectionKey, InboxSectionStatusDTO, RealmInboxDTO } from '../types/dto.js';
import { ApiError } from '../repositories/api_error.js';
import { to_control_realm_dto, to_inbox_review_item, to_inbox_run_item } from '../types/mappers.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Realm inbox: pending reviews, runs awaiting input, recent failures and
 * running runs for one realm. Four Core list reads, composed here so the
 * SPA makes a single `POST /v1/realm_inbox/get`.
 */
export class RealmInboxService {
    /** Cap on merged lists returned to the SPA. */
    static readonly MAX_ITEMS = 50;

    private _control: ControlRepository;
    private _now: () => number;

    constructor(control: ControlRepository, now: () => number = Date.now) {
        this._control = control;
        this._now = now;
    }

    async get(token: string, params: { org_slug: string; slug: string }): Promise<RealmInboxDTO> {
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

        const items: InboxItemDTO[] = [
            ...value_items(reviews).map(to_inbox_review_item),
            ...value_items(awaiting).map((r) => to_inbox_run_item(r, 'input')),
            ...value_items(failed).map((r) => to_inbox_run_item(r, 'failed')),
        ];
        const live = value_items(running).map((r) => to_inbox_run_item(r, 'run'));

        const sections: Record<InboxSectionKey, InboxSectionStatusDTO> = {
            reviews: section(reviews),
            awaiting_input: section(awaiting),
            failed: section(failed),
            running: section(running),
        };

        return {
            realm: to_control_realm_dto(realm),
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

function value_items<T>(r: PromiseSettledResult<ControlPageVO<T>>): T[] {
    return r.status === 'fulfilled' ? r.value.items : [];
}

function total<T>(r: PromiseSettledResult<ControlPageVO<T>>): number {
    return r.status === 'fulfilled' ? r.value.total : 0;
}

export function section(r: PromiseSettledResult<unknown>): InboxSectionStatusDTO {
    if (r.status === 'fulfilled') return { status: 'ok', error: null };
    // Surface Core's message for structured errors; hide raw internals otherwise.
    return { status: 'error', error: r.reason instanceof ApiError ? r.reason.message : 'Could not load' };
}

export function newest_first(items: InboxItemDTO[], cap: number): InboxItemDTO[] {
    // Items without a timestamp sink to the bottom.
    return [...items].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, cap);
}
