import { describe, it, expect, vi } from 'vitest';
import { AdminPageService, to_team_row } from '../../../src/services/admin_page_service.js';

function compat(api_version: number) {
    return { current: () => ({ checked_at: 1, reachable: true, version: '1.0.0', api_version, started_at: 1, required_api_version: 2, compatible: true, message: null }) } as any;
}
const NOW = 1_800_000_000_000;

function core(handler: (path: string, body: any) => any) {
    const calls: Array<{ path: string; body: any }> = [];
    return {
        calls,
        client: { post: vi.fn(async (path: string, body: any) => { calls.push({ path, body }); return handler(path, body); }) } as any,
    };
}

describe('AdminPageService.home', () => {
    it('older Core: no hub-wide or filtered numbers, never sends the new fields', async () => {
        const c = core((path) => {
            if (path === '/v1/users/get') return { ok: true, data: { users: [], total: 184 } };
            if (path === '/v1/orgs/get') return { ok: true, data: { orgs: [{ id: 'o1', slug: 'acme', member_count: 3 }], total: 23 } };
            if (path === '/internal/reports/audit') return { ok: true, data: { entries: [{ id: 'a1', admin_id: 'u', admin_username: 'sapan', action: 'user.suspend', target_type: 'user', target_id: 'x', details: {}, created_at: '2026-09-01T00:00:00Z' }], total: 1 } };
            if (path === '/v1/teams/get') return { ok: true, data: { teams: [{ id: 't1', name: 'x', listed: 1, version_count: 0 }], total: 1 } };
            throw new Error(`unexpected ${path}`);
        });
        const dto = await new AdminPageService(c.client, compat(2), () => NOW).home('tok');
        expect(dto.hub_wide).toBe(false);
        expect(dto.counts).toMatchObject({ accounts: 184, orgs: 23, suspended: null, admins: null, realms: null, daemons: null, runs_24h: null });
        expect(c.calls.some((x) => 'all' in x.body || 'suspended' in x.body || 'role' in x.body)).toBe(false);
        expect(dto.recent_audit).toHaveLength(1);
        expect(dto.attention.map((a) => a.id)).toEqual(['listed_no_version']);
        expect(dto.partial).toBe(false);
    });

    it('Core API 3: hub-wide counts and attention items', async () => {
        const c = core((path, body) => {
            const t = (n: number) => ({ ok: true, data: { items: [], total: n } });
            if (path === '/v1/users/get') return { ok: true, data: { users: [], total: body.suspended ? 2 : body.role ? 3 : 184 } };
            if (path === '/v1/orgs/get') return { ok: true, data: { orgs: [{ id: 'o1', slug: 'acme-labs', owner_count: 0 }, { id: 'o2', slug: 'm1', owner_count: '1' }], total: 2 } };
            if (path === '/v1/realms/get') return t(41);
            if (path === '/v1/daemons/get') return t(body.status === 'online' ? 57 : body.status === 'offline' ? 4 : 64);
            if (path === '/v1/runs/get') { expect(body.since_ms).toBe(NOW - 86_400_000); return t(body.state ? 38 : 1208); }
            if (path === '/internal/reports/audit') return { ok: true, data: { entries: [] } };
            if (path === '/v1/teams/get') return { ok: true, data: { teams: [], total: 0 } };
            throw new Error(path);
        });
        const dto = await new AdminPageService(c.client, compat(3), () => NOW).home('tok');
        expect(dto.hub_wide).toBe(true);
        expect(dto.counts).toEqual({ accounts: 184, suspended: 2, admins: 3, orgs: 2, realms: 41, daemons: { online: 57, total: 64, offline: 4 }, runs_24h: { total: 1208, failed: 38 } });
        expect(dto.attention.map((a) => a.id)).toEqual(['daemons_offline', 'suspended', 'ownerless']);
        expect(dto.attention.find((a) => a.id === 'ownerless')!.href).toBe('/admin/orgs/o1');
        expect(c.calls.filter((x) => x.path === '/v1/daemons/get').every((x) => x.body.all === true)).toBe(true);
    });

    it('a failed Core call marks partial instead of failing the page', async () => {
        const c = core((path) => {
            if (path === '/internal/reports/audit') throw new Error('boom');
            if (path === '/v1/orgs/get') return { ok: true, data: { orgs: [], total: 0 } };
            return { ok: true, data: { users: [], teams: [], total: 1 } };
        });
        const dto = await new AdminPageService(c.client, compat(2)).home('tok');
        expect(dto.partial).toBe(true);
        expect(dto.recent_audit).toEqual([]);
        expect(dto.counts.accounts).toBe(1);
    });
});

