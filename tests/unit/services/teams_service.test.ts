import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsService } from '../../../src/services/teams_service.js';

const SAMPLE_LIST_VO = {
    teams: [
        { name: 'tdd-git', scope: 'cliq', description: 'TDD', author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd'], listed: true },
    ],
    total: 1,
    limit: 50,
    offset: 0,
};

const SAMPLE_DETAIL_VO = {
    name: 'tdd-git', scope: 'cliq', description: 'TDD',
    author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd'],
    license: 'MIT', visibility: 'public' as const,
    created_at: '2025-01-01', updated_at: '2025-02-01',
    versions: [{ version: '1.0.0', changelog: 'Initial', published_at: '2025-01-01' }],
    roles: [{ name: 'dev', content_md: '# Dev' }],
    workflow: { phases: [] }, agents: {},
    readme: '# TDD', cliq_version: null, tools: [],
};

describe('TeamsService', () => {
    const mock_repo = {
        get: vi.fn(),
        get_by_id: vi.fn(),
        download: vi.fn(),
        publish: vi.fn(),
        delete_team: vi.fn(),
        rename: vi.fn(),
        unpublish: vi.fn(),
        create: vi.fn(),
        get_versions: vi.fn(),
        
    };

    let service: TeamsService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new TeamsService(mock_repo as any);
    });

    describe('get', () => {
        it('maps VO to DTO and strips listed field', async () => {
            mock_repo.get.mockResolvedValue(SAMPLE_LIST_VO);

            const dto = await service.get({ tag: 'tdd' }, 'jwt');

            expect(dto.teams).toHaveLength(1);
            expect(dto.teams[0].name).toBe('tdd-git');
            expect(dto.teams[0]).not.toHaveProperty('listed');
            expect(dto.total).toBe(1);
        });

        it('passes through realm coverage payload when realm_id set', async () => {
            const coverage = { rows: [{ team: 'tdd-git', coverage: 'full' }], total: 1 };
            mock_repo.get.mockResolvedValue(coverage);

            const dto = await service.get({ realm_id: 'realm-1' }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ realm_id: 'realm-1' }, 'jwt');
            expect(dto).toEqual(coverage);
        });
        it('passes through live daemon inventory when daemon_id set', async () => {
            const live = { payload: { data: { teams: [{ team_id: 't1' }] } } };
            mock_repo.get.mockResolvedValue(live);

            const dto = await service.get({ daemon_id: 'edge-1' }, 'jwt');

            expect(mock_repo.get).toHaveBeenCalledWith({ daemon_id: 'edge-1' }, 'jwt');
            expect(dto).toEqual(live);
        });
    });

    describe('get_by_id', () => {
        it('maps detail VO to DTO', async () => {
            mock_repo.get_by_id.mockResolvedValue(SAMPLE_DETAIL_VO);

            const dto = await service.get_by_id({ name: 'tdd-git', scope: 'cliq' });

            expect(dto.name).toBe('tdd-git');
            expect(dto.versions).toHaveLength(1);
            expect(dto.readme).toBe('# TDD');
        });
    });

    describe('download', () => {
        it('maps download VO to DTO', async () => {
            mock_repo.download.mockResolvedValue({ filename: 'tdd-1.0.0.zip', data_base64: 'abc' });

            const dto = await service.download({ name: 'tdd-git' }, 'jwt');

            expect(dto.filename).toBe('tdd-1.0.0.zip');
            expect(dto.data_base64).toBe('abc');
        });
    });

    describe('publish', () => {
        it('maps publish VO to DTO', async () => {
            mock_repo.publish.mockResolvedValue({ name: 'my-team', scope: 'alice', version: '1.0.0' });

            const dto = await service.publish({ name: 'my-team', data_base64: 'abc', version: '1.0.0' }, 'jwt');

            expect(dto.name).toBe('my-team');
            expect(dto.version).toBe('1.0.0');
        });
    });

    describe('delete_team', () => {
        it('maps delete VO to DTO', async () => {
            mock_repo.delete_team.mockResolvedValue({ deleted: true });

            const dto = await service.delete_team({ name: 'tdd-git' }, 'jwt');

            expect(dto.deleted).toBe(true);
        });
    });

    describe('rename', () => {
        it('maps rename VO to DTO', async () => {
            mock_repo.rename.mockResolvedValue({ name: 'new-name', scope: 'alice' });

            const dto = await service.rename({ name: 'old-name', scope: 'alice', new_name: 'new-name' }, 'jwt');

            expect(dto.name).toBe('new-name');
            expect(dto.scope).toBe('alice');
        });
    });

    describe('unpublish', () => {
        it('maps unpublish VO to DTO', async () => {
            mock_repo.unpublish.mockResolvedValue({ status: 'draft', listed: false });

            const dto = await service.unpublish({ name: 'tdd-git' }, 'jwt');
            expect(dto.listed).toBe(false);
        });
    });


    describe('get_versions', () => {
        it('maps versions VO to DTO', async () => {
            mock_repo.get_versions.mockResolvedValue({ name: 'tdd-git', scope: null, version: '1.0.0' });

            const dto = await service.get_versions({ name: 'tdd-git' });

            expect(dto.version).toBe('1.0.0');
        });
    });

    describe('create', () => {
        it('maps create VO to DTO', async () => {
            mock_repo.create.mockResolvedValue({ id: 'uuid', status: 'draft' });

            const dto = await service.create({ name: 't', scope: 'alice' }, 'jwt');
            expect(dto.status).toBe('draft');
        });
    });

});
