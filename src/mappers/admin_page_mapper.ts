/**
 * Admin pages — Core rows → admin list rows.
 *
 * Core list rows arrive loosely typed (several controllers, several Core
 * versions), so the mappers take `Record<string, unknown>` and coerce.
 * Lookups the service resolved (realm links, daemon names, org slugs) are
 * passed in.
 */

import type {
    AdminAccountRowData, AdminAuditRowData, AdminDaemonRowData, AdminLogRowData, AdminRealmRef,
    AdminRealmRowData, AdminRunRowData, AdminScopeRowData, AdminTeamRowData, AdminWorkspaceRowData,
} from '../schemas/admin_page_types.js';
import type { UserStatus } from '../schemas/users_types.js';

type Row = Record<string, unknown>;

/** A finite number (numeric strings parsed), else null. */
function num(v: unknown): number | null {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
}
/** Epoch ms or a date string → ISO string; null when missing or unparseable. */
function iso(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'number') return new Date(v).toISOString();
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Account states Core lists (`users/get` rows). */
const USER_STATUSES: readonly UserStatus[] = ['invited', 'active', 'suspended', 'deleted'];

/** Core user row → account row (unknown roles become `user`, dates ISO; a row without a known status is `suspended` or `active` by `suspended_at`). */
export function to_account_row(u: Row): AdminAccountRowData {
    return {
        id: String(u.id),
        username: u.username == null ? null : String(u.username),
        display_name: String(u.display_name ?? ''),
        email: String(u.email ?? ''),
        role: u.role === 'admin' ? 'admin' : 'user',
        status: USER_STATUSES.includes(u.status as UserStatus) ? u.status as UserStatus : u.suspended_at ? 'suspended' : 'active',
        suspended_at: iso(u.suspended_at),
        deleted_at: iso(u.deleted_at),
        created_at: iso(u.created_at),
    };
}

