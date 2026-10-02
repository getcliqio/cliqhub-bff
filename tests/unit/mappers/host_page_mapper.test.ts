import { describe, it, expect } from 'vitest';
import { to_host_installable_team_data, to_host_team_data } from '../../../src/mappers/host_page_mapper.js';

describe('to_host_installable_team_data', () => {
    it('realm-mode item (Core API 5+): catalog id and scope win over sample_team_id / label', () => {
        expect(to_host_installable_team_data({
            id: 'cat-1', sample_team_id: 'dt-1', scope: 'acme', slug: 'beta', label: '@other/beta', version: '1.0.0',
        })).toEqual({ team_id: 'cat-1', scope: 'acme', slug: 'beta', version: '1.0.0' });
    });

    it('realm-mode item from an older Core: team id from sample_team_id, scope from the label', () => {
        expect(to_host_installable_team_data({ name: 'docs', slug: 'docs', label: '@m1/docs', scope: null, version: '0.3.0', sample_team_id: 't2' }))
            .toEqual({ team_id: 't2', scope: 'm1', slug: 'docs', version: '0.3.0' });
    });
    it('catalog item: id, scope, latest_version', () => {
        expect(to_host_installable_team_data({ id: 't1', name: 'x', scope: 's', latest_version: '1.0.0', version: '0.9.0' }))
            .toEqual({ team_id: 't1', scope: 's', slug: 'x', version: '1.0.0' });
    });
    it('no id at all → not installable', () => {
        expect(to_host_installable_team_data({ name: 'x', sample_team_id: null })).toBeNull();
    });
});

describe('to_host_team_data', () => {
    it('daemon-mode item (id / name / latest_version fallbacks)', () => {
        expect(to_host_team_data({ id: 't1', name: 'feature-dev', scope: 'm1', latest_version: '1.2.0' }))
            .toEqual({ team_id: 't1', scope: 'm1', slug: 'feature-dev', version: '1.2.0' });
    });
});
