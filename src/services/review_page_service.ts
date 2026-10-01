import type { CoreApiClient } from '../repositories/core_api_client.js';
import type { OrgsRepository } from '../repositories/orgs_repository.js';
import { ApiError } from '../repositories/api_error.js';

/**
 * Review page (HUG packet) — one BFF read.
 *
 * Core `reviews/get_by_id` lets a reviewer in by their notification row; anyone
 * else needs `org_id` with `reviews.view`. The browser doesn't know which org
 * a review belongs to, so the BFF tries without an org, then each of the
 * caller's orgs, and returns the first hit plus the org that worked.
 * Verdict and chat writes don't need the org: Core gates them by the
 * reviewer's notification row.
 */
export interface ReviewPageDTO {
    review: Record<string, unknown>;
    org_id: string | null;
}

function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}
const DENIED = new Set([403, 404]);

export class ReviewPageService {
    constructor(private _core: CoreApiClient, private _orgs: OrgsRepository) {}

    async page(token: string, p: { review_id: string; org_id?: string }): Promise<ReviewPageDTO> {
        const get = async (org_id?: string) => data_of<Record<string, unknown>>(
            await this._core.post('/v1/reviews/get_by_id', { review_id: p.review_id, ...(org_id ? { org_id } : {}) }, token),
        );
        let first: unknown;
        try {
            return { review: await get(p.org_id), org_id: p.org_id ?? null };
        } catch (err) {
            if (!(err instanceof ApiError) || !DENIED.has(err.status) || p.org_id) throw err;
            first = err;
        }
        const { orgs } = await this._orgs.get(token, { mine: true }).catch(() => ({ orgs: [] as Array<{ id: string }> }));
        for (const o of orgs ?? []) {
            try {
                return { review: await get(o.id), org_id: o.id };
            } catch (err) {
                if (!(err instanceof ApiError) || !DENIED.has(err.status)) throw err;
            }
        }
        throw first;
    }
}
