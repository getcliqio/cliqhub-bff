import { describe, it, expect, vi } from 'vitest';
import { RunPreflightService, missing_keys } from '../../../src/services/run_preflight_service.js';
import { ApiError } from '../../../src/errors/api_error.js';

const REALM_ID = '12647cb8-4495-4174-9651-1dae7a837da0';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const PIPELINE = {
    id: 't1', name: 'parser-pipeline', scope: 'measureone',
    workflow: { phases: [
        { name: 'sort', type: 'standard', agent: 'exec' },
        { name: 'build', type: 'map', team: '@measureone/parser-builder', depends_on: ['sort'] },
    ] },
    roles: [],
};
const setting = (name: string, missing: string[]) => ({ id: name, name, version: '1', description: null, is_system: true, settings: { required: [], optional: [] }, values: {}, source: {}, required_total: missing.length, required_configured: 0, all_required_configured: missing.length === 0, missing_required: missing });

function svc(over: { settings?: unknown[]; reads_fail?: boolean } = {}) {
    const control = { realm_by_id: vi.fn().mockResolvedValue({ id: REALM_ID, slug: 'measureone-parsers', name: 'measureone-parsers', org_slug: 'measureone' }) };
    const teams = { get_by_id: vi.fn().mockResolvedValue(PIPELINE) };
    const reads = { read: over.reads_fail ? vi.fn().mockRejectedValue(new Error('core down')) : vi.fn().mockResolvedValue({ data: over.settings ?? [] }) };
    const orgs = { get: vi.fn().mockResolvedValue({ orgs: [{ id: ORG_ID, slug: 'measureone' }] }) };
    // parser-builder (the sub-team) uses cursor; the pipeline itself only exec.
    const team_page = { sub_teams: vi.fn().mockResolvedValue({ map: { '@measureone/parser-builder': { scope: 'measureone', name: 'parser-builder', version: '0.6.1', phases: [{ name: 'ai-write-code', type: 'standard', agent: 'cursor', depends_on: [], review: false, reviewers: null, max_iterations: null, commands: [], sources: [], targets: [], team: null, role: null, support: false }] } }, failed: false }) };
    return { s: new RunPreflightService(control as never, teams as never, reads as never, orgs as never, team_page as never), reads };
}

describe('RunPreflightService', () => {
    it('refuses when an agent a sub-team uses misses a required setting in the realm, naming the agent, key and realm', async () => {
        const { s, reads } = svc({ settings: [setting('exec', []), setting('cursor', ['api_key'])] });
        const err = await s.check(REALM_ID, 'measureone/parser-pipeline', 'tok').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err).toMatchObject({ code: 'agent_settings_missing', status: 422, details: { agents: [{ agent: 'cursor', missing: ['api_key'] }] } });
        expect(err.message).toContain('agents.cursor.api_key');
        expect(err.message).toContain('measureone-parsers');
        expect(reads.read).toHaveBeenCalledWith('agents.get_settings', { org_id: ORG_ID, realm_id: REALM_ID }, 'tok');
    });

    it('passes when every agent used is set up, and when the check cannot be made (Core decides)', async () => {
        await expect(svc({ settings: [setting('exec', []), setting('cursor', [])] }).s.check(REALM_ID, 'measureone/parser-pipeline', 'tok')).resolves.toBeUndefined();
        await expect(svc({ reads_fail: true }).s.check(REALM_ID, 'measureone/parser-pipeline', 'tok')).resolves.toBeUndefined();
        await expect(svc().s.check(REALM_ID, 'not-a-ref', 'tok')).resolves.toBeUndefined();
    });

    it('reads missing keys from Core, or works them out on an older Core', () => {
        expect(missing_keys(setting('cursor', ['api_key']) as never)).toEqual(['api_key']);
        const old = { ...setting('cursor', []), missing_required: undefined, all_required_configured: false, settings: { required: [{ key: 'api_key' }], optional: [] }, values: {} };
        expect(missing_keys(old as never)).toEqual(['api_key']);
    });
});
