/** Reports — Core calls for `/internal/reports/*`. Returns Core's `data` (VO). */

import type { CoreClient } from './core_client.js';
import type { ReportsAuditVO } from '../types/core/reports.js';
import type { ReportsAuditInput } from '../schemas/reports_types.js';

/** Core site-admin reports. */
export class ReportsRepository {
    constructor(private readonly _client: CoreClient) {}

    /** `POST /internal/reports/audit` */
    async audit(input: ReportsAuditInput, token: string): Promise<ReportsAuditVO> {
        return this._client.post<ReportsAuditVO>('/internal/reports/audit', input, token);
    }
}
