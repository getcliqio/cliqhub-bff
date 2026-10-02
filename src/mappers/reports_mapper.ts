/** Reports — Core VO → BFF data. */

import type { AuditLogEntryVO, ReportsAuditVO } from '../types/core/reports.js';
import type { AuditLogEntryData, ReportsAuditData } from '../schemas/reports_types.js';

/** Audit entry, copied as sent. */
export function to_audit_log_entry_data(vo: AuditLogEntryVO): AuditLogEntryData {
    return { ...vo };
}

/** `reports/audit` → one page of audit entries. */
export function to_reports_audit_data(vo: ReportsAuditVO): ReportsAuditData {
    return {
        entries: vo.entries.map(to_audit_log_entry_data),
        total: vo.total,
        limit: vo.limit,
        offset: vo.offset,
    };
}
