import { describe, it, expect, vi } from 'vitest';
import { TeamPageService } from '../../../src/services/team_page_service.js';
import { diff_versions, to_team_phases_data as to_phases, kind_of_phase } from '../../../src/mappers/team_page_mapper.js';
import { ApiError } from '../../../src/errors/api_error.js';

const NOW = 1_800_000_000_000;
const TEAM_ID = '11111111-1111-4111-8111-111111111111';

const WF = {
    phases: [
        { name: 'fetch', type: 'pull', sources: [{ url: 'jira://X' }] },
        { name: 'architect', type: 'standard', agent: 'claude-code', depends_on: ['fetch'], review: { reviewers: '$(inputs.reviewers)' } },
        { name: 'check', type: 'gate', depends_on: ['architect'], commands: [{ run: 'npm test' }], max_iterations: 3 },
    ],
    support: [{ name: 'git-resolver', type: 'standard', agent: 'claude-code' }],
};
const ROLES = [{ name: 'architect', content_md: 'You are the architect.\nNo code.' }];

function team(over: Record<string, unknown> = {}) {
    return {
        id: TEAM_ID, name: 'feature-dev', scope: 'acme', description: 'd', status: 'published', author: 'sapan', listed: true, tags: ['x'],
        versions: [{ version: '1.2.0', changelog: 'new', published_at: 5 }, { version: '1.1.0', changelog: null, published_at: 4 }],
        workflow: WF, roles: ROLES, inputs: [{ name: 'ticket', required: true, description: 'Jira key' }],
        readme: '# hi', raw_manifest: 'name: feature-dev', can_edit: true, can_delete: true, can_toggle_listing: false,
        ...over,
    };
}

function mocks() {
    const realms = [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }, { id: 'r2', slug: 'stg', name: 'Staging', org_slug: 'acme' }];
    return {
        control: {
            realms_page: vi.fn().mockResolvedValue({ items: realms, total: 2 }),
            runs_for_team: vi.fn().mockImplementation(async (f: { limit: number; state?: unknown }) => (f.limit === 1
                ? { items: [], total: f.state === 'running' ? 1 : f.state === 'awaiting_input' ? 2 : f.state ? 3 : 9 }
                : { items: [{ run_id: 'run1', realm_id: 'r1', team_id: TEAM_ID, state: 'running', run_name: 'PROJ-1' }], total: 9 })),
            run_by_id: vi.fn().mockResolvedValue({ run_id: 'run1', realm_id: 'r1', team_id: TEAM_ID, state: 'running', team_version_id: 'v-old' }),
            run_phases: vi.fn().mockResolvedValue([{ phase: 'fetch', status: 'completed' }, { phase: 'architect', status: 'running' }]),
        },
        teams: {
            get: vi.fn().mockImplementation(async (f: { mine?: boolean; realm_id?: string }) => {
                if (f.mine) return { items: [
                    { id: 'a', name: 'feature-dev', scope: 'acme', description: 'Build features', status: 'published', latest_version: '1.2.0', author: 'sapan' },
                    { id: 'b', name: 'kyc', scope: 'acme', description: 'KYC', status: 'draft', latest_version: '0.0.0', author: 'ana' },
                    { id: 'c', name: 'scratch', scope: 'sapan', description: 'mine', status: 'published', latest_version: '0.1.0', author: 'sapan' },
                ], total: 3 };
                if (f.realm_id === 'r1') return { items: [{ slug: 'feature-dev', label: '@acme/feature-dev', version: '1.2.0', in_team_list: true, installed_count: 2, online_daemon_count: 2 }], total: 1 };
                return { items: [{ slug: 'feature-dev', label: '@acme/feature-dev', version: '1.1.0', in_team_list: true, installed_count: 1, online_daemon_count: 3 }], total: 1 };
            }),
            get_phases: vi.fn().mockImplementation(async (p: { version_id?: string }) => ({ team_id: TEAM_ID, version_id: p.version_id ?? 'v', version: p.version_id ? '1.1.0' : '1.2.0', phases: WF.phases })),
            get_by_id: vi.fn().mockImplementation(async (p: { version?: string }) => (p.version === '1.1.0'
                ? team({ workflow: { phases: WF.phases.slice(0, 2) }, roles: [{ name: 'architect', content_md: 'You are the architect.' }], inputs: [] })
                : team())),
        },
    };
}
const svc = (m: ReturnType<typeof mocks>) => new TeamPageService(m.control as never, m.teams as never, () => NOW);

