import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsService } from '../../../src/services/teams_service.js';
import type { TeamDetailVO } from '../../../src/types/core/teams.js';

const TEAM_UUID = '00000000-0000-4000-8000-000000000001';

const SAMPLE_LIST_VO = {
    items: [
        { id: TEAM_UUID, name: 'tdd-git', scope: 'cliq', description: 'TDD', author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd'], listed: true },
    ],
    total: 1,
    limit: 50,
    offset: 0,
};

const SAMPLE_DETAIL_VO: TeamDetailVO = {
    id: TEAM_UUID,
    name: 'tdd-git', scope: 'cliq', description: 'TDD',
    author: 'alice', author_id: 'user-1', latest_version: '1.0.0', install_count: 42, tags: ['tdd'],
    license: 'MIT', visibility: 'public', status: 'published', listed: true,
    created_at: 1, updated_at: 2,
    versions: [{ version: '1.0.0', changelog: 'Initial', published_at: 1 }],
    roles: [{ name: 'dev', content_md: '# Dev' }],
    workflow: { phases: [] }, agents: {},
    readme: '# TDD', cliq_version: null, tools: [],
    raw_manifest: 'name: tdd-git', team_json: null,
    can_edit: true, can_delete: false, can_toggle_listing: true,
};

const MUTATION_VO = { id: TEAM_UUID, name: 'my-team', scope: 'alice', status: 'draft' as const, version: '0.1.0', listed: false };

describe('TeamsService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_by_id: vi.fn(),
        get_versions: vi.fn(),
        get_phases: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        download: vi.fn(),
        publish: vi.fn(),
        unpublish: vi.fn(),
        delete: vi.fn(),
        rename: vi.fn(),
    };

    let service: TeamsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new TeamsService(mock_repo as any);
    });

    describe('get', () => {
        it('maps Core PagedData to { teams, total, limit, offset } and keeps listed', async () => {
            mock_repo.get.mockResolvedValue(SAMPLE_LIST_VO);

            const data = await service.get({ tag: 'tdd' }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ tag: 'tdd' }, 'jwt');
            expect(data.teams).toHaveLength(1);
            expect(data.teams[0].name).toBe('tdd-git');
            expect(data.teams[0].slug).toBe('tdd-git');
            expect(data.teams[0].listed).toBe(true);
            expect(data).toMatchObject({ total: 1, limit: 50, offset: 0 });
            expect(data).not.toHaveProperty('items');
        });

        it('catalog sort (Browse "Recently updated" / "Name A–Z") goes to Core on API 6, with sortable', async () => {
            mock_repo.get.mockResolvedValue(SAMPLE_LIST_VO);
            const compat = (v: number) => ({ api_version: vi.fn().mockResolvedValue(v) }) as never;
            const data = await new TeamsService(mock_repo as never, compat(6)).get({ query: 'tdd', sort_by: 'updated_at', sort_dir: 'desc', limit: 20, offset: 0 }, 'jwt');
            expect(mock_repo.get).toHaveBeenLastCalledWith({ query: 'tdd', limit: 20, offset: 0, sort_by: 'updated_at', sort_dir: 'desc' }, 'jwt');
            expect(data.sortable).toEqual(['name', 'install_count', 'created_at', 'updated_at']);
            // Older Core: not sent, not offered.
            const old = await new TeamsService(mock_repo as never, compat(5)).get({ sort_by: 'name', sort_dir: 'asc' }, 'jwt');
            expect(mock_repo.get).toHaveBeenLastCalledWith({}, 'jwt');
            expect(old.sortable).toEqual([]);
        });

        it('a key from the other mode is not sent (Core would answer 400); daemon / mine modes never sort', async () => {
            mock_repo.get.mockResolvedValue(SAMPLE_LIST_VO);
            const svc = new TeamsService(mock_repo as never, { api_version: vi.fn().mockResolvedValue(6) } as never);
            await svc.get({ realm_id: 'r1', sort_by: 'name' }, 'jwt');
            expect(mock_repo.get).toHaveBeenLastCalledWith({ realm_id: 'r1' }, 'jwt');
            const realm = await svc.get({ realm_id: 'r1', sort_by: 'coverage', sort_dir: 'desc' }, 'jwt');
            expect(mock_repo.get).toHaveBeenLastCalledWith({ realm_id: 'r1', sort_by: 'coverage', sort_dir: 'desc' }, 'jwt');
            expect(realm.sortable).toEqual(['team', 'origin', 'coverage']);
            await svc.get({ daemon_id: 'd1', sort_by: 'name' }, 'jwt');
            expect(mock_repo.get.mock.lastCall![0]).not.toHaveProperty('sort_by');
            const mine = await svc.get({ mine: true, sort_by: 'install_count' }, 'jwt');
            expect(mock_repo.get).toHaveBeenLastCalledWith({ mine: true }, 'jwt');
            expect(mine.sortable).toEqual([]);
        });

        it('maps the realm roster (realm_id) to the same shape with coverage fields', async () => {
            mock_repo.get.mockResolvedValue({
                items: [{
                    name: 'tdd-git', scope: 'cliq', slug: 'tdd-git', label: 'TDD', origin: 'published',
                    sample_team_id: TEAM_UUID, installed_daemon_ids: ['d1'], installed_count: 1,
                    online_daemon_count: 1, coverage_label: 'full', missing_agents: [], in_team_list: true,
                    last_run_at: null,
                }],
                total: 1, limit: 50, offset: 0,
            });

            const data = await service.get({ realm_id: 'realm-1' }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ realm_id: 'realm-1' }, 'jwt');
            expect(data.teams[0]).toMatchObject({
                id: TEAM_UUID, origin: 'published', coverage_label: 'full', installed_daemon_ids: ['d1'],
                description: '', latest_version: '', install_count: 0, tags: [],
            });
        });

        it('maps the daemon inventory (daemon_id) to the same shape', async () => {
            mock_repo.get.mockResolvedValue({
                items: [{ name: 'local-team', scope: null, version: '0.2.0' }],
                total: 1, limit: 50, offset: 0,
            });

            const data = await service.get({ daemon_id: 'edge-1' }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ daemon_id: 'edge-1' }, 'jwt');
            expect(data.teams[0]).toMatchObject({ id: null, name: 'local-team', latest_version: '0.2.0' });
        });
    });

    describe('get_by_id', () => {
        it('maps detail VO including the caller permissions and listed', async () => {
            mock_repo.get_by_id.mockResolvedValue(SAMPLE_DETAIL_VO);

            const data = await service.get_by_id({ name: 'tdd-git', scope: 'cliq' });

            expect(mock_repo.get_by_id).toHaveBeenCalledWith({ name: 'tdd-git', scope: 'cliq' }, undefined);
            expect(data.name).toBe('tdd-git');
            expect(data.versions).toHaveLength(1);
            expect(data.readme).toBe('# TDD');
            expect(data.listed).toBe(true);
            expect(data.can_edit).toBe(true);
            expect(data.can_delete).toBe(false);
            expect(data.can_toggle_listing).toBe(true);
        });
    });

    describe('get_versions', () => {
        it('keeps version with latest_only', async () => {
            mock_repo.get_versions.mockResolvedValue({ name: 'tdd-git', scope: null, version: '1.0.0' });

            const data = await service.get_versions({ name: 'tdd-git', latest_only: true });

            expect(mock_repo.get_versions).toHaveBeenCalledWith({ name: 'tdd-git', latest_only: true }, undefined);
            expect(data.version).toBe('1.0.0');
        });

        it('normalizes Core `latest` to `version` for the full history', async () => {
            mock_repo.get_versions.mockResolvedValue({
                name: 'tdd-git', scope: 'cliq', latest: '2.0.0',
                versions: [{ version: '2.0.0', changelog: null, published_at: 2 }],
            });

            const data = await service.get_versions({ name: 'tdd-git' });

            expect(data.version).toBe('2.0.0');
            expect(data.versions).toHaveLength(1);
            expect(data).not.toHaveProperty('latest');
        });
    });

    describe('get_phases', () => {
        it('maps phases VO', async () => {
            mock_repo.get_phases.mockResolvedValue({ team_id: TEAM_UUID, version_id: null, version: '1.0.0', phases: [{ name: 'dev' }] });

            const data = await service.get_phases({ team_id: TEAM_UUID }, 'jwt');

            expect(mock_repo.get_phases).toHaveBeenCalledWith({ team_id: TEAM_UUID }, 'jwt');
            expect(data).toEqual({ team_id: TEAM_UUID, version_id: null, version: '1.0.0', phases: [{ name: 'dev' }] });
        });
    });

    describe('download', () => {
        it('maps download VO', async () => {
            mock_repo.download.mockResolvedValue({ filename: 'tdd-1.0.0.zip', data_base64: 'abc', version: '1.0.0' });

            const data = await service.download({ name: 'tdd-git' }, 'jwt');

            expect(mock_repo.download).toHaveBeenCalledWith({ name: 'tdd-git' }, 'jwt');
            expect(data).toEqual({ filename: 'tdd-1.0.0.zip', data_base64: 'abc', version: '1.0.0' });
        });
    });

    describe('mutations return TeamMutationData', () => {
        it.each([
            ['create', { name: 'my-team', scope: 'alice' }],
            ['update', { name: 'my-team', scope: 'alice', description: 'x' }],
            ['publish', { name: 'my-team', data_base64: 'abc', version: '1.0.0' }],
            ['unpublish', { name: 'my-team' }],
            ['rename', { name: 'old-name', scope: 'alice', new_name: 'my-team' }],
        ] as const)('%s', async (method, input) => {
            mock_repo[method].mockResolvedValue({ ...MUTATION_VO, extra: 'dropped' });

            const data = await (service as any)[method](input, 'jwt');

            expect(mock_repo[method]).toHaveBeenCalledWith(input, 'jwt');
            expect(data).toEqual(MUTATION_VO);
        });
    });

    describe('delete', () => {
        it('maps delete VO', async () => {
            mock_repo.delete.mockResolvedValue({ deleted: true });

            const data = await service.delete({ name: 'tdd-git' }, 'jwt');

            expect(mock_repo.delete).toHaveBeenCalledWith({ name: 'tdd-git' }, 'jwt');
            expect(data).toEqual({ deleted: true });
        });
    });
});
