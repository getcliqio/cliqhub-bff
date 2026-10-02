/**
 * Request-scoped correlation for BFF → Hub upstream calls: the request id.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

/** What each request's async context holds. */
export interface BffRequestStore {
    request_id: string;
}

/** Async context entered by middleware/request_logging.ts for every request. */
export const bff_request_als = new AsyncLocalStorage<BffRequestStore>();

/** The current request's id, or undefined outside a request (start-up, timers). */
export function current_request_id(): string | undefined {
    return bff_request_als.getStore()?.request_id;
}
