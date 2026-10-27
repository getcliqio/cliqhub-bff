/**
 * Hug page — one BFF read.
 * Core route: hugs/get_by_id.
 *
 * A Hug is seen like its run: Core lets in anyone with `runs.view` on the Hug's realm. Answers
 * go to Core directly (`/v1/hugs/respond`).
 */

import type { CoreReadRepository } from '../repositories/core_read_repository.js';
import type { HugPageGetInput, HugPageData } from '../schemas/hug_page_types.js';

/** Core's `data` when the reply is enveloped, else the reply itself. */
function data_of<T>(res: unknown): T {
    const r = res as { data?: T };
    return (r && typeof r === 'object' && 'data' in r ? r.data : res) as T;
}

/** Hug page read. */
export class HugPageService {
    constructor(private readonly _reads: CoreReadRepository) {}

    /**
     * One Hug.
     *
     * @param input - {@link HugPageGetInput}
     * @param token - Caller's Core token
     */
    async get(input: HugPageGetInput, token: string): Promise<HugPageData> {
        return { hug: data_of<Record<string, unknown>>(await this._reads.read('hugs.get_by_id', { hug_id: input.hug_id }, token)) };
    }
}
