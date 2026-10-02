/** Reports — response shapes as Core sends them (`/internal/reports/*`). */

/** One site-admin audit entry. */
export interface AuditLogEntryVO {
    id: number;
    admin_id: string;
    admin_username: string;
    action: string;
    target_type: string;
    target_id: string;
    details: string;
    created_at: string;
}

/** `reports/audit` — one page of entries. */
export interface ReportsAuditVO {
    entries: AuditLogEntryVO[];
    total: number;
    limit: number;
    offset: number;
}