describe('phase normalization + diff', () => {
    it('normalizes phases, attaches roles only where the version has one', () => {
        const { phases, support } = to_phases(WF, ROLES);
        expect(phases.map((p) => p.type)).toEqual(['pull', 'standard', 'gate']);
        expect(phases[0]).toMatchObject({ sources: ['jira://X'], role: null });
        expect(phases[1]).toMatchObject({ agent: 'claude-code', review: true, reviewers: '$(inputs.reviewers)', role: 'You are the architect.\nNo code.' });
        expect(phases[2]).toMatchObject({ commands: ['npm test'], max_iterations: 3, role: null });
        expect(support).toEqual([expect.objectContaining({ name: 'git-resolver', support: true })]);
    });

    it('diffs versions by phase, role and inputs', () => {
        const a = { phases: to_phases({ phases: WF.phases.slice(0, 2) }, [{ name: 'architect', content_md: 'A' }]).phases, inputs: [] };
        const b = { phases: to_phases(WF, [{ name: 'architect', content_md: 'A\nB' }]).phases, inputs: [{ name: 'ticket', description: null, required: true, default: null }] };
        const d = diff_versions(a, b);
        expect(d).toContainEqual(expect.objectContaining({ kind: 'added', target: 'phase', name: 'check' }));
        expect(d).toContainEqual(expect.objectContaining({ kind: 'changed', target: 'role', name: 'roles/architect.md', detail: '+1 −0 lines' }));
        expect(d).toContainEqual(expect.objectContaining({ target: 'inputs', detail: '+ ticket' }));
    });
});

describe('kind_of_phase', () => {
    it('matches the builder kinds', () => {
        expect(kind_of_phase('standard', 'claude-code')).toBe('agent');
        expect(kind_of_phase('standard', null)).toBe('agent');
        expect(kind_of_phase('gate', 'claude-code')).toBe('gate');
        expect(kind_of_phase('gate', 'hug')).toBe('human');
        expect(kind_of_phase('standard', 'exec')).toBe('script');
        expect(kind_of_phase('standard', 'curl')).toBe('fetch');
        expect(kind_of_phase('standard', 'jira')).toBe('connector');
        expect(kind_of_phase('pull', null)).toBe('connector');
        expect(kind_of_phase('push', 'curl')).toBe('fetch');
        expect(kind_of_phase('team', null)).toBe('team');
    });
});

