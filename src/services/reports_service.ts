/** Reports — site-admin reports read from Core. */

import type { ReportsRepository } from '../repositories/reports_repository.js';
import type { ReportsAuditInput, ReportsAuditData } from '../schemas/reports_types.js';
import { to_reports_audit_data } from '../mappers/reports_mapper.js';

/** Site-admin reports. */
export class ReportsService {
    constructor(private readonly _repo: ReportsRepository) {}

    /** The audit log page matching the filters. */
    async audit(input: ReportsAuditInput, token: string): Promise<ReportsAuditData> {
        return to_reports_audit_data(await this._repo.audit(input, token));
    }
}
