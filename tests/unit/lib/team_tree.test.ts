/** Teams as a tree (PLAN-team-bundle S9): top-level teams, nesting with versions, shared teams, may-call, cycles. */
import { describe, expect, it } from 'vitest';
import { org_team_tree, realm_team_tree, ref_parts, uses_and_used_by, type TeamTreeNode } from '../../../src/lib/team_tree.js';

/** A tree as `label version [flags]` lines, indented two spaces a level. */
function lines(nodes: TeamTreeNode[], depth = 0): string[] {
    return nodes.flatMap((n) => {
        const flags = [n.pinned ? 'pinned' : '', n.may_call ? 'may call' : '', n.used_by > 1 ? `used by ${n.used_by}` : '', n.cycle ? 'cycle' : ''].filter(Boolean);
        return [`${'  '.repeat(depth)}${n.label} ${n.version ?? '-'}${flags.length ? ` [${flags.join(', ')}]` : ''}`, ...lines(n.children, depth + 1)];
    });
}

describe('ref_parts', () => {
    it('splits a ref into its team and pin', () => {
        expect(ref_parts('@acme/leaf@1.2.0')).toEqual({ label: '@acme/leaf', pin: '1.2.0' });
        expect(ref_parts('acme/leaf@latest')).toEqual({ label: '@acme/leaf', pin: null });
        expect(ref_parts('@acme/leaf')).toEqual({ label: '@acme/leaf', pin: null });
    });
});

describe('org_team_tree', () => {
    const teams = [
        { team_id: 't', label: '@acme/top', version: '1.0.0', calls: [{ ref: '@acme/mid', team_id: 'm' }, { ref: '@acme/leaf@1.0.0', team_id: 'l' }, { ref: '@acme/extra', team_id: 'e', may_call: true }] },
        { team_id: 'm', label: '@acme/mid', version: '1.0.0', calls: [{ ref: '@acme/leaf', team_id: 'l' }] },
        { team_id: 'l', label: '@acme/leaf', version: '1.1.0', calls: [] },
        { team_id: 'e', label: '@acme/extra', version: '1.0.0', calls: [] },
        { team_id: 's', label: '@acme/solo', version: '0.1.0', calls: [] },
    ];

    it('top-level teams are the rows; sub-teams nest with their version (a pin, else the latest); shared ones say how many use them', () => {
        expect(lines(org_team_tree(teams))).toEqual([
            '@acme/top 1.0.0',
            '  @acme/mid 1.0.0',
            '    @acme/leaf 1.1.0 [used by 2]',
            '  @acme/leaf 1.0.0 [pinned, used by 2]',
            '  @acme/extra 1.0.0 [may call]',
            '@acme/solo 0.1.0',
        ]);
    });

    it('a sub-team not in the list is shown, without a version unless pinned; a cycle is shown once', () => {
        expect(lines(org_team_tree([
            { team_id: 'a', label: '@acme/a', version: '1.0.0', calls: [{ ref: '@acme/outside', team_id: null }, { ref: '@acme/b', team_id: 'b' }] },
            { team_id: 'b', label: '@acme/b', version: '1.0.0', calls: [{ ref: '@acme/a', team_id: 'a' }] },
            { team_id: 'c', label: '@acme/c', version: '1.0.0', calls: [{ ref: '@acme/c', team_id: 'c' }] },
        ]))).toEqual([
            // c calls only itself: a row, its call a cycle. a and b call each other: no top-level row, so the first
            // one not reached shows as a row (b inside it, then a again as the cycle).
            '@acme/c 1.0.0',
            '  @acme/c 1.0.0 [cycle]',
            '@acme/a 1.0.0',
            '  @acme/outside -',
            '  @acme/b 1.0.0',
            '    @acme/a 1.0.0 [cycle]',
        ]);
    });
});

describe('realm_team_tree', () => {
    it('each listed team opens into exactly its installed tree', () => {
        const tree = realm_team_tree([
            {
                team_id: 't', label: '@acme/top', version: '1.0.0', version_id: 'top-1',
                tree: [
                    { parent_version_id: 'top-1', ref: '@acme/mid', team_id: 'm', version_id: 'mid-1', version: '1.0.0' },
                    { parent_version_id: 'mid-1', ref: '@acme/leaf', team_id: 'l', version_id: 'leaf-1', version: '1.0.0' },
                    { parent_version_id: 'top-1', ref: '@acme/leaf@1.1.0', team_id: 'l', version_id: 'leaf-11', version: '1.1.0' },
                ],
            },
            { team_id: 'l', label: '@acme/leaf', version: '1.1.0', version_id: 'leaf-11', tree: [] },
        ]);
        expect(lines(tree)).toEqual([
            '@acme/top 1.0.0',
            '  @acme/mid 1.0.0',
            '    @acme/leaf 1.0.0',
            '  @acme/leaf 1.1.0 [pinned]',
        ]);
    });
});

describe('uses_and_used_by', () => {
    it('lists each team\'s calls and its callers, once each', () => {
        const { uses, used_by } = uses_and_used_by([['@acme/top', '@acme/leaf@1.0.0'], ['@acme/top', '@acme/leaf'], ['@acme/mid', '@acme/leaf']]);
        expect(uses.get('@acme/top')).toEqual(['@acme/leaf']);
        expect(used_by.get('@acme/leaf')).toEqual(['@acme/top', '@acme/mid']);
    });
});
