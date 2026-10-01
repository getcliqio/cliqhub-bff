import type { CoreApiClient } from './core_api_client.js';
import type { DashboardRealmsVO, DashboardSummaryVO } from '../types/vo.js';

/**
 * Core `/internal/dashboard/*` reads. Both are org-scoped (body `org_id`
 * required) and evaluated as the bearer — the session's `target_token`,
 * so admin take-over sees the impersonated user's view.
 */
export class DashboardRepository {
    private _core: CoreApiClient;

    constructor(core: CoreApiClient) {
        this._core = core;
    }

    async summary(org_id: string, token: string): Promise<DashboardSummaryVO> {
        return this._core.post<DashboardSummaryVO & Record<string, unknown>>('/internal/dashboard/summary', { org_id }, token);
    }

    async realms(org_id: string, token: string): Promise<DashboardRealmsVO> {
        return this._core.post<DashboardRealmsVO & Record<string, unknown>>('/internal/dashboard/realms', { org_id }, token);
    }
}
