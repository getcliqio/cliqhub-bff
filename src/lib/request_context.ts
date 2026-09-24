/**
 * Request-scoped correlation for BFF → Hub upstream calls.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface BffRequestStore {
    request_id: string;
}

export const bff_request_als = new AsyncLocalStorage<BffRequestStore>();

export function current_request_id(): string | undefined {
    return bff_request_als.getStore()?.request_id;
}
