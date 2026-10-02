import { describe, it, expect } from 'vitest';
import { CORE_SORT_API_VERSION, CORE_SORT_KEYS, core_query, core_sort, search_term, sortable_keys } from '../../../src/lib/core_list.js';

describe('core_query', () => {
    it('names the first non-empty, trimmed alias `query`', () => {
        expect(core_query(undefined, '  acme ')).toEqual({ query: 'acme' });
        expect(core_query('Acme Corp', 'other')).toEqual({ query: 'Acme Corp' });
        expect(core_query('   ', null, undefined)).toEqual({});
        expect(search_term('', 'x')).toBe('x');
    });
});

describe('core_sort', () => {
    it('forwards only keys Core supports on that read', () => {
        expect(core_sort('realms.get', { sort_by: 'slug', sort_dir: 'desc' })).toEqual({ sort_by: 'slug', sort_dir: 'desc' });
        expect(core_sort('realms.get', { sort_by: 'slug' })).toEqual({ sort_by: 'slug' });
        expect(core_sort('realms.get', { sort_by: 'member_count', sort_dir: 'asc' })).toEqual({});
    });

    it('keys new in Core API 6 go out only to a Core that has them', () => {
        expect(core_sort('orgs.get', { sort_by: 'slug', sort_dir: 'asc' })).toEqual({});
        expect(core_sort('orgs.get', { sort_by: 'slug', sort_dir: 'asc' }, {}, 5)).toEqual({});
        expect(core_sort('orgs.get', { sort_by: 'slug', sort_dir: 'asc' }, {}, CORE_SORT_API_VERSION)).toEqual({ sort_by: 'slug', sort_dir: 'asc' });
        expect(core_sort('orgs.get', { sort_by: 'password', sort_dir: 'asc' }, {}, 99)).toEqual({});
    });

    it('falls back to the page default when nothing supported was asked for; never sends sort_dir alone', () => {
        const dflt = { sort_by: 'created_at', sort_dir: 'desc' } as const;
        expect(core_sort('realms.get', {}, dflt)).toEqual(dflt);
        expect(core_sort('realms.get', { sort_dir: 'asc' })).toEqual({});
        expect(core_sort('orgs.get', { sort_by: 'slug' }, dflt)).toEqual(dflt);
    });

    it('sortable_keys follows the capability map and the Core version (a copy)', () => {
        expect(sortable_keys('runs.get')).toEqual([...CORE_SORT_KEYS['runs.get'].keys]);
        expect(sortable_keys('runs.get')).not.toBe(CORE_SORT_KEYS['runs.get'].keys);
        expect(sortable_keys('orgs.get', null)).toEqual([]);
        expect(sortable_keys('orgs.get', 5)).toEqual([]);
        expect(sortable_keys('orgs.get', 6)).toEqual(['slug', 'display_name', 'member_count', 'scope_count', 'created_at']);
        for (const read of ['teams.get:catalog', 'orgs.get_scopes', 'users.get', 'daemons.get', 'workspaces.get', 'reports.audit'] as const) {
            expect(sortable_keys(read, 6).length, read).toBeGreaterThan(0);
        }
    });
});
