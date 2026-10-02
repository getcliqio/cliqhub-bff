/**
 * Realm › Daemons — a realm's daemons with status counts, what each is
 * running and how many of the realm's teams it has ready (request schema + response data).
 *
 * Routes (controllers/realm_daemons_controller.ts):
 *   POST /v1/realm_daemons/get
 *
 * BFF composition over Core: `/v1/realms/get_by_id` → `/v1/daemons/get { realm_id }`
 * + `/v1/runs/get { running }` + `/v1/teams/get { realm_id }` (installed daemon ids per team).
 */

import { z } from 'zod';
import type { ControlRealmData } from './realm_inbox_types.js';
import { RealmRefFields } from './realm_ref.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_daemons/get */
export const RealmDaemonsGetInput = z.object({
    ...RealmRefFields,
    status: z.enum(['online', 'stale', 'offline']).optional()
        .describe('Only daemons in this state'),
    q: z.string().trim().min(1).max(200).optional()
        .describe('Match on name, hostname or id'),
}).strict();
export type RealmDaemonsGetInput = z.infer<typeof RealmDaemonsGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** One daemon row: status, load and teams ready. */
export interface RealmDaemonRowData {
    id: string;
    name: string | null;
    hostname: string | null;
    owner_email: string | null;
    status: string;
    last_heartbeat: number | null;
    capacity: number | null;
    /** Runs on this daemon that are running or waiting for input. */
    running: number;
    /** How many of the realm's listed teams this daemon has installed; null if unknown. */
    teams_ready: number | null;
}

/** `realm_daemons/get` — the realm's daemons with status chip counts. */
export interface RealmDaemonsData {
    realm: ControlRealmData;
    items: RealmDaemonRowData[];
    counts: { all: number; online: number; stale: number; offline: number };
    /** Teams on the realm's team list (denominator for teams_ready). */
    teams_total: number | null;
    /** More daemons exist than were read. */
    truncated: boolean;
    partial: boolean;
}