/** Core daemon row → daemon row with the realms it serves. */
export function to_daemon_row(d: Row): AdminDaemonRowData {
    const realms = Array.isArray(d.realms) ? d.realms as Row[] : [];
    return {
        id: String(d.id),
        name: (d.name as string | null) ?? null,
        hostname: (d.hostname as string | null) ?? null,
        status: String(d.status ?? 'offline'),
        last_heartbeat: num(d.last_heartbeat),
        capacity: num(d.capacity),
        realms: realms.map((r) => ({ id: String(r.id), slug: String(r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null, name: String(r.name ?? r.slug ?? '') })),
    };
}

/**
 * Core `TeamData` (teams/get) → admin team row. TeamData has `author`,
 * `latest_version` ('0.0.0' when no version exists) and no `version_count`;
 * the legacy admin fields (`author_username`, `version_count`) still win when sent.
 * "No version" = `version_count === 0`, else (no count) a missing / '0.0.0' `latest_version`.
 */
export function to_team_row(t: Row): AdminTeamRowData {
    const listed = t.listed === true || t.listed === 1;
    const version_count = num(t.version_count);
    const latest = typeof t.latest_version === 'string' ? t.latest_version : null;
    const no_version = version_count !== null ? version_count === 0 : !latest || latest === '0.0.0';
    return {
        id: String(t.id),
        name: String(t.name ?? ''),
        scope: (t.scope as string | null) ?? null,
        description: (t.description as string | null) ?? null,
        visibility: String(t.visibility ?? 'private'),
        listed,
        install_count: num(t.install_count) ?? 0,
        version_count,
        author_username: (t.author_username as string | null) ?? (t.author as string | null) ?? null,
        updated_at: iso(t.updated_at),
        org_id: t.org_id ? String(t.org_id) : null,
        org_slug: (t.org_slug as string | null) ?? null,
        listed_without_version: listed && no_version,
    };
}

/** `/internal/reports/audit` entry → row (`created_at` normalised to ISO). */
export function to_audit_row(e: AdminAuditRowData): AdminAuditRowData {
    return { ...e, created_at: iso(e.created_at) ?? String(e.created_at) };
}

/** Core realm row → realm row. */
export function to_realm_row(r: Row): AdminRealmRowData {
    return { id: String(r.id), slug: String(r.slug ?? ''), name: String(r.name ?? r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null, created_by_username: (r.created_by_username as string | null) ?? null, created_at: num(r.created_at) };
}

/** Realm row → link target (runs / logs rows carry only `realm_id`). */
export function to_realm_ref(r: Row): AdminRealmRef {
    return { id: String(r.id), slug: String(r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? null };
}

/** Core workspaces/get row (carries its daemons, realms and orgs) → admin workspace row. */
export function to_workspace_row(w: Row): AdminWorkspaceRowData {
    const latest = w.latest_run as Row | null | undefined;
    const daemon_id = (w.daemon_id as string | null) ?? null;
    const list = (v: unknown) => (Array.isArray(v) ? v as Row[] : []);
    const daemons = list(w.daemons).map((d) => ({ id: String(d.id), name: (d.name as string | null) ?? null }));
    const orgs = list(w.orgs).map((o) => ({ id: String(o.id), slug: String(o.slug ?? ''), display_name: String(o.display_name ?? o.slug ?? '') }));
    const org_slug = (id: unknown) => (id ? orgs.find((o) => o.id === String(id))?.slug ?? null : null);
    return {
        id: String(w.id ?? w.workspace_id), name: (w.name as string | undefined) ?? null, path: String(w.path ?? w.workspace_dir ?? ''),
        daemon_id, daemon_name: (daemon_id ? daemons.find((d) => d.id === daemon_id)?.name : daemons[0]?.name) ?? null,
        daemons,
        realms: list(w.realms).map((r) => ({ id: String(r.id), slug: String(r.slug ?? ''), org_slug: (r.org_slug as string | null) ?? org_slug(r.org_id) })),
        orgs,
        teams: (Array.isArray(w.teams) ? w.teams as Row[] : []).map((t) => `@${t.scope}/${t.slug}`),
        active_runs: Array.isArray(w.active_runs) ? w.active_runs.length : 0,
        latest_run: latest ? { run_id: String(latest.run_id), state: String(latest.state), started_at: num(latest.started_at) } : null,
        updated_at: num(w.updated_at),
    };
}

/** Realm link target from a Core row's `realm_id` / `realm_slug` / `org_slug`. */
function realm_of(r: Row): AdminRealmRef | null {
    return r.realm_id && r.realm_slug ? { id: String(r.realm_id), slug: String(r.realm_slug), org_slug: (r.org_slug as string | null) ?? null } : null;
}

export function to_run_row(r: Row): AdminRunRowData {
    return {
        run_id: String(r.run_id), run_name: (r.run_name as string | null) ?? null, state: String(r.state ?? ''),
        team_label: (r.team_label as string | null) ?? null, daemon_id: (r.daemon_id as string | null) ?? null,
        workspace_name: (r.workspace_name as string | null) ?? null, started_at: num(r.started_at), last_updated_at: num(r.last_updated_at),
        realm: realm_of(r),
    };
}

export function to_log_row(l: Row): AdminLogRowData {
    return {
        id: String(l.id), run_id: String(l.run_id), run_name: (l.run_name as string | null) ?? null, created_at: num(l.created_at) ?? 0,
        level: String(l.level ?? 'info'), message: String(l.message ?? ''), daemon_name: (l.daemon_name as string | null) ?? null,
        team: (l.team as string | null) ?? null, realm: realm_of(l),
    };
}

export function to_scope_row(s: Row): AdminScopeRowData {
    return {
        id: String(s.id), slug: String(s.slug ?? ''), display_name: String(s.display_name ?? ''), org_id: (s.org_id as string | null) ?? null,
        org_slug: (s.org_slug as string | null) ?? null, owner_username: (s.owner_username as string | null) ?? null,
        visibility: String(s.visibility ?? 'private'), scope_type: String(s.scope_type ?? ''), team_count: num(s.team_count) ?? 0, created_at: iso(s.created_at),
    };
}