describe('TeamPageService.list', () => {
    it('filters by scope + status, counts, phase shapes and installed-in (behind flagged)', async () => {
        const m = mocks();
        const data = await svc(m).list({ scope: 'acme', org_id: '22222222-2222-4222-8222-222222222222', status: 'all' }, 'tok');
        expect(m.teams.get).toHaveBeenCalledWith({ mine: true, limit: 200, offset: 0 }, 'tok');
        expect(m.control.realms_page).toHaveBeenCalledWith({ org_id: '22222222-2222-4222-8222-222222222222', limit: 100, offset: 0 }, 'tok');
        expect(data.counts).toEqual({ all: 2, published: 1, draft: 1 });
        expect(data.items.map((i) => i.name)).toEqual(['feature-dev', 'kyc']);
        expect(data.items[0].phase_types).toEqual(['pull', 'standard', 'gate']);
        expect(data.items[0].phase_kinds).toHaveLength(3);
        expect(data.items[0].phase_kinds![0]).toBe('connector');
        expect(data.items[0].installs.map((i) => [i.realm_slug, i.version, i.behind])).toEqual([['prod', '1.2.0', false], ['stg', '1.1.0', true]]);
        expect(data.items[1].latest_version).toBeNull();
        expect(data.partial).toBe(false);
    });

    it('status + query narrow; pages in the BFF', async () => {
        const m = mocks();
        const data = await svc(m).list({ status: 'draft', q: 'ky', limit: 1 }, 'tok');
        expect(data.items.map((i) => i.name)).toEqual(['kyc']);
        expect(data.total).toBe(1);
    });

    it('reads every page of the caller\'s teams (Core pages teams/get)', async () => {
        const m = mocks();
        const rows = Array.from({ length: 250 }, (_, i) => ({ id: `t${i}`, name: `team-${i}`, scope: 'acme', status: 'published', latest_version: '1.0.0' }));
        m.teams.get.mockImplementation(async (f: { mine?: boolean; limit?: number; offset?: number }) => (f.mine
            ? { items: rows.slice(f.offset ?? 0, (f.offset ?? 0) + (f.limit ?? 50)), total: rows.length, offset: f.offset ?? 0, limit: f.limit ?? 50 }
            : { items: [], total: 0, offset: 0, limit: 200 }));
        const data = await svc(m).list({ limit: 5 }, 'tok');
        expect(m.teams.get).toHaveBeenCalledWith({ mine: true, limit: 200, offset: 200 }, 'tok');
        expect(data.counts.all).toBe(250);
        expect(data.total).toBe(250);
    });

    it('sorts the whole list in the BFF before paging (name desc, status asc), and says it can', async () => {
        const m = mocks();
        const rows = ['b', 'a', 'd', 'c'].map((n, i) => ({ id: `t${n}`, name: n, scope: 'acme', status: i % 2 ? 'draft' : 'published', latest_version: '1.0.0' }));
        m.teams.get.mockImplementation(async (f: { mine?: boolean }) => (f.mine ? { items: rows, total: rows.length, offset: 0, limit: 200 } : { items: [], total: 0, offset: 0, limit: 200 }));
        const by_name = await svc(m).list({ sort_by: 'name', sort_dir: 'desc', limit: 2, offset: 0 }, 'tok');
        expect(by_name.items.map((i) => i.name)).toEqual(['d', 'c']);
        const page2 = await svc(m).list({ sort_by: 'name', sort_dir: 'desc', limit: 2, offset: 2 }, 'tok');
        expect(page2.items.map((i) => i.name)).toEqual(['b', 'a']);
        const by_status = await svc(m).list({ sort_by: 'status', sort_dir: 'asc' }, 'tok');
        expect(by_status.items.map((i) => `${i.status}:${i.name}`)).toEqual(['draft:a', 'draft:c', 'published:b', 'published:d']);
        expect(by_status.sortable).toEqual(['name', 'status']);
        // Without sort_by Core's order is kept.
        expect((await svc(m).list({}, 'tok')).items.map((i) => i.name)).toEqual(['b', 'a', 'd', 'c']);
    });

    it('realm lookup failing marks partial but still lists', async () => {
        const m = mocks();
        m.control.realms_page.mockRejectedValue(new Error('down'));
        const data = await svc(m).list({}, 'tok');
        expect(data.items).toHaveLength(3);
        expect(data.partial).toBe(true);
    });
});

