/**
 * Reports — request schemas (Zod) and response data types.
 *
 * Routes (controllers/reports_controller.ts):
 *   POST /v1/reports/audit — site-admin audit log (Core `/internal/reports/audit`)
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/reports/audit — all filters optional, AND-ed. */
export const ReportsAuditInput = z.object({
    action: z.string().optional()
        .describe('Audit action, e.g. user.suspend'),
    target_type: z.string().optional()
        .describe('Kind of record acted on, e.g. user, org, team'),
    admin_id: z.string().uuid().optional()
        .describe('Only entries by this admin (user UUID)'),
    target_id: z.string().max(200).optional()
        .describe('Only entries about this record id'),
    since_ms: z.number().int().min(0).optional()
        .describe('From this time (unix ms, inclusive)'),
    until_ms: z.number().int().min(0).optional()
        .describe('Up to this time (unix ms, inclusive)'),
    limit: z.number().int().min(1).max(100).optional()
        .describe('Page size (max 100)'),
    offset: z.number().int().min(0).optional()
        .describe('Zero-based page offset'),
});
export type ReportsAuditInput = z.infer<typeof ReportsAuditInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One audit log row. */
export interface AuditLogEntryData {
    id: number;
    admin_id: string;
    admin_username: string;
    action: string;
    target_type: string;
    target_id: string;
    /** Free-form JSON text written by Core. */
    details: string;
    created_at: string;
}

/** `reports/audit` */
export interface ReportsAuditData {
    entries: AuditLogEntryData[];
    total: number;
    limit: number;
    offset: number;
}
