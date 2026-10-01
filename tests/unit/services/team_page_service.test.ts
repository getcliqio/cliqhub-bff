import { describe, it, expect, vi } from 'vitest';
import { TeamPageService, diff_versions, to_phases, kind_of_phase } from '../../../src/services/team_page_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

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
        const dto = await svc(m).list('tok', { scope: 'acme', org_id: '22222222-2222-4222-8222-222222222222', status: 'all' });
        expect(m.teams.get).toHaveBeenCalledWith({ mine: true }, 'tok');
        expect(m.control.realms_page).toHaveBeenCalledWith({ org_id: '22222222-2222-4222-8222-222222222222', limit: 100, offset: 0 }, 'tok');
        expect(dto.counts).toEqual({ all: 2, published: 1, draft: 1 });
        expect(dto.items.map((i) => i.name)).toEqual(['feature-dev', 'kyc']);
        expect(dto.items[0].phase_types).toEqual(['pull', 'standard', 'gate']);
        expect(dto.items[0].phase_kinds).toHaveLength(3);
        expect(dto.items[0].phase_kinds![0]).toBe('connector');
        expect(dto.items[0].installs.map((i) => [i.realm_slug, i.version, i.behind])).toEqual([['prod', '1.2.0', false], ['stg', '1.1.0', true]]);
        expect(dto.items[1].latest_version).toBeNull();
        expect(dto.partial).toBe(false);
    });

    it('status + query narrow; pages in the BFF', async () => {
        const m = mocks();
        const dto = await svc(m).list('tok', { status: 'draft', q: 'ky', limit: 1 });
        expect(dto.items.map((i) => i.name)).toEqual(['kyc']);
        expect(dto.total).toBe(1);
    });

    it('realm lookup failing marks partial but still lists', async () => {
        const m = mocks();
        m.control.realms_page.mockRejectedValue(new Error('down'));
        const dto = await svc(m).list('tok', {});
        expect(dto.items).toHaveLength(3);
        expect(dto.partial).toBe(true);
    });
});

describe('TeamPageService.page', () => {
    it('overview: header, permissions, counts, installs', async () => {
        const m = mocks();
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'overview' });
        expect(m.teams.get_by_id).toHaveBeenCalledWith({ name: 'feature-dev', scope: 'acme' }, 'tok');
        expect(dto.team).toMatchObject({ id: TEAM_ID, label: '@acme/feature-dev', latest_version: '1.2.0', version: '1.2.0', can_edit: true, can_toggle_listing: false });
        expect(dto.counts).toEqual({ phases: 3, versions: 2, runs: 9 });
        expect(dto.overview?.agents).toEqual(['claude-code']);
        expect(dto.overview?.inputs).toEqual([{ name: 'ticket', description: 'Jira key', required: true, default: null }]);
        expect(dto.overview?.installs.map((i) => i.realm_slug)).toEqual(['prod', 'stg']);
        expect(m.teams.get).toHaveBeenCalledWith({ realm_id: 'r1', limit: 20, offset: 0, query: 'feature-dev' }, 'tok');
        expect(m.control.runs_for_team).toHaveBeenCalledWith({ team_id: TEAM_ID, limit: 1 }, 'tok');
    });

    it('workflow: latest run overlay, gated by run_by_id, with the run’s own version graph', async () => {
        const m = mocks();
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'workflow', run_id: 'latest' });
        expect(m.control.run_by_id).toHaveBeenCalledWith('run1', 'tok');
        expect(m.teams.get_phases).toHaveBeenCalledWith({ team_id: TEAM_ID, version_id: 'v-old' }, 'tok');
        expect(dto.workflow?.overlay).toMatchObject({ version: '1.1.0', statuses: { fetch: 'completed', architect: 'running' }, run: { run_id: 'run1', realm_slug: 'prod' } });
        expect(dto.workflow?.overlay?.phases).toHaveLength(3);
        expect(dto.workflow?.recent_runs).toHaveLength(1);
    });

    it('workflow: a run of another team is never overlaid', async () => {
        const m = mocks();
        m.control.run_by_id.mockResolvedValue({ run_id: 'x', team_id: 'other', state: 'running' });
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'workflow', run_id: 'x' });
        expect(dto.workflow?.overlay).toBeNull();
        expect(m.control.run_phases).not.toHaveBeenCalled();
    });

    it('files: team.yml, README and one file per role', async () => {
        const dto = await svc(mocks()).page('tok', { scope: 'acme', name: 'feature-dev', view: 'files' });
        expect(dto.files?.files.map((f) => f.path)).toEqual(['team.yml', 'README.md', 'roles/architect.md']);
    });

    it('runs: team_id filter, state chips, failed = failed+crashed in 7d, realm slugs', async () => {
        const m = mocks();
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'runs', state: 'failed', realm_id: 'r1', limit: 10 });
        expect(m.control.runs_for_team).toHaveBeenCalledWith({ team_id: TEAM_ID, realm_id: 'r1', state: ['failed', 'crashed'], since_ms: NOW - 7 * 86400000, limit: 10, offset: 0 }, 'tok');
        expect(dto.runs?.counts).toEqual({ all: 9, running: 1, awaiting_input: 2, failed_7d: 3 });
        expect(dto.runs?.items[0]).toMatchObject({ run_id: 'run1', realm_slug: 'prod', org_slug: 'acme' });
        expect(dto.runs?.realms).toHaveLength(2);
    });

    it('installs: installed + not-installed realms', async () => {
        const m = mocks();
        m.teams.get.mockImplementation(async (f: { realm_id?: string }) => (f.realm_id === 'r1'
            ? { items: [{ slug: 'feature-dev', label: '@acme/feature-dev', version: '1.1.0', in_team_list: true, installed_count: 1, online_daemon_count: 2 }], total: 1 }
            : { items: [{ slug: 'feature-dev', label: '@other/feature-dev', version: '9', in_team_list: true, installed_count: 1 }], total: 1 }));
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'installs' });
        expect(dto.installs?.items).toEqual([expect.objectContaining({ realm_slug: 'prod', version: '1.1.0', behind: true, installed_count: 1, online_daemon_count: 2 })]);
        expect(dto.installs?.not_installed.map((r) => r.slug)).toEqual(['stg']);
    });

    it('versions: compares the previous version with the shown one by default', async () => {
        const m = mocks();
        const dto = await svc(m).page('tok', { scope: 'acme', name: 'feature-dev', view: 'versions' });
        expect(m.teams.get_by_id).toHaveBeenCalledWith({ name: 'feature-dev', scope: 'acme', version: '1.1.0' }, 'tok');
        expect(dto.versions?.items.map((v) => [v.version, v.is_latest])).toEqual([['1.2.0', true], ['1.1.0', false]]);
        expect(dto.versions?.compare).toMatchObject({ from: '1.1.0', to: '1.2.0' });
        expect(dto.versions?.compare?.changes).toContainEqual(expect.objectContaining({ kind: 'added', name: 'check' }));
    });

    it('team not visible → 404 propagates', async () => {
        const m = mocks();
        m.teams.get_by_id.mockRejectedValue(new ApiError('not_found', 'Team not found', 404));
        await expect(svc(m).page('tok', { scope: 'acme', name: 'nope', view: 'overview' })).rejects.toMatchObject({ status: 404 });
    });
});
