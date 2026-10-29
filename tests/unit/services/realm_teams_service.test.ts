import { describe, it, expect, vi } from 'vitest';
import { RealmTeamsService } from '../../../src/services/realm_teams_service.js';
import { is_newer, parse_label } from '../../../src/mappers/realm_teams_mapper.js';
import { ApiError } from '../../../src/errors/api_error.js';

const row = (label: string, over: Record<string, unknown> = {}) => ({ slug: label.split('/')[1], label, version: '2.4.1', origin: 'hub', in_team_list: true, installed_count: 2, online_daemon_count: 3, online_stale: 1, last_run_at: 5, missing_agents: [], ...over });

function mocks() {
    return {
        control: { realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }) },
        teams: {
            get: vi.fn().mockResolvedValue({ items: [
                row('@cliq/feature-dev-js', {
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
    it('one page read + latest version for published teams, as the bearer', async () => {
        const m = mocks();
        const dto = await new RealmTeamsService(m.control as any, m.teams as any).get({ org_slug: 'acme', slug: 'prod', q: 'dev', limit: 10 }, 'tok');
        expect(m.teams.get).toHaveBeenCalledTimes(1);
        expect(m.teams.get).toHaveBeenCalledWith({ realm_id: 'r1', sort_by: 'team', sort_dir: 'asc', limit: 10, offset: 0, query: 'dev' }, 'tok');
        expect(m.teams.get_versions).toHaveBeenCalledTimes(1);
        expect(m.teams.get_versions).toHaveBeenCalledWith({ name: 'feature-dev-js', scope: 'cliq', latest_only: true }, 'tok');
        expect(dto.items[0]).toMatchObject({ scope: 'cliq', slug: 'feature-dev-js', latest_version: '2.5.0', update_available: true, installed_count: 2, online_daemon_count: 3, online_stale: 1 });
        expect(dto.items[1]).toMatchObject({ origin: 'cli', update_available: false, latest_version: null });
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
});
