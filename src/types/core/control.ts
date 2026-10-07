/**
 * Control-plane reads composed by BFF pages — realms, runs, run phases,
 * reviews as Core sends them (`/v1/realms/*`, `/v1/runs/*`, `/v1/reviews/*`).
 */

/** A realm header as the control-plane realm reads return it. */
export interface ControlRealmVO {
    id: string;
    slug: string;
    name: string;
    org_slug?: string | null;
}

/** A run row (`runs/get`, `runs/get_by_id`); Core sends more fields than typed. */
export interface ControlRunVO {
    run_id: string;
    realm_id?: string | null;
    team_id?: string | null;
    team_label?: string | null;
    workspace_id?: string | null;
    workspace_name?: string | null;
    daemon_id?: string | null;
    run_name?: string | null;
    state: string;
    error?: string | null;
    current_phase?: string | null;
    started_at?: number | null;
    completed_at?: number | null;
    last_updated_at?: number | null;
    /** Set on a sub-team (child) run: the run and phase that spawned it. */
    parent_run_id?: string | null;
    parent_phase?: string | null;
    root_run_id?: string | null;
    /** `runs/get` list rows only. */
    realm_slug?: string | null;
    org_slug?: string | null;
    [key: string]: unknown;
}

/** One phase of a run. */
export interface ControlRunPhaseVO {
    run_id?: string;
    phase: string;
    status: string;
    sequence?: number | null;
    started_at?: number | null;
    completed_at?: number | null;
    error?: string | null;
    agent?: string | null;
    /** Core's attempt counter for the phase row. */
    attempt?: number | null;
    /** Earlier attempts of this phase (route-backs and resumes), oldest first. */
    previous_attempts?: ControlPhaseAttemptVO[] | null;
}

/** One earlier attempt of a phase (`team_run_phases.previous_attempts`). */
export interface ControlPhaseAttemptVO {
    attempt?: number | null;
    status?: string | null;
    dispatched_at?: number | null;
    started_at?: number | null;
    completed_at?: number | null;
    exit_code?: number | null;
    error?: string | null;
}

/** A pending review request. */
export interface ControlReviewVO {
    review_id: string;
    realm_id?: string | null;
    run_id?: string | null;
    run_name?: string | null;
    phase?: string | null;
    team?: string | null;
    title?: string | null;
    message?: string | null;
    review_url?: string | null;
    requested_at?: number | null;
    notification_id?: string | null;
    status?: string | null;
    artifact_count?: number | null;
}

/** A paged control-plane list. */
export interface ControlPageVO<T> {
    items: T[];
    total: number;
}

/** One realm in `/v1/realms/get` (the caller's realms, paged). */
export interface ControlRealmListItemVO {
    id: string;
    slug: string;
    name: string;
    org_slug: string | null;
}

/** One daemon in `/v1/daemons/get { realm_id }`. */
export interface ControlDaemonVO {
    id: string;
    name: string | null;
    hostname: string | null;
    user_email: string | null;
    status: string;
    last_heartbeat: number | null;
    capacity?: number;
    created_at?: number;
    [key: string]: unknown;
}

/** One row of `/v1/realms/get_members` (users, groups and daemons). */
export interface ControlRealmMemberVO {
    member_type: string;
    member_id: string;
    username?: string | null;
    role: string;
    created_at?: number | string;
}

/** `artifacts/get` row — a stored file or a run record (Core ArtifactData). */
export interface ControlArtifactVO {
    artifact_id: string;
    source?: 'file' | 'record';
    kind?: string;
    content_preview?: string | null;
    /** The whole text of a record (`artifacts/get_by_id` only). */
    content?: string | null;
    run_id: string;
    phase: string;
    name: string;
    description: string | null;
    mime_type: string;
    size_bytes: number;
    download_url?: string | null;
    created_at: number;
}
