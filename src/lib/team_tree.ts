/**
 * Teams as a tree (PLAN-team-bundle S9, §2.10): built here from what the existing reads return — each listed
 * team's sub-team calls (Org Teams: its latest version's, recorded at publish; a realm: its installed tree) — so
 * no endpoint is added. Pure.
 *
 * - The rows are the top-level teams: the listed teams no other listed team calls.
 * - Each opens into its sub-teams, nested, with the version used (pinned, or the latest).
 * - A team called by more than one listed team is marked with how many ("used by 2").
 * - A dynamic map's allowed teams are "may call".
 * - A team already on the path isn't opened again (a cycle shows once).
 */

/** One node of the tree. */
export interface TeamTreeNode {
    /** `@scope/slug`. */
    label: string;
    /** The catalog team; null when it isn't on CliqHub. */
    team_id: string | null;
    /** The version shown: the pin, the installed one, or the latest known (null when unknown). */
    version: string | null;
    /** The ref pins this version (else it is the latest). */
    pinned: boolean;
    /** From a dynamic map's `teams:` list. */
    may_call: boolean;
    /** How many listed teams call this team. */
    used_by: number;
    /** It is already on the path above (a cycle): not opened again. */
    cycle: boolean;
    children: TeamTreeNode[];
}

/** One listed team, as the Org Teams read has it: its latest version and that version's calls. */
export interface OrgTreeTeam {
    team_id: string | null;
    label: string;
    version: string | null;
    calls: ReadonlyArray<{ ref: string; team_id: string | null; may_call?: boolean }>;
}

/** One listed team, as a realm's read has it: its installed version and its installed tree. */
export interface RealmTreeTeam {
    team_id: string | null;
    label: string;
    version: string | null;
    version_id: string | null;
    /** Every call of the installed tree, at any depth. */
    tree: ReadonlyArray<{ parent_version_id: string; ref: string; team_id: string; version_id: string; version: string }>;
}

/** A ref's parts: `@scope/slug` and its pinned version (`@latest` pins nothing). */
export function ref_parts(ref: string): { label: string; pin: string | null } {
    const m = /^@?([^/@\s]+)\/([^/@\s]+)(?:@([\w.-]+))?$/.exec(ref.trim());
    if (!m) return { label: ref, pin: null };
    const pin = m[3] && m[3].toLowerCase() !== 'latest' ? m[3] : null;
    return { label: `@${m[1]}/${m[2]}`, pin };
}

/** Who calls whom among the listed teams: label → the labels of the listed teams calling it. */
function callers(edges: ReadonlyArray<readonly [string, string]>): Map<string, Set<string>> {
    const by = new Map<string, Set<string>>();
    for (const [parent, child] of edges) {
        if (parent === child) continue;
        if (!by.has(child)) by.set(child, new Set());
        by.get(child)!.add(parent);
    }
    return by;
}

/**
 * The Org Teams tree: each team opens into its latest version's calls; a called team in the list opens in turn.
 *
 * @param teams - Every listed team (the whole list, not one page).
 * @returns The top-level teams, nested.
 */
export function org_team_tree(teams: readonly OrgTreeTeam[]): TeamTreeNode[] {
    const by_label = new Map(teams.map((t) => [t.label, t]));
    const used = callers(teams.flatMap((t) => t.calls.map((c) => [t.label, ref_parts(c.ref).label] as const)));
    const node = (t: OrgTreeTeam, path: Set<string>): TeamTreeNode => ({
        label: t.label, team_id: t.team_id, version: t.version, pinned: false, may_call: false,
        used_by: used.get(t.label)?.size ?? 0, cycle: false,
        children: t.calls.map((c) => {
            const { label, pin } = ref_parts(c.ref);
            const listed = by_label.get(label);
            const cycle = path.has(label);
            const inner = listed && !cycle ? node(listed, new Set([...path, label])) : null;
            return {
                label, team_id: c.team_id ?? listed?.team_id ?? null, version: pin ?? listed?.version ?? null, pinned: Boolean(pin),
                may_call: Boolean(c.may_call), used_by: used.get(label)?.size ?? 0, cycle, children: inner?.children ?? [],
            };
        }),
    });
    return with_unreached(teams, used, (t) => node(t, new Set([t.label])));
}

/**
 * The top-level rows, then any listed team they don't reach (teams that only call each other have no top-level
 * row, but must still show).
 */
function with_unreached<T extends { label: string }>(teams: readonly T[], used: Map<string, Set<string>>, node: (t: T) => TeamTreeNode): TeamTreeNode[] {
    const roots = teams.filter((t) => !used.has(t.label)).map(node);
    const reached = new Set<string>();
    const walk = (n: TeamTreeNode) => { reached.add(n.label); n.children.forEach(walk); };
    roots.forEach(walk);
    for (const t of teams) {
        if (reached.has(t.label)) continue;
        const extra = node(t);
        walk(extra);
        roots.push(extra);
    }
    return roots;
}

/**
 * A realm's tree: each team on the list opens into exactly its installed tree.
 *
 * @param teams - The realm's listed teams (the whole list).
 * @returns The top-level teams, nested.
 */
export function realm_team_tree(teams: readonly RealmTreeTeam[]): TeamTreeNode[] {
    const used = callers(teams.flatMap((t) => t.tree.map((c) => [t.label, ref_parts(c.ref).label] as const)));
    const node = (t: RealmTreeTeam): TeamTreeNode => {
        const children_of = (version_id: string | null, path: Set<string>): TeamTreeNode[] => t.tree
            .filter((c) => c.parent_version_id === version_id)
            .map((c) => {
                const { label, pin } = ref_parts(c.ref);
                const cycle = path.has(label);
                return {
                    label, team_id: c.team_id, version: c.version, pinned: Boolean(pin), may_call: false,
                    used_by: used.get(label)?.size ?? 0, cycle, children: cycle ? [] : children_of(c.version_id, new Set([...path, label])),
                };
            });
        return {
            label: t.label, team_id: t.team_id, version: t.version, pinned: false, may_call: false,
            used_by: used.get(t.label)?.size ?? 0, cycle: false, children: children_of(t.version_id, new Set([t.label])),
        };
    };
    return with_unreached(teams, used, node);
}

/**
 * The flat view's columns: for each listed team, the teams it calls ("Uses") and the listed teams calling it
 * ("Used by").
 *
 * @param edges - [caller label, called ref] for every call.
 */
export function uses_and_used_by(edges: ReadonlyArray<readonly [string, string]>): { uses: Map<string, string[]>; used_by: Map<string, string[]> } {
    const uses = new Map<string, string[]>();
    const used_by = new Map<string, string[]>();
    for (const [parent, ref] of edges) {
        const { label } = ref_parts(ref);
        if (!(uses.get(parent) ?? []).includes(label)) uses.set(parent, [...(uses.get(parent) ?? []), label]);
        if (!(used_by.get(label) ?? []).includes(parent)) used_by.set(label, [...(used_by.get(label) ?? []), parent]);
    }
    return { uses, used_by };
}
