import { describe, it, expect } from 'vitest';
import {
    to_team_list_item_data, to_teams_get_data, to_team_version_data, to_team_detail_data,
    to_team_mutation_data, to_teams_download_data, to_teams_delete_data, to_teams_get_versions_data,
    to_teams_get_phases_data,
} from '../../../src/mappers/teams_mapper.js';
import type { TeamDetailVO, TeamVO } from '../../../src/types/core/teams.js';

const TEAM_UUID = '00000000-0000-4000-8000-000000000001';

const SAMPLE_TEAM: TeamVO = {
    id: TEAM_UUID,
    name: 'tdd-git',
    scope: 'cliq',
    description: 'TDD workflow',
    author: 'alice',
    latest_version: '1.0.0',
    install_count: 42,
    tags: ['tdd', 'testing'],
    listed: true,
    status: 'published',
    updated_at: 1700000000000,
};

const SAMPLE_DETAIL: TeamDetailVO = {
    id: TEAM_UUID,
    name: 'tdd-git',
    scope: 'cliq',
    description: 'TDD workflow',
    author: 'alice',
    author_id: 'user-1',
    latest_version: '1.0.0',
    install_count: 42,
    tags: ['tdd'],
    listed: false,
    status: 'published',
    license: 'MIT',
    visibility: 'public',
    created_at: 1,
    updated_at: 2,
    versions: [{ version: '1.0.0', changelog: 'Init', published_at: 1 }],
    roles: [{ name: 'dev', content_md: '# Dev' }],
    workflow: { phases: [] },
    agents: {},
    readme: '# TDD',
    cliq_version: null,
    tools: ['git'],
    raw_manifest: 'name: tdd-git',
    team_json: null,
};

describe('to_team_list_item_data', () => {
    it('maps catalog fields and keeps listed / status', () => {
        const data = to_team_list_item_data(SAMPLE_TEAM);
        expect(data).toMatchObject({
            id: TEAM_UUID, name: 'tdd-git', slug: 'tdd-git', scope: 'cliq', description: 'TDD workflow',
            author: 'alice', latest_version: '1.0.0', install_count: 42, tags: ['tdd', 'testing'],
            listed: true, status: 'published', updated_at: 1700000000000,
        });
    });

    it('fills catalog defaults for sparse rows (daemon / realm modes)', () => {
        const data = to_team_list_item_data({ name: 'local', scope: null, version: '0.3.0', sample_team_id: TEAM_UUID, slug: 'local-slug' });
        expect(data).toMatchObject({
            id: TEAM_UUID, slug: 'local-slug', description: '', author: null, latest_version: '0.3.0',
            install_count: 0, tags: [],
        });
    });

    it('uses null id when neither id nor sample_team_id is set', () => {
        expect(to_team_list_item_data({ name: 'x', scope: null }).id).toBeNull();
    });

    it('keeps realm coverage fields', () => {
        const data = to_team_list_item_data({
            name: 'x', scope: null, origin: 'local', in_team_list: false, installed_daemon_ids: ['d1', 'd2'],
            installed_count: 2, online_daemon_count: 1, coverage_label: 'partial', missing_agents: ['claude'],
            last_run_at: 5, label: 'X',
        });
        expect(data).toMatchObject({
            origin: 'local', in_team_list: false, installed_daemon_ids: ['d1', 'd2'], installed_count: 2,
            online_daemon_count: 1, coverage_label: 'partial', missing_agents: ['claude'], last_run_at: 5, label: 'X',
        });
    });
});

describe('to_teams_get_data', () => {
    it('maps Core PagedData items to teams with pagination', () => {
        const data = to_teams_get_data({ items: [SAMPLE_TEAM], total: 1, limit: 50, offset: 0 });
        expect(data.teams).toHaveLength(1);
        expect(data.teams[0].name).toBe('tdd-git');
        expect(data).toMatchObject({ total: 1, limit: 50, offset: 0 });
        expect(data).not.toHaveProperty('items');
    });

    it('defaults missing items and total', () => {
        const data = to_teams_get_data({ limit: 10, offset: 20 } as never);
        expect(data).toEqual({ teams: [], total: 0, limit: 10, offset: 20, sortable: [] });
        expect(to_teams_get_data({ items: [], total: 0, limit: 1, offset: 0 } as never, ['name']).sortable).toEqual(['name']);
    });
});

