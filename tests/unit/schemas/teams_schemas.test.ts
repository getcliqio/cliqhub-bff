import { describe, it, expect } from 'vitest';
import {
    teams_get_schema, teams_get_by_id_schema,
    teams_download_schema,
    teams_publish_schema, teams_delete_schema,
    teams_rename_schema,
    teams_get_versions_schema,
    teams_create_schema, teams_unpublish_schema,
} from '../../../src/schemas/teams_schemas.js';

describe('teams_get_schema', () => {
    it('accepts empty body', () => {
        expect(teams_get_schema.safeParse({}).success).toBe(true);
    });

    it('accepts valid params', () => {
        const r = teams_get_schema.safeParse({ tag: 'tdd', limit: 20, offset: 10 });
        expect(r.success).toBe(true);
    });

    it('accepts realm_id for realm roster', () => {
        const r = teams_get_schema.safeParse({ realm_id: 'realm-1', limit: 50 });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.realm_id).toBe('realm-1');
    });

    it('rejects empty realm_id', () => {
        expect(teams_get_schema.safeParse({ realm_id: '' }).success).toBe(false);
    });

    it('accepts daemon_id for live inventory', () => {
        const r = teams_get_schema.safeParse({ daemon_id: 'edge-1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.daemon_id).toBe('edge-1');
    });

    it('rejects empty daemon_id', () => {
        expect(teams_get_schema.safeParse({ daemon_id: '' }).success).toBe(false);
    });

    it('accepts limit up to 200', () => {
        expect(teams_get_schema.safeParse({ limit: 200 }).success).toBe(true);
    });

    it('rejects limit over 200', () => {
        expect(teams_get_schema.safeParse({ limit: 201 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(teams_get_schema.safeParse({ offset: -1 }).success).toBe(false);
    });
});

describe('teams_get_by_id_schema', () => {
    it('accepts valid name', () => {
        expect(teams_get_by_id_schema.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope', () => {
        const r = teams_get_by_id_schema.safeParse({ name: 'tdd-git', scope: 'cliq' });
        expect(r.success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(teams_get_by_id_schema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(teams_get_by_id_schema.safeParse({}).success).toBe(false);
    });
});

describe('teams_download_schema', () => {
    it('accepts valid name', () => {
        expect(teams_download_schema.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope and version', () => {
        const r = teams_download_schema.safeParse({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' });
        expect(r.success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(teams_download_schema.safeParse({ name: '' }).success).toBe(false);
    });
});

describe('teams_publish_schema', () => {
    it('accepts valid publish body', () => {
        const r = teams_publish_schema.safeParse({
            name: 'my-team', data_base64: 'abc123', version: '1.0.0',
        });
        expect(r.success).toBe(true);
    });

    it('accepts with bump instead of version', () => {
        const r = teams_publish_schema.safeParse({
            name: 'my-team', data_base64: 'abc123', bump: 'minor',
        });
        expect(r.success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(teams_publish_schema.safeParse({ name: '', data_base64: 'abc' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(teams_publish_schema.safeParse({ data_base64: 'abc' }).success).toBe(false);
    });

    it('allows status-only publish without data_base64', () => {
        expect(teams_publish_schema.safeParse({ name: 'my-team', visibility: 'public' }).success).toBe(true);
    });

    it('rejects uppercase name', () => {
        expect(teams_publish_schema.safeParse({ name: 'MyTeam', data_base64: 'abc' }).success).toBe(false);
    });

    it('rejects invalid bump value', () => {
        expect(teams_publish_schema.safeParse({ name: 'my-team', data_base64: 'abc', bump: 'huge' }).success).toBe(false);
    });
});

describe('teams_delete_schema', () => {
    it('accepts valid name', () => {
        expect(teams_delete_schema.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope', () => {
        expect(teams_delete_schema.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(teams_delete_schema.safeParse({ name: '' }).success).toBe(false);
    });
});

describe('teams_rename_schema', () => {
    it('accepts valid rename body', () => {
        const r = teams_rename_schema.safeParse({ name: 'old-name', scope: 'alice', new_name: 'new-name' });
        expect(r.success).toBe(true);
    });

    it('rejects missing scope', () => {
        expect(teams_rename_schema.safeParse({ name: 'old', new_name: 'new' }).success).toBe(false);
    });

    it('rejects uppercase new_name', () => {
        expect(teams_rename_schema.safeParse({ name: 'old', scope: 'alice', new_name: 'NewName' }).success).toBe(false);
    });

    it('rejects empty new_name', () => {
        expect(teams_rename_schema.safeParse({ name: 'old', scope: 'alice', new_name: '' }).success).toBe(false);
    });
});

describe('teams_create_schema', () => {
    it('accepts name and scope', () => {
        expect(teams_create_schema.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('rejects missing scope', () => {
        expect(teams_create_schema.safeParse({ name: 'tdd-git' }).success).toBe(false);
    });
});

describe('teams_unpublish_schema', () => {
    it('accepts name', () => {
        expect(teams_unpublish_schema.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts team_id', () => {
        expect(teams_unpublish_schema.safeParse({
            team_id: '00000000-0000-4000-8000-000000000001',
        }).success).toBe(true);
    });

    it('rejects empty body', () => {
        expect(teams_unpublish_schema.safeParse({}).success).toBe(false);
    });
});

describe('teams_get_versions_schema', () => {
    it('accepts valid name', () => {
        expect(teams_get_versions_schema.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope', () => {
        expect(teams_get_versions_schema.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(teams_get_versions_schema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(teams_get_versions_schema.safeParse({}).success).toBe(false);
    });
});
