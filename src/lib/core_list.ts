/**
 * Core list reads — the two fields every list body needs translated:
 *
 * - free-text search: the SPA / CLI send `search`, `q` or `query`; Core's list
 *   schemas only know `query` (`notifications/get` and `runs/get_logs` take `q`)
 *   and Zod strips anything else, so a misnamed field silently returns every row.
 *   {@link core_query} picks the first non-empty term and names it `query`.
 * - sort: Core accepts `sort_by` / `sort_dir` on its list reads, some since
 *   Core API 6. {@link CORE_SORT_KEYS} is THE capability map: the keys each
 *   read accepts and the Core API version that brought them. {@link core_sort}
 *   forwards a sort only when the running Core supports that key (an older
 *   Core drops the field silently and answers in its default order), and
 *   services return {@link sortable_keys} so the SPA shows sort headers only
 *   where they work.
 *
 * When Core adds sort keys, add them here with their `since` API version —
 * nothing else in the BFF or the SPA needs to change.
 */

/** Sort direction (Core's `sort_dir`). */
export type SortDir = 'asc' | 'desc';

/** Core API version that brought `sort_by` to the admin / catalog lists (cliqhub-core src/lib/api_version.ts). */
export const CORE_SORT_API_VERSION = 6;

/**
 * Sort keys per Core list read (`<core read>` or `<core read>:<mode>` where
 * one route has several list modes) and the Core API version since which
 * Core accepts them (0 = before Core versioned its API).
 */
export const CORE_SORT_KEYS = {
    /** `realms/get` (RealmGetInput). */
    'realms.get': { since: 0, keys: ['slug', 'name', 'created_at', 'updated_at', 'created_by'] },
    /** `runs/get` (RunsGetInput). */
    'runs.get': { since: 0, keys: ['run_name', 'state', 'team', 'started_at', 'last_updated_at'] },
    /** `teams/get { realm_id }` — realm roster mode (TeamsGetInput). */
    'teams.get:realm': { since: 0, keys: ['team', 'origin', 'coverage'] },
    /** `teams/get` catalog (marketplace) and site-admin `listed` / `scope` listing. */
    'teams.get:catalog': { since: CORE_SORT_API_VERSION, keys: ['name', 'install_count', 'created_at', 'updated_at'] },
    /** `orgs/get` (site-admin list). */
    'orgs.get': { since: CORE_SORT_API_VERSION, keys: ['slug', 'display_name', 'member_count', 'scope_count', 'created_at'] },
    /** `orgs/get_scopes`. */
    'orgs.get_scopes': { since: CORE_SORT_API_VERSION, keys: ['slug', 'visibility', 'team_count', 'created_at'] },
    /** `users/get` (site-admin hub list). */
    'users.get': { since: CORE_SORT_API_VERSION, keys: ['username', 'role', 'created_at', 'suspended_at'] },
    /** `daemons/get`. */
    'daemons.get': { since: CORE_SORT_API_VERSION, keys: ['name', 'status', 'last_heartbeat'] },
    /** `workspaces/get` (stored list). */
    'workspaces.get': { since: CORE_SORT_API_VERSION, keys: ['name', 'created_at'] },
    /** `/internal/reports/audit`. */
    'reports.audit': { since: CORE_SORT_API_VERSION, keys: ['created_at', 'action'] },
} as const satisfies Record<string, { since: number; keys: readonly string[] }>;

/** A list read named in {@link CORE_SORT_KEYS}. */
export type CoreSortRead = keyof typeof CORE_SORT_KEYS;

/** The sort part of a list body as Core takes it. */
export interface CoreSortBody<K extends string = string> {
    sort_by?: K;
    sort_dir?: SortDir;
}

/** The trimmed first non-empty search term, or undefined. */
export function search_term(...values: Array<string | null | undefined>): string | undefined {
    for (const v of values) {
        const t = v?.trim();
        if (t) return t;
    }
    return undefined;
}

/**
 * Core's search field: `{ query }` from the first non-empty alias, else `{}`.
 *
 * @param values - The aliases in priority order (e.g. `input.query, input.search`).
 */
export function core_query(...values: Array<string | null | undefined>): { query?: string } {
    const query = search_term(...values);
    return query ? { query } : {};
}

/**
 * Sort keys the running Core applies on `read` (empty when it applies none).
 *
 * @param read - The Core list read.
 * @param api_version - The running Core's API version (null / undefined = unknown → only keys from before versioning).
 */
export function sortable_keys(read: CoreSortRead, api_version?: number | null): string[] {
    const entry = CORE_SORT_KEYS[read];
    return entry.since <= (api_version ?? 0) ? [...entry.keys] : [];
}

/**
 * `{ sort_by, sort_dir }` for Core when the running Core supports `sort_by`
 * on `read`, else `fallback` (Core would drop the field and use its default
 * order). `sort_dir` alone is never sent — every Core sort defaults its
 * direction per key.
 *
 * @param read - The Core list read the body goes to.
 * @param input - The request's `sort_by` / `sort_dir`.
 * @param fallback - The page's default order, sent when no supported sort was asked for.
 * @param api_version - The running Core's API version (see {@link sortable_keys}).
 */
export function core_sort<K extends string = string>(
    read: CoreSortRead,
    input: { sort_by?: K | null; sort_dir?: SortDir | null },
    fallback: CoreSortBody<K> = {},
    api_version?: number | null,
): CoreSortBody<K> {
    if (!input.sort_by || !sortable_keys(read, api_version).includes(input.sort_by)) return { ...fallback };
    return { sort_by: input.sort_by, ...(input.sort_dir ? { sort_dir: input.sort_dir } : {}) };
}