describe('TeamPageService.list — marketplace (source catalog)', () => {
    const CATALOG = [
        { id: 'f', name: 'feature-dev', scope: 'cliq', description: 'Ticket to PR', latest_version: '1.4.2', author: 'cliq', tags: ['engineering', 'tdd'],
            install_count: 40, version_count: 12, fork_count: 3, verified: true, created_at: 10, updated_at: 900,
            phases: [{ name: 'design', type: 'standard', agent: 'claude-code' }, { name: 'design-review', type: 'gate', agent: 'hug' }, { name: 'check', type: 'gate', agent: null }] },
        { id: 'c', name: 'content-review', scope: 'cliq', description: 'Draft and edit', latest_version: '2.0.0', author: 'cliq', tags: ['content'],
            install_count: 90, version_count: 4, fork_count: 0, verified: true, created_at: 30, updated_at: 500,
            phases: [{ name: 'draft', type: 'standard', agent: 'claude-code' }] },
        { id: 'i', name: 'incident', scope: 'opsguild', description: 'PagerDuty triage', latest_version: '0.3.0', author: 'ops', tags: ['engineering'],
            install_count: 5, version_count: 2, fork_count: 1, verified: false, created_at: 20, updated_at: 700,
            phases: [{ name: 'pull', type: 'pull', agent: 'jira' }, { name: 'triage', type: 'standard', agent: 'claude-code' }] },
    ];
    function catalog_mocks() {
        const m = mocks();
        m.teams.get = vi.fn().mockImplementation(async (f: { with_workflow?: boolean; realm_id?: string; offset?: number }) => {
            if (f.realm_id === 'r1') return { items: [{ slug: 'feature-dev', label: '@cliq/feature-dev', version: '1.4.0', in_team_list: true, installed_count: 2, online_daemon_count: 1, missing_agents: [] }], total: 1 };
            if (f.with_workflow) return { items: f.offset ? [] : CATALOG, total: CATALOG.length };
            return { items: [], total: 0 };
        });
        return m;
    }

    it('lists every catalog team most installed first, with facets over the whole catalog', async () => {
        const m = catalog_mocks();
        const r = await svc(m).list({ source: 'catalog' }, 'tok');
        expect(m.teams.get).toHaveBeenCalledWith({ with_workflow: true, limit: 100, offset: 0 }, 'tok');
        expect(r.items.map((i) => i.name)).toEqual(['content-review', 'feature-dev', 'incident']);
        expect(r.items[1].catalog).toEqual({ tags: ['engineering', 'tdd'], install_count: 40, version_count: 12, fork_count: 3, verified: true, updated_at: 900, has: ['human', 'gate'], runnable: false });
        expect(r.items[2].catalog?.has).toEqual(['connector']);
        expect(r.facets).toEqual({
            tags: [{ tag: 'engineering', count: 2 }, { tag: 'content', count: 1 }, { tag: 'tdd', count: 1 }],
            publishers: [{ scope: 'cliq', count: 2, verified: true }, { scope: 'opsguild', count: 1, verified: false }],
            has: { human: 1, gate: 1, team: 0, connector: 1 },
            verified: 2, installed: null, runnable: null,
        });
        expect(r.sortable).toEqual(['popular', 'newest', 'updated', 'name']);
    });

    it('filters by tags, publisher, verified and workflow features, and sorts by newest / updated / name', async () => {
        const m = catalog_mocks();
        const s = svc(m);
        expect((await s.list({ source: 'catalog', tags: ['engineering'] }, 't')).items.map((i) => i.name)).toEqual(['feature-dev', 'incident']);
        expect((await s.list({ source: 'catalog', scope: 'opsguild' }, 't')).items.map((i) => i.name)).toEqual(['incident']);
        expect((await s.list({ source: 'catalog', verified: true, has: ['human'] }, 't')).items.map((i) => i.name)).toEqual(['feature-dev']);
        expect((await s.list({ source: 'catalog', q: 'tdd' }, 't')).items.map((i) => i.name)).toEqual(['feature-dev']);
        expect((await s.list({ source: 'catalog', sort_by: 'newest' }, 't')).items.map((i) => i.name)).toEqual(['content-review', 'incident', 'feature-dev']);
        expect((await s.list({ source: 'catalog', sort_by: 'updated' }, 't')).items.map((i) => i.name)).toEqual(['feature-dev', 'incident', 'content-review']);
        expect((await s.list({ source: 'catalog', sort_by: 'name' }, 't')).items.map((i) => i.name)).toEqual(['content-review', 'feature-dev', 'incident']);
    });

    it('with a realm: install state, behind flag, runnable teams and their counts', async () => {
        const m = catalog_mocks();
        const r = await svc(m).list({ source: 'catalog', realm_id: 'r1' }, 'tok');
        const fd = r.items.find((i) => i.name === 'feature-dev')!;
        expect(fd.installs).toEqual([expect.objectContaining({ realm_id: 'r1', version: '1.4.0', behind: true })]);
        expect(fd.catalog?.runnable).toBe(true);
        expect(r.facets).toMatchObject({ installed: 1, runnable: 1 });
        expect((await svc(m).list({ source: 'catalog', realm_id: 'r1', runnable: true }, 'tok')).items.map((i) => i.name)).toEqual(['feature-dev']);
    });

    it('refuses sort keys of the other mode', async () => {
        const m = catalog_mocks();
        await expect(svc(m).list({ source: 'catalog', sort_by: 'status' }, 't')).rejects.toMatchObject({ status: 422 });
        await expect(svc(m).list({ sort_by: 'popular' }, 't')).rejects.toMatchObject({ status: 422 });
    });
});

