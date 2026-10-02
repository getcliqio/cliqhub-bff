import { describe, it, expect, vi } from 'vitest';
import { RealmHostPageService } from '../../../src/services/realm_host_page_service.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

const realm = { id: 'r1', slug: 'prod-us', name: 'prod-us', org_id: 'o1', org_slug: 'm1' };
const control = { realm_by_slug: vi.fn(async () => realm) } as any;

describe('RealmHostPageService.daemon', () => {
    it('composes daemon, live teams, installable roster, workspaces and runs', async () => {
        const core = { post_body: vi.fn(async (p: string, b: any) => {
            if (p === '/v1/daemons/get_by_id') return { ok: true, daemon: { id: 'd1', name: 'mac-1', status: 'online' } };
            if (p === '/v1/teams/get' && b.daemon_id) return { ok: true, data: { items: [{ id: 't1', scope: 'm1', name: 'feature-dev', slug: 'feature-dev', version: '1.2.0' }], total: 1, offset: 0, limit: 50 } };
            if (p === '/v1/teams/get' && b.realm_id) return { ok: true, data: { items: [
                { name: 'feature-dev', slug: 'feature-dev', label: '@m1/feature-dev', scope: null, version: '1.2.0', sample_team_id: 't1', installed_daemon_ids: ['d1'] },
                { name: 'docs', slug: 'docs', label: '@m1/docs', scope: null, version: '0.3.0', sample_team_id: 't2', installed_daemon_ids: ['d2'] },
                { name: 'lint', slug: 'lint', label: '@m1/lint', scope: null, version: null, sample_team_id: null, installed_daemon_ids: [] },
            ], total: 3, offset: 0, limit: 100 } };
            if (p === '/v1/workspaces/get') return { ok: true, data: { workspaces: [{ workspace_id: 'w1', name: 'api', workspace_dir: '/src/api', teams: [{ scope: 'm1', slug: 'feature-dev' }], active_runs: 1, last_run: { state: 'running', started_at: 5 } }] } };
            if (p === '/v1/runs/get') return { ok: true, data: { items: [{ run_id: 'run-1', state: 'running', team_label: '@m1/feature-dev', started_at: '5' }], total: 7 } };
            throw new Error(p);
        }) } as any;
        const dto = await new RealmHostPageService(new CoreReadRepository(core), control).daemon({ org_slug: 'm1', slug: 'prod-us', daemon_id: 'd1' }, 'tok');
        expect(control.realm_by_slug).toHaveBeenCalledWith('m1', 'prod-us', 'tok');
        expect(dto.daemon).toMatchObject({ id: 'd1', name: 'mac-1' });
        expect(dto.installed).toEqual([{ team_id: 't1', scope: 'm1', slug: 'feature-dev', version: '1.2.0' }]);
        expect(dto.installable).toEqual([{ team_id: 't2', scope: 'm1', slug: 'docs', version: '0.3.0' }]);
        expect(dto.workspaces).toEqual([{ id: 'w1', name: 'api', path: '/src/api', teams: ['@m1/feature-dev'], active_runs: 1, last_run_state: 'running', last_run_at: 5 }]);
        expect(dto.runs?.[0]).toMatchObject({ run_id: 'run-1', state: 'running', team: '@m1/feature-dev', started_at: 5 });
        expect(dto.runs_total).toBe(7);
        expect(dto.partial).toBe(false);
        expect(core.post_body.mock.calls.find((c: any[]) => c[0] === '/v1/teams/get' && c[1].realm_id)[1]).toMatchObject({ realm_id: 'r1' });
    });
    it('offline daemon: live team RPC fails → installed null, partial', async () => {
        const core = { post_body: vi.fn(async (p: string, b: any) => {
            if (p === '/v1/daemons/get_by_id') return { ok: true, daemon: { id: 'd1' } };
            if (p === '/v1/teams/get' && b.daemon_id) throw new Error('daemon offline');
            return { ok: true, data: { items: [], total: 0, offset: 0, limit: 100 } };
        }) } as any;
        const dto = await new RealmHostPageService(new CoreReadRepository(core), control).daemon({ org_slug: 'm1', slug: 'prod-us', daemon_id: 'd1' }, 'tok');
        expect(dto).toMatchObject({ installed: null, installable: [], partial: true });
    });
    it('daemon not visible fails the page', async () => {
        const core = { post_body: vi.fn(async (p: string) => { if (p === '/v1/daemons/get_by_id') throw new Error('404'); return { ok: true, data: {} }; }) } as any;
        await expect(new RealmHostPageService(new CoreReadRepository(core), control).daemon({ org_slug: 'm1', slug: 'prod-us', daemon_id: 'd1' }, 'tok')).rejects.toThrow('404');
    });
    it('live workspaces come from Core\'s data.workspaces only (no pre-2.0 daemon envelope pass-through)', async () => {
        const row = { workspace_id: 'w1', name: 'api', workspace_dir: '/src/api' };
        const page = async (ws_reply: unknown) => {
            const core = { post_body: vi.fn(async (p: string) => {
                if (p === '/v1/daemons/get_by_id') return { ok: true, daemon: { id: 'd1' } };
                if (p === '/v1/workspaces/get') return ws_reply;
                return { ok: true, data: { items: [], total: 0, offset: 0, limit: 100 } };
            }) } as any;
            return new RealmHostPageService(new CoreReadRepository(core), control).daemon({ org_slug: 'm1', slug: 'prod-us', daemon_id: 'd1' }, 'tok');
        };
        expect((await page({ ok: true, data: { workspaces: [row] } })).workspaces).toMatchObject([{ id: 'w1', path: '/src/api' }]);
        expect((await page({ ok: true, data: { type: 'ok', payload: { data: { workspaces: [row] } } } })).workspaces).toEqual([]);
    });
});

describe('RealmHostPageService.workspace', () => {
    it('composes the workspace, its teams and runs', async () => {
        const core = { post_body: vi.fn(async (p: string) => {
            if (p === '/v1/workspaces/get_by_id') return { ok: true, workspace: { id: 'w1', path: '/src/api', daemon_id: 'd1' }, teams: [{ team_id: 't1', scope: 'm1', slug: 'feature-dev' }] };
            return { ok: true, data: { items: [{ run_id: 'run-1', state: 'completed' }], total: 1 } };
        }) } as any;
        const dto = await new RealmHostPageService(new CoreReadRepository(core), control).workspace({ org_slug: 'm1', slug: 'prod-us', workspace_id: 'w1' }, 'tok');
        expect(dto.workspace).toMatchObject({ id: 'w1', daemon_id: 'd1' });
        expect(dto.teams).toEqual([{ team_id: 't1', scope: 'm1', slug: 'feature-dev', version: null }]);
        expect(dto.runs?.length).toBe(1);
        expect(core.post_body.mock.calls.find((c: any[]) => c[0] === '/v1/runs/get')[1]).toMatchObject({ workspace_id: 'w1' });
    });
});
