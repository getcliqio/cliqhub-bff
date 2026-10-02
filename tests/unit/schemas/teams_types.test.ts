import { describe, it, expect } from 'vitest';
import {
    TeamsGetInput, TeamsGetByIdInput, TeamsGetVersionsInput, TeamsGetPhasesInput,
    TeamsCreateInput, TeamsUpdateInput, TeamsPublishInput, TeamRefInput, TeamsDownloadInput,
    TeamsRenameInput,
} from '../../../src/schemas/teams_types.js';

const TEAM_UUID = '00000000-0000-4000-8000-000000000001';

describe('TeamsGetInput', () => {
    it('accepts empty body', () => {
        expect(TeamsGetInput.safeParse({}).success).toBe(true);
    });

    it('accepts valid params', () => {
        expect(TeamsGetInput.safeParse({ tag: 'tdd', limit: 20, offset: 10 }).success).toBe(true);
    });

    it('accepts realm_id for realm roster', () => {
        const r = TeamsGetInput.safeParse({ realm_id: 'realm-1', limit: 50 });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.realm_id).toBe('realm-1');
    });

    it('rejects empty realm_id', () => {
        expect(TeamsGetInput.safeParse({ realm_id: '' }).success).toBe(false);
    });

    it('accepts daemon_id for live inventory', () => {
        const r = TeamsGetInput.safeParse({ daemon_id: 'edge-1' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.daemon_id).toBe('edge-1');
    });

    it('rejects empty daemon_id', () => {
        expect(TeamsGetInput.safeParse({ daemon_id: '' }).success).toBe(false);
    });

    it('accepts limit up to 200', () => {
        expect(TeamsGetInput.safeParse({ limit: 200 }).success).toBe(true);
    });

    it('rejects limit over 200', () => {
        expect(TeamsGetInput.safeParse({ limit: 201 }).success).toBe(false);
    });

    it('rejects negative offset', () => {
        expect(TeamsGetInput.safeParse({ offset: -1 }).success).toBe(false);
    });

    it('rejects unknown status / coverage values', () => {
        expect(TeamsGetInput.safeParse({ status: 'archived' }).success).toBe(false);
        expect(TeamsGetInput.safeParse({ coverage: 'most' }).success).toBe(false);
    });
});

