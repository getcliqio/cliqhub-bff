/**
 * Review page (HUG packet) — one BFF read.
 * Core routes: reviews/get_by_id, orgs/get { mine } (via OrgsRepository).
 *
 * Core `reviews/get_by_id` lets a reviewer in by their notification row; anyone
 * else needs `org_id` with `reviews.view`. The browser doesn't know which org
 * a review belongs to, so the BFF tries without an org, then each of the
 * caller's orgs, and returns the first hit plus the org that worked.
 * Verdict and chat writes don't need the org: Core gates them by the
 * reviewer's notification row.
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import { ApiError } from '../errors/api_error.js';
import type { ReviewPageGetInput, ReviewPageData } from '../schemas/review_page_types.js';
import { get_logger } from '../lib/log.js';
import { best_effort } from '../lib/best_effort.js';

const log = get_logger('svc.review_page');

/** Core's `data` when the reply is enveloped, else the reply itself. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}
/** Statuses that mean "not via this org" — try the next one. */
const DENIED = new Set([403, 404]);

/** Review page (HUG packet) read. */
export class ReviewPageService {
    constructor(private readonly _reads: CoreReadRepository, private readonly _orgs: OrgsRepository) {}

    /**
     * One review packet. Without `org_id`, a 403/404 retries through each of the
     * caller's orgs; the first error is rethrown when none works.
     *
     * @param input - {@link ReviewPageGetInput}
     * @param token - Caller's Core token
     */
    async get(input: ReviewPageGetInput, token: string): Promise<ReviewPageData> {
        const get = async (org_id?: string) => data_of<Record<string, unknown>>(
            await this._reads.read('reviews.get_by_id', { review_id: input.review_id, ...(org_id ? { org_id } : {}) }, token),
        );
        let first: unknown;
        try {
            return { review: await get(input.org_id), org_id: input.org_id ?? null };
        } catch (err) {
            if (!(err instanceof ApiError) || !DENIED.has(err.status) || input.org_id) throw err;
            // Kept, not swallowed: rethrown if no org lets the caller in.
            first = err;
        }
        // Without the org list there is nothing to retry with; the first denial is rethrown below.
        const { orgs } = await best_effort(
            log, 'review_page_orgs_failed',
            this._orgs.get({ mine: true }, token), { orgs: [] as Array<{ id: string }> },
            { review_id: input.review_id },
        );
        for (const o of orgs ?? []) {
            try {
                return { review: await get(o.id), org_id: o.id };
            } catch (err) {
                // Denied through this org is expected while searching; try the next one.
                if (!(err instanceof ApiError) || !DENIED.has(err.status)) throw err;
            }
        }
        throw first;
    }
}