describe('AdminPageService.list', () => {
    it('accounts on older Core: filter falls back to all, counts unknown', async () => {
        const c = core(() => ({ ok: true, data: { users: [{ id: 'u1', username: 'ana', email: 'a@x', role: 'user', suspended_at: '2026-09-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }], total: 1 } }));
        const dto = await new AdminPageService(c.client, compat(2)).list('tok', { kind: 'accounts', filter: 'suspended', query: 'ana', limit: 25, offset: 0 });
        expect(dto.filter).toBe('all');
        expect(dto.counts).toEqual({ all: 1, admins: null, suspended: null });
        expect(c.calls[0].body).toEqual({ search: 'ana', limit: 25, offset: 0 });
        expect(dto.items[0]).toMatchObject({ username: 'ana', suspended_at: '2026-09-01T00:00:00.000Z' });
    });

    it('accounts on API 3: filtered rows + a count per chip', async () => {
        const c = core((_p, b) => ({ ok: true, data: { users: [], total: b.suspended ? 2 : b.role ? 3 : 184 } }));
        const dto = await new AdminPageService(c.client, compat(3)).list('tok', { kind: 'accounts', filter: 'admins', limit: 25, offset: 0 });
        expect(c.calls[0].body).toMatchObject({ role: 'admin' });
        expect(dto.counts).toEqual({ all: 184, admins: 3, suspended: 2 });
    });

    it('daemons on older Core need an org', async () => {
        const c = core(() => { throw new Error('should not call'); });
        const dto = await new AdminPageService(c.client, compat(2)).list('tok', { kind: 'daemons', filter: 'all', limit: 25, offset: 0 });
        expect(dto.needs_org).toBe(true);
        expect(c.calls).toHaveLength(0);
    });

    it('daemons on API 3: hub-wide with status counts', async () => {
        const c = core((p, b) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'm1', display_name: 'MeasureOne' }], total: 1 } } : ({ ok: true, data: { items: b.limit === 1 ? [] : [{ id: 'd1', status: 'offline', realms: [{ id: 'r', slug: 'eu', org_slug: 'm1', name: 'EU' }] }], total: b.status === 'offline' ? 4 : b.status ? 1 : 64 } }));
        const dto = await new AdminPageService(c.client, compat(3)).list('tok', { kind: 'daemons', filter: 'offline', limit: 25, offset: 0 });
        expect(c.calls[0].body).toMatchObject({ all: true, status: 'offline' });
        expect(dto.counts).toEqual({ all: 64, online: 1, stale: 1, offline: 4 });
        expect(dto.items[0]).toMatchObject({ id: 'd1', realms: [{ slug: 'eu', org_slug: 'm1' }] });
        expect(dto.hub_wide).toBe(true);
        expect(dto.org_options).toEqual([{ id: 'o1', slug: 'm1', display_name: 'MeasureOne' }]);
    });

    it('teams: listed / unlisted with counts', async () => {
        const c = core((_p, b) => ({ ok: true, data: { teams: [], total: b.listed ? 96 : 116 } }));
        const dto = await new AdminPageService(c.client, compat(2)).list('tok', { kind: 'teams', filter: 'unlisted', limit: 25, offset: 0 });
        expect(c.calls[0].body).toMatchObject({ listed: false });
        expect(dto.counts).toEqual({ listed: 96, unlisted: 116 });
    });

    it('audit: older Core drops time/target filters and says so', async () => {
        const c = core(() => ({ ok: true, data: { entries: [{ id: 'a', admin_id: 'u', admin_username: 's', action: 'user.suspend', target_type: 'user', target_id: 't', details: {}, created_at: '2026-09-01T00:00:00Z' }], total: 1 } }));
        const dto = await new AdminPageService(c.client, compat(2)).list('tok', { kind: 'audit', filter: 'all', since_ms: 5, target_id: 'x', action: 'user.suspend', limit: 50, offset: 0 });
        expect(c.calls[0]).toEqual({ path: '/internal/reports/audit', body: { action: 'user.suspend', limit: 50, offset: 0 } });
        expect(dto.unsupported).toEqual(['since', 'target']);
        expect(dto.items).toHaveLength(1);
    });

    it('audit on API 3 passes the time and target filters', async () => {
        const c = core(() => ({ ok: true, data: { entries: [], total: 0 } }));
        const dto = await new AdminPageService(c.client, compat(3)).list('tok', { kind: 'audit', filter: 'all', since_ms: 5, target_id: 'x', limit: 50, offset: 0 });
        expect(c.calls[0].body).toEqual({ since_ms: 5, target_id: 'x', limit: 50, offset: 0 });
        expect(dto.unsupported).toEqual([]);
    });

    it('realms: hub-wide on API 3 with org picker; membership view before', async () => {
        const c = core((p) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'm1', display_name: 'M1' }], total: 1 } } : { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'm1', created_by_username: 'sapan', created_at: 5 }], total: 1 } });
        const dto = await new AdminPageService(c.client, compat(3)).list('tok', { kind: 'realms', filter: 'all', query: 'pr', limit: 25, offset: 0 });
        expect(c.calls.find((x) => x.path === '/v1/realms/get')!.body).toMatchObject({ all: true, query: 'pr', sort_by: 'created_at' });
        expect(dto.items[0]).toEqual({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'm1', created_by_username: 'sapan', created_at: 5 });
        expect(dto.org_options).toHaveLength(1);
        const old = core(() => ({ ok: true, data: { items: [], total: 0 } }));
        const d2 = await new AdminPageService(old.client, compat(2)).list('tok', { kind: 'realms', filter: 'all', limit: 25, offset: 0 });
        expect(old.calls[0].body).not.toHaveProperty('all');
        expect(d2.hub_wide).toBe(false);
    });

    it('runs: state chips + range, realm links resolved in the BFF', async () => {
        const c = core((p, b) => {
            if (p === '/v1/realms/get') return { ok: true, data: { items: [{ id: 'r1', slug: 'prod', org_slug: 'm1' }], total: 1 } };
            if (p === '/v1/orgs/get') return { ok: true, data: { orgs: [], total: 0 } };
            const n = !b.state ? 100 : b.state.includes('failed') ? 7 : 3;
            return { ok: true, data: { items: b.limit === 1 ? [] : [{ run_id: 'x1', state: 'failed', realm_id: 'r1', started_at: 1 }], total: n } };
        });
        const dto = await new AdminPageService(c.client, compat(3), () => NOW).list('tok', { kind: 'runs', filter: 'failed', range: '24h', limit: 25, offset: 0 });
        const main = c.calls.find((x) => x.path === '/v1/runs/get' && x.body.limit === 25)!.body;
        expect(main).toMatchObject({ all: true, state: ['failed', 'crashed'], since_ms: Math.floor((NOW - 864e5) / 60000) * 60000 });
        expect(dto.items[0].realm).toEqual({ id: 'r1', slug: 'prod', org_slug: 'm1' });
        expect(dto.counts).toEqual({ all: 100, running: 3, awaiting_input: 3, failed: 7, completed: 3 });
        const old = await new AdminPageService(core(() => { throw new Error('no'); }).client, compat(2)).list('tok', { kind: 'runs', filter: 'all', range: '24h', limit: 25, offset: 0 });
        expect(old.needs_org).toBe(true);
    });

    it('logs: hub-wide search with level facets', async () => {
        const c = core((p) => p === '/v1/realms/get' ? { ok: true, data: { items: [], total: 0 } } : { ok: true, lines: [{ id: 'l1', run_id: 'x1', level: 'error', message: 'boom', created_at: 9, realm_id: null }], total: 40, facets: { level: [{ value: 'error', count: 4 }, { value: 'info', count: 36 }] } });
        const dto = await new AdminPageService(c.client, compat(2), () => NOW).list('tok', { kind: 'logs', filter: 'all', range: '1h', query: 'boom', limit: 100, offset: 0 });
        const body = c.calls.find((x) => x.path === '/v1/runs/get_logs')!.body;
        expect(body).toMatchObject({ q: 'boom', limit: 100 });
        expect(body).not.toHaveProperty('realm_id');
        expect(dto.counts).toMatchObject({ all: 40, error: 4, info: 36, warn: 0 });
        expect(dto.items[0]).toMatchObject({ id: 'l1', level: 'error', realm: null });
    });

    it('workspaces and scopes map Core rows', async () => {
        const w = core((p) => p === '/v1/daemons/get' ? { ok: true, data: { items: [{ id: 'd1', name: 'mac' }], total: 1 } } : { ok: true, workspaces: [{ id: 'w1', path: '/src/app', daemon_id: 'd1', teams: [{ scope: 'acme', slug: 'recon' }], active_runs: [{}], latest_run: { run_id: 'x', state: 'running', started_at: 2 }, updated_at: 3 }], total: 1 });
        const wd = await new AdminPageService(w.client, compat(3)).list('tok', { kind: 'workspaces', filter: 'all', limit: 25, offset: 0 });
        expect(wd.items[0]).toMatchObject({ id: 'w1', daemon_name: 'mac', teams: ['@acme/recon'], active_runs: 1 });
        const s = core((p) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'acme', display_name: 'Acme' }], total: 1 } } : { ok: true, data: { scopes: [{ id: 's1', slug: 'acme', display_name: 'Acme', org_id: 'o1', owner_username: 'ana', visibility: 'private', scope_type: 'org', team_count: '4', created_at: '2026-01-01' }], total: 1 } });
        const sd = await new AdminPageService(s.client, compat(2)).list('tok', { kind: 'scopes', filter: 'all', limit: 25, offset: 0 });
        expect(sd.items[0]).toMatchObject({ slug: 'acme', org_slug: 'acme', team_count: 4 });
    });

    it('to_team_row flags listed-without-version', () => {
        expect(to_team_row({ id: 't', name: 'x', listed: 1, version_count: '0' }).listed_without_version).toBe(true);
        expect(to_team_row({ id: 't', name: 'x', listed: 0, version_count: 0 }).listed_without_version).toBe(false);
    });
});
