/**
 * Dashboard — Core calls for `/internal/dashboard/*` (flat bodies, read with `post_body`).
 * Both reads are org-scoped and evaluated as the bearer — the session's
 * `target_token`, so admin take-over sees the impersonated user's view.
 */

import type { CoreClient } from './core_client.js';
import type { DashboardOrgInput, DashboardRealmsVO, DashboardSummaryVO } from '../types/core/dashboard.js';

/** Org dashboard reads (`/internal/dashboard/*`). */
export class DashboardRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /internal/dashboard/summary` — one org's counts, live runs and pending reviews. */
    async summary(input: DashboardOrgInput, token: string): Promise<DashboardSummaryVO> {
        return this._client.post_body<DashboardSummaryVO & Record<string, unknown>>('/internal/dashboard/summary', input, token);
    }

    /** `POST /internal/dashboard/realms` — one org's per-realm rollup. */
    async realms(input: DashboardOrgInput, token: string): Promise<DashboardRealmsVO> {
        return this._client.post_body<DashboardRealmsVO & Record<string, unknown>>('/internal/dashboard/realms', input, token);
    }
}