describe('to_team_version_data', () => {
    it('maps version fields', () => {
        expect(to_team_version_data({ version: '1.0.0', changelog: 'Init', published_at: 1 }))
            .toEqual({ version: '1.0.0', changelog: 'Init', published_at: 1 });
    });
});

describe('to_team_detail_data', () => {
    it('maps full detail including nested versions and listed', () => {
        const data = to_team_detail_data(SAMPLE_DETAIL);
        expect(data.name).toBe('tdd-git');
        expect(data.versions).toEqual([{ version: '1.0.0', changelog: 'Init', published_at: 1 }]);
        expect(data.license).toBe('MIT');
        expect(data.listed).toBe(false);
        expect(data.raw_manifest).toBe('name: tdd-git');
        expect(data.team_json).toBeNull();
    });

    it('passes the caller permissions through', () => {
        const data = to_team_detail_data({ ...SAMPLE_DETAIL, can_edit: true, can_delete: true, can_toggle_listing: true });
        expect(data).toMatchObject({ can_edit: true, can_delete: true, can_toggle_listing: true });
    });

    it('defaults absent permissions to false', () => {
        const data = to_team_detail_data(SAMPLE_DETAIL);
        expect(data).toMatchObject({ can_edit: false, can_delete: false, can_toggle_listing: false });
    });

    it('defaults absent raw_manifest / team_json to null', () => {
        const { raw_manifest: _r, team_json: _t, ...rest } = SAMPLE_DETAIL;
        const data = to_team_detail_data(rest as TeamDetailVO);
        expect(data.raw_manifest).toBeNull();
        expect(data.team_json).toBeNull();
    });

    it('passes the working copy through, or null when there is none', () => {
        expect(to_team_detail_data(SAMPLE_DETAIL).draft).toBeNull();
        expect(to_team_detail_data({ ...SAMPLE_DETAIL, draft: null }).draft).toBeNull();
        const draft = { manifest: '{"name":"tdd-git"}', description: 'wip', saved_at: '2026-10-05T10:00:00.000Z' };
        expect(to_team_detail_data({ ...SAMPLE_DETAIL, draft }).draft).toEqual(draft);
    });
});

describe('to_team_mutation_data', () => {
    it('maps the team after a write and drops extras', () => {
        const vo = { id: TEAM_UUID, name: 'my-team', scope: 'alice', status: 'draft' as const, version: '0.1.0', listed: false };
        expect(to_team_mutation_data({ ...vo, extra: 1 } as never)).toEqual(vo);
    });
});

describe('to_teams_download_data', () => {
    it('maps download response', () => {
        expect(to_teams_download_data({ filename: 'tdd-1.0.0.zip', data_base64: 'abc', version: '1.0.0' }))
            .toEqual({ filename: 'tdd-1.0.0.zip', data_base64: 'abc', version: '1.0.0' });
    });
});

describe('to_teams_delete_data', () => {
    it('maps deleted flag', () => {
        expect(to_teams_delete_data({ deleted: true })).toEqual({ deleted: true });
    });
});

describe('to_teams_get_versions_data', () => {
    it('keeps version (latest_only)', () => {
        expect(to_teams_get_versions_data({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' }))
            .toEqual({ name: 'tdd-git', scope: 'cliq', version: '1.0.0', versions: undefined });
    });

    it('normalizes latest to version with the history', () => {
        const data = to_teams_get_versions_data({
            name: 'tdd-git', scope: null, latest: '2.0.0',
            versions: [{ version: '2.0.0', changelog: null, published_at: 2 }],
        });
        expect(data.version).toBe('2.0.0');
        expect(data.versions).toEqual([{ version: '2.0.0', changelog: null, published_at: 2 }]);
        expect(data).not.toHaveProperty('latest');
    });

    it('prefers version over latest when both are sent', () => {
        expect(to_teams_get_versions_data({ name: 'x', scope: null, version: '1.0.0', latest: '2.0.0' }).version).toBe('1.0.0');
    });

    it('preserves a null version (no published versions)', () => {
        expect(to_teams_get_versions_data({ name: 'new-team', scope: null, version: null }).version).toBeNull();
        expect(to_teams_get_versions_data({ name: 'new-team', scope: null }).version).toBeNull();
    });
});

describe('to_teams_get_phases_data', () => {
    it('maps phases', () => {
        const vo = { team_id: TEAM_UUID, version_id: null, version: '1.0.0', phases: [{ name: 'dev' }] };
        expect(to_teams_get_phases_data(vo)).toEqual(vo);
    });
});
