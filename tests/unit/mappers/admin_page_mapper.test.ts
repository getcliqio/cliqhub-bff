import { describe, it, expect } from 'vitest';
import { to_team_row, to_account_row } from '../../../src/mappers/admin_page_mapper.js';

describe('to_team_row', () => {
    it('maps Core TeamData (author, latest_version)', () => {
        const row = to_team_row({ id: 't', name: 'x', scope: 'acme', listed: true, author: 'ana', latest_version: '1.0.0', install_count: 2, updated_at: 0 });
        expect(row).toMatchObject({ author_username: 'ana', version_count: null, listed: true, install_count: 2, updated_at: '1970-01-01T00:00:00.000Z', listed_without_version: false });
    });

    it('flags listed-without-version: version_count 0, else missing / 0.0.0 latest_version', () => {
        expect(to_team_row({ id: 't', name: 'x', listed: true, latest_version: '0.0.0' }).listed_without_version).toBe(true);
        expect(to_team_row({ id: 't', name: 'x', listed: true }).listed_without_version).toBe(true);
        expect(to_team_row({ id: 't', name: 'x', listed: 1, version_count: '0', latest_version: '1.0.0' }).listed_without_version).toBe(true);
        expect(to_team_row({ id: 't', name: 'x', listed: false, latest_version: '0.0.0' }).listed_without_version).toBe(false);
        expect(to_team_row({ id: 't', name: 'x', listed: 0, version_count: 0 }).listed_without_version).toBe(false);
    });
});

describe('to_account_row', () => {
    it('normalises role and times', () => {
        expect(to_account_row({ id: 1, username: 'ana', role: 'owner', created_at: 'nope' })).toMatchObject({ id: '1', role: 'user', created_at: null, suspended_at: null });
    });

    it('carries status and deleted_at; an invitee without a username keeps null', () => {
        expect(to_account_row({
            id: 'u1', username: null, display_name: 'Priya', email: 'priya@example.test', role: 'user',
            suspended_at: null, created_at: '2026-10-02T10:00:00.000Z', status: 'invited', deleted_at: null,
        })).toEqual({
            id: 'u1', username: null, display_name: 'Priya', email: 'priya@example.test', role: 'user', status: 'invited',
            suspended_at: null, deleted_at: null, created_at: '2026-10-02T10:00:00.000Z',
        });
        expect(to_account_row({ id: 'u2', username: 'bob', status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z' }))
            .toMatchObject({ status: 'deleted', deleted_at: '2026-09-01T00:00:00.000Z' });
    });
});
