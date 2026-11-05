import { describe, it, expect, vi } from 'vitest';
import { RealmTeamsService } from '../../../src/services/realm_teams_service.js';
import { is_newer, parse_label } from '../../../src/mappers/realm_teams_mapper.js';
import { ApiError } from '../../../src/errors/api_error.js';

const row = (label: string, over: Record<string, unknown> = {}) => ({ slug: label.split('/')[1], label, version: '2.4.1', origin: 'hub', in_team_list: true, installed_count: 2, online_daemon_count: 3, online_stale: 1, sub_team_updates: 2, last_run_at: 5, missing_agents: [], ...over });

function mocks() {
    return {
        control: { realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }) },
        teams: {
            get: vi.fn().mockResolvedValue({ items: [
                row('@cliq/feature-dev-js', {
                    id: 'team-fdj', version_id: 'ver-241',
                    description: 'Builds JS features', use_when: ['You have a ticket'], not_for: ['Python'],
                    required_inputs: [{ name: 'ticket', description: 'The Jira key' }],
                }),
                row('@me/local-thing', { origin: 'cli', version: null }),
            ], total: 6, offset: 0, limit: 10 }),
            get_versions: vi.fn().mockResolvedValue({ name: 'feature-dev-js', scope: 'cliq', version: '2.5.0' }),
        },
    };
}

describe('realm teams helpers', () => {
    it('parses labels and compares versions', () => {
        expect(parse_label('@cliq/feature-dev-js', 'x')).toEqual({ scope: 'cliq', slug: 'feature-dev-js' });
        expect(parse_label('bare', 'bare')).toEqual({ scope: null, slug: 'bare' });
        expect(is_newer('2.5.0', '2.4.1')).toBe(true);
        expect(is_newer('2.4.1', '2.4.1')).toBe(false);
        expect(is_newer('1.10.0', '1.9.3')).toBe(true);
        expect(is_newer(null, '1.0.0')).toBe(false);
    });
});

