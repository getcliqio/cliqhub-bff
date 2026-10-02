/**
 * Realm › Daemon and Realm › Workspace pages — request schemas (Zod, SoT for
 * inbound bodies) and response data.
 *
 * Routes (controllers/daemon_page_controller.ts, controllers/workspace_page_controller.ts):
 *   POST /v1/daemon_page/get    — one daemon: live teams, installable roster, workspaces, runs
 *   POST /v1/workspace_page/get — one workspace: its teams and runs
 *
 * BFF composition over Core: realms/get_by_id (realm gate, by slug), daemons/get_by_id,
 * teams/get { daemon_id } and { realm_id }, workspaces/get, workspaces/get_by_id, runs/get.
 */

import { z } from 'zod';
import { RealmRefFields } from './realm_ref.js';
import type { ControlRealmData } from './realm_inbox_types.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/daemon_page/get — realm addressed by org slug + realm slug. */
export const DaemonPageGetInput = z.object({
    ...RealmRefFields,
    daemon_id: z.string().min(1)
        .describe('Daemon id'),
});
export type DaemonPageGetInput = z.infer<typeof DaemonPageGetInput>;

/** POST /v1/workspace_page/get — realm addressed by org slug + realm slug. */
export const WorkspacePageGetInput = z.object({
    ...RealmRefFields,
    workspace_id: z.string().min(1)
        .describe('Workspace id'),
});
export type WorkspacePageGetInput = z.infer<typeof WorkspacePageGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** A run row on the daemon / workspace page. */
export interface HostRunData {
    run_id: string;
    run_name: string | null;
    state: string;
    /** Team label (`@scope/name`) or team id. */
    team: string | null;
    phase: string | null;
    started_at: number | null;
    completed_at: number | null;
    last_updated_at: number | null;
}

/** A team on a daemon / in a workspace. */
export interface HostTeamData {
    team_id: string | null;
    scope: string;
    slug: string;
    version: string | null;
}

/** A realm team the daemon doesn't have yet (always has a team id to install). */
export interface HostInstallableTeamData {
    team_id: string;
    scope: string;
    slug: string;
    version: string | null;
}

/** A workspace on the daemon. */
export interface HostWorkspaceData {
    id: string;
    name: string | null;
    path: string;
    /** `@scope/slug` labels. */
    teams: string[];
    active_runs: number;
    last_run_state: string | null;
    last_run_at: number | null;
}

/** `daemon_page/get` — null sections failed to load (`partial`). */
export interface DaemonPageData {
    realm: ControlRealmData;
    /** Core `daemons/get_by_id` daemon as sent. */
    daemon: Record<string, unknown>;
    /** Live teams from the daemon; null when it can't answer (offline). */
    installed: HostTeamData[] | null;
    /** Realm teams not on this daemon yet. */
    installable: HostInstallableTeamData[] | null;
    workspaces: HostWorkspaceData[] | null;
    runs: HostRunData[] | null;
    runs_total: number | null;
    partial: boolean;
}

/** `workspace_page/get` */
export interface WorkspacePageData {
    realm: ControlRealmData;
    /** Core `workspaces/get_by_id` workspace as sent. */
    workspace: Record<string, unknown>;
    teams: HostTeamData[];
    runs: HostRunData[] | null;
    runs_total: number | null;
    partial: boolean;
}
