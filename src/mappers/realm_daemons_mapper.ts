/** Realm › Daemons — Core daemons → realm daemon rows. */

import type { ControlDaemonVO } from '../types/core/control.js';
import type { RealmDaemonRowData } from '../schemas/realm_daemons_types.js';

/**
 * One Core daemon → a realm daemon row.
 *
 * @param d - Core daemon.
 * @param running - Its runs that are running or awaiting input.
 * @param teams_ready - How many listed realm teams it has installed; null when unknown.
 */
export function to_realm_daemon_row(d: ControlDaemonVO, running: number, teams_ready: number | null): RealmDaemonRowData {
    return {
        id: d.id,
        name: d.name,
        hostname: d.hostname,
        owner_email: d.user_email,
        status: d.status,
        last_heartbeat: d.last_heartbeat,
        capacity: d.capacity ?? null,
        running,
        teams_ready,
    };
}