describe('RealmTeamsService', () => {
    it('a search: the whole list (who calls whom), then Core\'s page of every team; latest version for published teams, as the bearer', async () => {
        const m = mocks();
        const dto = await new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'prod', q: 'dev', limit: 10 }, 'tok');
        expect(m.teams.get).toHaveBeenCalledTimes(2);
        expect(m.teams.get).toHaveBeenNthCalledWith(1, { realm_id: 'r1', sort_by: 'team', sort_dir: 'asc', limit: 200, offset: 0 }, 'tok');
        expect(m.teams.get).toHaveBeenNthCalledWith(2, { realm_id: 'r1', sort_by: 'team', sort_dir: 'asc', limit: 10, offset: 0, query: 'dev' }, 'tok');
        // A search covers every team: no view, no Recently run.
        expect(dto).toMatchObject({ show: 'all', recent: [] });
        expect(m.teams.get_versions).toHaveBeenCalledTimes(1);
        expect(m.teams.get_versions).toHaveBeenCalledWith({ name: 'feature-dev-js', scope: 'cliq', latest_only: true }, 'tok');
        expect(dto.items[0]).toMatchObject({ scope: 'cliq', slug: 'feature-dev-js', latest_version: '2.5.0', update_available: true, installed_count: 2, online_daemon_count: 3, online_stale: 1 });
        // The ids realms/add_team and remove_team take (PLAN-team-bundle S4.1); a local install has none.
        expect(dto.items[0]).toMatchObject({ team_id: 'team-fdj', version_id: 'ver-241' });
        expect(dto.items[1]).toMatchObject({ origin: 'cli', update_available: false, latest_version: null, team_id: null, version_id: null });
        // Sub-team updates pass through (S8).
        expect(dto.items[0]).toMatchObject({ sub_team_updates: 2 });
        expect(dto.total).toBe(6);
    });

    it('rows carry what each team is for: description, use_when, not_for, required inputs', async () => {
        const m = mocks();
        const dto = await new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'prod', limit: 10 }, 'tok');
        expect(dto.items[0]).toMatchObject({
            description: 'Builds JS features', use_when: ['You have a ticket'], not_for: ['Python'],
            required_inputs: [{ name: 'ticket', description: 'The Jira key' }],
        });
        expect(dto.items[1]).toMatchObject({ description: null, use_when: [], not_for: [], required_inputs: [] });
    });

    it('version lookup failing is ignored; page failing fails; realm gate first', async () => {
        const m = mocks();
        m.teams.get_versions.mockRejectedValue(new Error('x'));
        const dto = await new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'prod' }, 'tok');
        expect(dto.items[0].update_available).toBe(false);
        m.control.realm_by_slug.mockRejectedValue(new ApiError('not_found', 'no', 404));
        await expect(new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'nope' }, 'tok')).rejects.toMatchObject({ status: 404 });
    });

    it('a sort_by Core supports in realm mode replaces the default team asc on the page', async () => {
        const m = mocks();
        const dto = await new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'prod', sort_by: 'origin', sort_dir: 'desc', limit: 10 }, 'tok');
        expect(m.teams.get).toHaveBeenCalledWith({ realm_id: 'r1', sort_by: 'origin', sort_dir: 'desc', limit: 10, offset: 0 }, 'tok');
        expect(dto.sortable).toEqual(['team', 'origin', 'coverage']);
    });

    it('the tree view: each listed team with its installed tree; a sub-team shows nested (S9)', async () => {
        const m = mocks();
        m.teams.get.mockResolvedValue({ items: [
            row('@acme/top', { id: 'top', version: '1.0.0', version_id: 'top-1', sub_teams: [
                { parent_version_id: 'top-1', ref: '@acme/leaf@1.0.0', team_id: 'leaf', version_id: 'leaf-1', version: '1.0.0' },
            ] }),
            row('@acme/leaf', { id: 'leaf', version: '1.0.0', version_id: 'leaf-1', in_team_list: false, sub_teams: [] }),
        ], total: 2, offset: 0, limit: 25 });
        const svc = new RealmTeamsService(m.control as never, m.teams as never);
        const dto = await svc.get({ org_slug: 'acme', slug: 'prod', show: 'all' }, 'tok');
        // The whole list fits one read: no page read.
        expect(m.teams.get).toHaveBeenCalledTimes(1);
        expect(dto.tree).toEqual([{
            label: '@acme/top', team_id: 'top', version: '1.0.0', pinned: false, may_call: false, used_by: 0, cycle: false,
            children: [{ label: '@acme/leaf', team_id: 'leaf', version: '1.0.0', pinned: true, may_call: false, used_by: 1, cycle: false, phase: null, children: [] }],
        }]);
        const all = [...dto.recent, ...dto.items];
        expect(all.map((i) => [i.label, i.uses, i.used_by])).toEqual([['@acme/top', ['@acme/leaf'], []], ['@acme/leaf', [], ['@acme/top']]]);
    });

    describe('views (Teams / All), Recently run, counts', () => {
        /** top calls mid, mid calls leaf; solo calls nothing. Runs: mid newest (only ever as top's sub-team), then top; leaf and solo never. */
        function realm(extra: ReturnType<typeof row>[] = []) {
            const m = mocks();
            m.teams.get.mockResolvedValue({ items: [
                row('@acme/top', { id: 'top', version_id: 'top-1', last_run_at: 20, last_direct_run_at: 20, sub_teams: [
                    { parent_version_id: 'top-1', ref: '@acme/mid', team_id: 'mid', version_id: 'mid-1', version: '1.0.0' },
                    { parent_version_id: 'mid-1', ref: '@acme/leaf', team_id: 'leaf', version_id: 'leaf-1', version: '1.0.0' },
                ] }),
                row('@acme/mid', { id: 'mid', version_id: 'mid-1', last_run_at: 30, last_direct_run_at: null, sub_teams: [
                    { parent_version_id: 'mid-1', ref: '@acme/leaf', team_id: 'leaf', version_id: 'leaf-1', version: '1.0.0' },
                ] }),
                row('@acme/leaf', { id: 'leaf', version_id: 'leaf-1', last_run_at: null, last_direct_run_at: null, sub_teams: [] }),
                row('@acme/solo', { id: 'solo', version_id: 'solo-1', last_run_at: null, last_direct_run_at: null, sub_teams: [] }),
                ...extra,
            ], total: 4 + extra.length, offset: 0, limit: 200 });
            return { m, svc: new RealmTeamsService(m.control as never, m.teams as never) };
        }
        const labels = (rows: Array<{ label: string }>) => rows.map((r) => r.label);

        it('Teams (the default): only teams no other team in the realm calls; Recently run first, not repeated', async () => {
            const { m, svc } = realm();
            const dto = await svc.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
            expect(m.teams.get).toHaveBeenCalledTimes(1);
            expect(dto.show).toBe('teams');
            expect(labels(dto.recent)).toEqual(['@acme/top']);
            expect(labels(dto.items)).toEqual(['@acme/solo']);
            expect(dto.total).toBe(1);
            expect(dto.counts).toEqual({ teams: 2, all: 4 });
        });

        it('All: every team; Recently run counts only direct runs (mid ran only inside top); each row says which teams call it', async () => {
            const { svc } = realm();
            const dto = await svc.get({ org_slug: 'acme', slug: 'prod', show: 'all' }, 'tok');
            expect(labels(dto.recent)).toEqual(['@acme/top']);
            expect(labels(dto.items)).toEqual(['@acme/leaf', '@acme/mid', '@acme/solo']);
            // Direct callers only: top runs mid, mid runs leaf.
            expect(dto.items.find((r) => r.label === '@acme/leaf')?.used_by).toEqual(['@acme/mid']);
            expect(dto.recent.find((r) => r.label === '@acme/top')?.used_by).toEqual([]);
        });

        it('sorts and pages the rest in the BFF; Recently run is at most 5', async () => {
            const more = Array.from({ length: 6 }, (_, i) => row(`@acme/r${i}`, { id: `r${i}`, version_id: `r${i}-1`, last_run_at: 100 + i, last_direct_run_at: 100 + i, sub_teams: [] }));
            const { svc } = realm(more);
            const dto = await svc.get({ org_slug: 'acme', slug: 'prod', show: 'all', sort_by: 'team', sort_dir: 'desc', limit: 2, offset: 1 }, 'tok');
            expect(labels(dto.recent)).toEqual(['@acme/r5', '@acme/r4', '@acme/r3', '@acme/r2', '@acme/r1']);
            // The rest, desc: top, solo, r0, mid, leaf → the page at offset 1.
            expect(labels(dto.items)).toEqual(['@acme/solo', '@acme/r0']);
            expect(dto.total).toBe(5);
            expect(dto.sortable).toEqual(['team', 'origin']);
        });

        it('Top-level keeps a sub-team people also start directly', async () => {
            const base = realm();
            base.m.teams.get.mockResolvedValue({ items: [
                ...((await base.m.teams.get()).items as Array<Record<string, unknown>>).map((r) => (r.label === '@acme/leaf' ? { ...r, last_run_at: 50, last_direct_run_at: 40 } : r)),
            ], total: 4, offset: 0, limit: 200 });
            const dto = await base.svc.get({ org_slug: 'acme', slug: 'prod' }, 'tok');
            expect(labels(dto.recent)).toEqual(['@acme/leaf', '@acme/top']);
            expect(labels(dto.items)).toEqual(['@acme/solo']);
            expect(dto.counts).toEqual({ teams: 3, all: 4 });
        });

        it('an older Core without last_direct_run_at: any run counts as direct', async () => {
            const base = realm();
            base.m.teams.get.mockResolvedValue({ items: [
                ...((await base.m.teams.get()).items as Array<Record<string, unknown>>).map(({ last_direct_run_at: _drop, ...r }) => r),
            ], total: 4, offset: 0, limit: 200 });
            const dto = await base.svc.get({ org_slug: 'acme', slug: 'prod', show: 'all' }, 'tok');
            expect(labels(dto.recent)).toEqual(['@acme/mid', '@acme/top']);
        });

        it('a realm bigger than one read pages in Core over every team (no view, no counts)', async () => {
            const m = mocks(); // 2 of 6 teams in the read
            const dto = await new RealmTeamsService(m.control as never, m.teams as never).get({ org_slug: 'acme', slug: 'prod' }, 'tok');
            expect(dto).toMatchObject({ show: 'all', counts: null, recent: [] });
            expect(m.teams.get).toHaveBeenCalledTimes(2);
        });
    });
});