describe('TeamsGetByIdInput', () => {
    it('accepts valid name', () => {
        expect(TeamsGetByIdInput.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope', () => {
        expect(TeamsGetByIdInput.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('accepts team_id alone', () => {
        expect(TeamsGetByIdInput.safeParse({ team_id: TEAM_UUID }).success).toBe(true);
    });

    it('rejects non-uuid team_id', () => {
        expect(TeamsGetByIdInput.safeParse({ team_id: 'abc' }).success).toBe(false);
    });

    it('rejects empty name', () => {
        expect(TeamsGetByIdInput.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(TeamsGetByIdInput.safeParse({}).success).toBe(false);
    });
});

describe('TeamsDownloadInput', () => {
    it('accepts valid name', () => {
        expect(TeamsDownloadInput.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope and version', () => {
        expect(TeamsDownloadInput.safeParse({ name: 'tdd-git', scope: 'cliq', version: '1.0.0' }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(TeamsDownloadInput.safeParse({ name: '' }).success).toBe(false);
    });
});

describe('TeamsPublishInput', () => {
    it('accepts valid publish body', () => {
        expect(TeamsPublishInput.safeParse({ name: 'my-team', data_base64: 'abc123', version: '1.0.0' }).success).toBe(true);
    });

    it('accepts with bump instead of version', () => {
        expect(TeamsPublishInput.safeParse({ name: 'my-team', data_base64: 'abc123', bump: 'minor' }).success).toBe(true);
    });

    it('accepts team_id instead of name', () => {
        expect(TeamsPublishInput.safeParse({ team_id: TEAM_UUID }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(TeamsPublishInput.safeParse({ name: '', data_base64: 'abc' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(TeamsPublishInput.safeParse({ data_base64: 'abc' }).success).toBe(false);
    });

    it('allows status-only publish without data_base64', () => {
        expect(TeamsPublishInput.safeParse({ name: 'my-team', visibility: 'public' }).success).toBe(true);
    });

    it('rejects draft visibility', () => {
        expect(TeamsPublishInput.safeParse({ name: 'my-team', visibility: 'draft' }).success).toBe(false);
    });

    it('rejects uppercase name', () => {
        expect(TeamsPublishInput.safeParse({ name: 'MyTeam', data_base64: 'abc' }).success).toBe(false);
    });

    it('rejects invalid bump value', () => {
        expect(TeamsPublishInput.safeParse({ name: 'my-team', data_base64: 'abc', bump: 'huge' }).success).toBe(false);
    });
});

describe('TeamRefInput (unpublish / delete)', () => {
    it('accepts valid name', () => {
        expect(TeamRefInput.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope', () => {
        expect(TeamRefInput.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('accepts team_id', () => {
        expect(TeamRefInput.safeParse({ team_id: TEAM_UUID }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(TeamRefInput.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects empty body', () => {
        expect(TeamRefInput.safeParse({}).success).toBe(false);
    });
});

describe('TeamsRenameInput', () => {
    it('accepts valid rename body', () => {
        expect(TeamsRenameInput.safeParse({ name: 'old-name', scope: 'alice', new_name: 'new-name' }).success).toBe(true);
    });

    it('rejects missing scope', () => {
        expect(TeamsRenameInput.safeParse({ name: 'old', new_name: 'new' }).success).toBe(false);
    });

    it('rejects uppercase new_name', () => {
        expect(TeamsRenameInput.safeParse({ name: 'old', scope: 'alice', new_name: 'NewName' }).success).toBe(false);
    });

    it('rejects empty new_name', () => {
        expect(TeamsRenameInput.safeParse({ name: 'old', scope: 'alice', new_name: '' }).success).toBe(false);
    });
});

describe('TeamsCreateInput', () => {
    it('accepts name and scope', () => {
        expect(TeamsCreateInput.safeParse({ name: 'tdd-git', scope: 'cliq' }).success).toBe(true);
    });

    it('accepts manifest as YAML text or object', () => {
        expect(TeamsCreateInput.safeParse({ name: 'tdd-git', scope: 'cliq', manifest: 'name: tdd-git' }).success).toBe(true);
        expect(TeamsCreateInput.safeParse({ name: 'tdd-git', scope: 'cliq', manifest: { name: 'tdd-git' } }).success).toBe(true);
    });

    it('rejects missing scope', () => {
        expect(TeamsCreateInput.safeParse({ name: 'tdd-git' }).success).toBe(false);
    });

    it('rejects uppercase name', () => {
        expect(TeamsCreateInput.safeParse({ name: 'TDD', scope: 'cliq' }).success).toBe(false);
    });
});

describe('TeamsUpdateInput', () => {
    it('accepts name or team_id with fields', () => {
        expect(TeamsUpdateInput.safeParse({ name: 'tdd-git', description: 'x' }).success).toBe(true);
        expect(TeamsUpdateInput.safeParse({ team_id: TEAM_UUID, bump: 'major' }).success).toBe(true);
    });

    it('rejects patch as an explicit bump', () => {
        expect(TeamsUpdateInput.safeParse({ name: 'tdd-git', bump: 'patch' }).success).toBe(false);
    });

    it('rejects body without name or team_id', () => {
        expect(TeamsUpdateInput.safeParse({ description: 'x' }).success).toBe(false);
    });
});

describe('TeamsGetVersionsInput', () => {
    it('accepts valid name', () => {
        expect(TeamsGetVersionsInput.safeParse({ name: 'tdd-git' }).success).toBe(true);
    });

    it('accepts name with scope and latest_only', () => {
        expect(TeamsGetVersionsInput.safeParse({ name: 'tdd-git', scope: 'cliq', latest_only: true }).success).toBe(true);
    });

    it('rejects empty name', () => {
        expect(TeamsGetVersionsInput.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects missing name', () => {
        expect(TeamsGetVersionsInput.safeParse({}).success).toBe(false);
    });
});

describe('TeamsGetPhasesInput', () => {
    it('accepts team_id with optional version_id', () => {
        expect(TeamsGetPhasesInput.safeParse({ team_id: TEAM_UUID }).success).toBe(true);
        expect(TeamsGetPhasesInput.safeParse({ team_id: TEAM_UUID, version_id: TEAM_UUID }).success).toBe(true);
    });

    it('rejects missing or non-uuid team_id', () => {
        expect(TeamsGetPhasesInput.safeParse({}).success).toBe(false);
        expect(TeamsGetPhasesInput.safeParse({ team_id: 'tdd-git' }).success).toBe(false);
    });
});