describe('TeamPageService.page', () => {
    it('header: where a fork came from, its fork count and when its working copy was saved', async () => {
        const m = mocks();
        m.teams.get_by_id = vi.fn().mockResolvedValue(team({
            forked_from: { team_id: 'o1', scope: 'cliq', name: 'feature-dev', version: '1.4.2', latest_version: '1.5.0' },
            fork_count: 2, draft: { manifest: 'name: x', description: null, saved_at: '2026-10-03T10:00:00.000Z' },
        }));
        const r = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'settings' }, 't');
        expect(r.team).toMatchObject({
            forked_from: { team_id: 'o1', scope: 'cliq', name: 'feature-dev', version: '1.4.2', latest_version: '1.5.0' },
            fork_count: 2, draft_saved_at: '2026-10-03T10:00:00.000Z',
        });
        const plain = await svc(mocks()).page({ scope: 'acme', name: 'feature-dev', view: 'settings' }, 't');
        expect(plain.team).toMatchObject({ forked_from: null, fork_count: 0, draft_saved_at: null });
    });

    it('overview: header, permissions, counts, installs', async () => {
        const m = mocks();
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'overview' }, 'tok');
        expect(m.teams.get_by_id).toHaveBeenCalledWith({ name: 'feature-dev', scope: 'acme' }, 'tok');
        expect(data.team).toMatchObject({ id: TEAM_ID, label: '@acme/feature-dev', latest_version: '1.2.0', version: '1.2.0', can_edit: true, can_toggle_listing: false });
        expect(data.counts).toEqual({ phases: 3, versions: 2, runs: 9 });
        expect(data.overview?.agents).toEqual(['claude-code']);
        expect(data.overview?.inputs).toEqual([{ name: 'ticket', description: 'Jira key', required: true, default: null }]);
        expect(data.overview?.installs.map((i) => i.realm_slug)).toEqual(['prod', 'stg']);
        expect(m.teams.get).toHaveBeenCalledWith({ realm_id: 'r1', limit: 20, offset: 0, query: 'feature-dev' }, 'tok');
        expect(m.control.runs_for_team).toHaveBeenCalledWith({ team_id: TEAM_ID, limit: 1 }, 'tok');
    });

    it('workflow: latest run overlay, gated by run_by_id, with the run’s own version graph', async () => {
        const m = mocks();
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'workflow', run_id: 'latest' }, 'tok');
        expect(m.control.run_by_id).toHaveBeenCalledWith('run1', 'tok');
        expect(m.teams.get_phases).toHaveBeenCalledWith({ team_id: TEAM_ID, version_id: 'v-old' }, 'tok');
        expect(data.workflow?.overlay).toMatchObject({ version: '1.1.0', statuses: { fetch: 'completed', architect: 'running' }, run: { run_id: 'run1', realm_slug: 'prod' } });
        expect(data.workflow?.overlay?.phases).toHaveLength(3);
        expect(data.workflow?.recent_runs).toHaveLength(1);
    });

    it('workflow: a run of another team is never overlaid', async () => {
        const m = mocks();
        m.control.run_by_id.mockResolvedValue({ run_id: 'x', team_id: 'other', state: 'running' });
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'workflow', run_id: 'x' }, 'tok');
        expect(data.workflow?.overlay).toBeNull();
        expect(m.control.run_phases).not.toHaveBeenCalled();
    });

    it('files: team.yml, README and one file per role', async () => {
        const data = await svc(mocks()).page({ scope: 'acme', name: 'feature-dev', view: 'files' }, 'tok');
        expect(data.files?.files.map((f) => f.path)).toEqual(['team.yml', 'README.md', 'roles/architect.md']);
    });

    it('runs: team_id filter, state chips, failed = failed+crashed in 7d, realm slugs', async () => {
        const m = mocks();
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'runs', state: 'failed', realm_id: 'r1', limit: 10 }, 'tok');
        expect(m.control.runs_for_team).toHaveBeenCalledWith({ team_id: TEAM_ID, realm_id: 'r1', state: ['failed', 'crashed'], since_ms: NOW - 7 * 86400000, limit: 10, offset: 0 }, 'tok');
        expect(data.runs?.counts).toEqual({ all: 9, running: 1, awaiting_input: 2, failed_7d: 3 });
        expect(data.runs?.items[0]).toMatchObject({ run_id: 'run1', realm_slug: 'prod', org_slug: 'acme' });
        expect(data.runs?.realms).toHaveLength(2);
    });

    it('runs: sort_by / sort_dir and the search reach runs/get in Core\'s names (page only)', async () => {
        const m = mocks();
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'runs', q: 'PROJ', sort_by: 'state', sort_dir: 'desc', limit: 10 }, 'tok');
        expect(m.control.runs_for_team).toHaveBeenCalledWith({ team_id: TEAM_ID, query: 'PROJ', sort_by: 'state', sort_dir: 'desc', limit: 10, offset: 0 }, 'tok');
        expect(m.control.runs_for_team.mock.calls.filter(([f]: [Record<string, unknown>]) => f.limit === 1).every(([f]: [Record<string, unknown>]) => !('sort_by' in f))).toBe(true);
        expect(data.runs?.sortable).toContain('started_at');
    });

    it('installs: installed + not-installed realms', async () => {
        const m = mocks();
        m.teams.get.mockImplementation(async (f: { realm_id?: string }) => (f.realm_id === 'r1'
            ? { items: [{ slug: 'feature-dev', label: '@acme/feature-dev', version: '1.1.0', in_team_list: true, installed_count: 1, online_daemon_count: 2 }], total: 1 }
            : { items: [{ slug: 'feature-dev', label: '@other/feature-dev', version: '9', in_team_list: true, installed_count: 1 }], total: 1 }));
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'installs' }, 'tok');
        expect(data.installs?.items).toEqual([expect.objectContaining({ realm_slug: 'prod', version: '1.1.0', behind: true, installed_count: 1, online_daemon_count: 2 })]);
        expect(data.installs?.not_installed.map((r) => r.slug)).toEqual(['stg']);
    });

    it('versions: compares the previous version with the shown one by default', async () => {
        const m = mocks();
        const data = await svc(m).page({ scope: 'acme', name: 'feature-dev', view: 'versions' }, 'tok');
        expect(m.teams.get_by_id).toHaveBeenCalledWith({ name: 'feature-dev', scope: 'acme', version: '1.1.0' }, 'tok');
        expect(data.versions?.items.map((v) => [v.version, v.is_latest])).toEqual([['1.2.0', true], ['1.1.0', false]]);
        expect(data.versions?.compare).toMatchObject({ from: '1.1.0', to: '1.2.0' });
        expect(data.versions?.compare?.changes).toContainEqual(expect.objectContaining({ kind: 'added', name: 'check' }));
    });

    it('team not visible → 404 propagates', async () => {
        const m = mocks();
        m.teams.get_by_id.mockRejectedValue(new ApiError('not_found', 'Team not found', 404));
        await expect(svc(m).page({ scope: 'acme', name: 'nope', view: 'overview' }, 'tok')).rejects.toMatchObject({ status: 404 });
    });
});
