import { describe, it, expect, vi } from 'vitest';
import { AdminPageService } from '../../../src/services/admin_page_service.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

function compat(api_version: number) {
    return { current: () => ({ checked_at: 1, reachable: true, version: '1.0.0', api_version, started_at: 1, required_api_version: 2, compatible: true, message: null }) } as any;
}
const NOW = 1_800_000_000_000;

function core(handler: (path: string, body: any) => any) {
    const calls: Array<{ path: string; body: any }> = [];
    return {
        calls,
        client: { post_body: vi.fn(async (path: string, body: any) => { calls.push({ path, body }); return handler(path, body); }) } as any,
    };
}

describe('AdminPageService.home', () => {
    it('older Core: no hub-wide or filtered numbers, never sends the new fields', async () => {
        const c = core((path) => {
            if (path === '/v1/users/get') return { ok: true, data: { users: [], total: 184 } };
            if (path === '/v1/orgs/get') return { ok: true, data: { orgs: [{ id: 'o1', slug: 'acme', member_count: 3 }], total: 23 } };
            if (path === '/internal/reports/audit') return { ok: true, data: { entries: [{ id: 'a1', admin_id: 'u', admin_username: 'sapan', action: 'user.suspend', target_type: 'user', target_id: 'x', details: {}, created_at: '2026-09-01T00:00:00Z' }], total: 1 } };
            if (path === '/v1/teams/get') return { ok: true, data: { items: [{ id: 't1', name: 'x', scope: 'acme', listed: true, latest_version: '0.0.0', author: 'ana' }, { id: 't2', name: 'y', scope: 'acme', listed: true, latest_version: '1.0.0' }], total: 2, offset: 0, limit: 100 } };
            throw new Error(`unexpected ${path}`);
        });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2), () => NOW).home({}, 'tok');
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
            if (path === '/v1/teams/get') return { ok: true, data: { items: [], total: 0, offset: 0, limit: 100 } };
            throw new Error(path);
        });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3), () => NOW).home({}, 'tok');
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
            return { ok: true, data: { users: [], items: [], total: 1 } };
        });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2)).home({}, 'tok');
        expect(dto.partial).toBe(true);
        expect(dto.recent_audit).toEqual([]);
        expect(dto.counts.accounts).toBe(1);
    });
});

describe('AdminPageService.list', () => {
    it('accounts on older Core: filter falls back to all, counts unknown', async () => {
        const c = core(() => ({ ok: true, data: { users: [{ id: 'u1', username: 'ana', email: 'a@x', role: 'user', suspended_at: '2026-09-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }], total: 1 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2)).list({ kind: 'accounts', filter: 'suspended', query: 'ana', limit: 25, offset: 0 }, 'tok');
        expect(dto.filter).toBe('all');
        expect(dto.counts).toEqual({ all: 1, admins: null, suspended: null });
        // Core's search field is `query`; no sort on users/get yet → none sent, none offered.
        expect(c.calls[0].body).toEqual({ query: 'ana', limit: 25, offset: 0 });
        expect(dto.sortable).toEqual([]);
        expect(dto.items[0]).toMatchObject({ username: 'ana', status: 'suspended', suspended_at: '2026-09-01T00:00:00.000Z', deleted_at: null });
    });

    it('accounts on API 3: filtered rows + a count per chip', async () => {
        const c = core((_p, b) => ({ ok: true, data: { users: [], total: b.suspended ? 2 : b.role ? 3 : 184 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'accounts', filter: 'admins', limit: 25, offset: 0 }, 'tok');
        expect(c.calls[0].body).toMatchObject({ role: 'admin' });
        expect(dto.counts).toEqual({ all: 184, admins: 3, suspended: 2 });
    });

    it('accounts with include_deleted: rows and chip counts ask Core for soft-deleted users too', async () => {
        const c = core(() => ({ ok: true, data: { users: [{ id: 'u1', username: 'ana', email: 'a@x', role: 'user', status: 'deleted', deleted_at: '2026-09-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }], total: 1 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'accounts', filter: 'all', include_deleted: true, limit: 25, offset: 0 }, 'tok');
        expect(c.calls).toHaveLength(4);
        expect(c.calls.every((x) => x.body.include_deleted === true)).toBe(true);
        expect(dto.items[0]).toMatchObject({ id: 'u1', status: 'deleted', deleted_at: '2026-09-02T00:00:00.000Z' });
    });

    it('accounts without include_deleted never send it', async () => {
        const c = core(() => ({ ok: true, data: { users: [], total: 0 } }));
        await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'accounts', filter: 'all', include_deleted: false, limit: 25, offset: 0 }, 'tok');
        expect(c.calls.some((x) => 'include_deleted' in x.body)).toBe(false);
    });

    it('daemons on older Core need an org', async () => {
        const c = core(() => { throw new Error('should not call'); });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2)).list({ kind: 'daemons', filter: 'all', limit: 25, offset: 0 }, 'tok');
        expect(dto.needs_org).toBe(true);
        expect(c.calls).toHaveLength(0);
    });

    it('daemons on API 3: hub-wide with status counts', async () => {
        const c = core((p, b) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'm1', display_name: 'MeasureOne' }], total: 1 } } : ({ ok: true, data: { items: b.limit === 1 ? [] : [{ id: 'd1', status: 'offline', realms: [{ id: 'r', slug: 'eu', org_slug: 'm1', name: 'EU' }] }], total: b.status === 'offline' ? 4 : b.status ? 1 : 64 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'daemons', filter: 'offline', limit: 25, offset: 0 }, 'tok');
        expect(c.calls[0].body).toMatchObject({ all: true, status: 'offline' });
        expect(dto.counts).toEqual({ all: 64, online: 1, stale: 1, offline: 4 });
        expect(dto.items[0]).toMatchObject({ id: 'd1', realms: [{ slug: 'eu', org_slug: 'm1' }] });
        expect(dto.hub_wide).toBe(true);
        expect(dto.org_options).toEqual([{ id: 'o1', slug: 'm1', display_name: 'MeasureOne' }]);
    });

    it('teams: listed / unlisted with counts', async () => {
        const c = core((_p, b) => ({ ok: true, data: { items: b.limit === 1 ? [] : [{ id: 't1', name: 'recon', scope: 'acme', listed: false, visibility: 'private', author: 'ana', latest_version: '1.2.0', install_count: 3, updated_at: 5 }], total: b.listed ? 96 : 116, offset: 0, limit: b.limit } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2)).list({ kind: 'teams', filter: 'unlisted', limit: 25, offset: 0 }, 'tok');
        expect(c.calls[0].body).toMatchObject({ listed: false });
        expect(dto.counts).toEqual({ listed: 96, unlisted: 116 });
        expect(dto.items[0]).toEqual({ id: 't1', name: 'recon', scope: 'acme', description: null, visibility: 'private', listed: false, install_count: 3, version_count: null, author_username: 'ana', updated_at: '1970-01-01T00:00:00.005Z', listed_without_version: false });
    });

    it('audit: older Core drops time/target filters and says so', async () => {
        const c = core(() => ({ ok: true, data: { entries: [{ id: 'a', admin_id: 'u', admin_username: 's', action: 'user.suspend', target_type: 'user', target_id: 't', details: {}, created_at: '2026-09-01T00:00:00Z' }], total: 1 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2)).list({ kind: 'audit', filter: 'all', since_ms: 5, target_id: 'x', action: 'user.suspend', limit: 50, offset: 0 }, 'tok');
        expect(c.calls[0]).toEqual({ path: '/internal/reports/audit', body: { action: 'user.suspend', limit: 50, offset: 0 } });
        expect(dto.unsupported).toEqual(['since', 'target']);
        expect(dto.items).toHaveLength(1);
    });

    it('audit on API 3 passes the time and target filters', async () => {
        const c = core(() => ({ ok: true, data: { entries: [], total: 0 } }));
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'audit', filter: 'all', since_ms: 5, target_id: 'x', limit: 50, offset: 0 }, 'tok');
        expect(c.calls[0].body).toEqual({ since_ms: 5, target_id: 'x', limit: 50, offset: 0 });
        expect(dto.unsupported).toEqual([]);
    });

    it('realms: hub-wide on API 3 with org picker; membership view before', async () => {
        const c = core((p) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'm1', display_name: 'M1' }], total: 1 } } : { ok: true, data: { items: [{ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'm1', created_by_username: 'sapan', created_at: 5 }], total: 1 } });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3)).list({ kind: 'realms', filter: 'all', query: 'pr', limit: 25, offset: 0 }, 'tok');
        expect(c.calls.find((x) => x.path === '/v1/realms/get')!.body).toMatchObject({ all: true, query: 'pr', sort_by: 'created_at' });
        expect(dto.items[0]).toEqual({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'm1', created_by_username: 'sapan', created_at: 5 });
        expect(dto.org_options).toHaveLength(1);
        const old = core(() => ({ ok: true, data: { items: [], total: 0 } }));
        const d2 = await new AdminPageService(new CoreReadRepository(old.client), compat(2)).list({ kind: 'realms', filter: 'all', limit: 25, offset: 0 }, 'tok');
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
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(3), () => NOW).list({ kind: 'runs', filter: 'failed', range: '24h', limit: 25, offset: 0 }, 'tok');
        const main = c.calls.find((x) => x.path === '/v1/runs/get' && x.body.limit === 25)!.body;
        expect(main).toMatchObject({ all: true, state: ['failed', 'crashed'], since_ms: Math.floor((NOW - 864e5) / 60000) * 60000 });
        expect(dto.items[0].realm).toEqual({ id: 'r1', slug: 'prod', org_slug: 'm1' });
        expect(dto.counts).toEqual({ all: 100, running: 3, awaiting_input: 3, failed: 7, completed: 3 });
        const old = await new AdminPageService(new CoreReadRepository(core(() => { throw new Error('no'); }).client), compat(2)).list({ kind: 'runs', filter: 'all', range: '24h', limit: 25, offset: 0 }, 'tok');
        expect(old.needs_org).toBe(true);
    });

    it('logs: hub-wide search with level facets', async () => {
        const c = core((p) => p === '/v1/realms/get' ? { ok: true, data: { items: [], total: 0 } } : { ok: true, lines: [{ id: 'l1', run_id: 'x1', level: 'error', message: 'boom', created_at: 9, realm_id: null }], total: 40, facets: { level: [{ value: 'error', count: 4 }, { value: 'info', count: 36 }] } });
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(2), () => NOW).list({ kind: 'logs', filter: 'all', range: '1h', query: 'boom', limit: 100, offset: 0 }, 'tok');
        const body = c.calls.find((x) => x.path === '/v1/runs/get_logs')!.body;
        expect(body).toMatchObject({ q: 'boom', limit: 100 });
        expect(body).not.toHaveProperty('realm_id');
        expect(dto.counts).toMatchObject({ all: 40, error: 4, info: 36, warn: 0 });
        expect(dto.items[0]).toMatchObject({ id: 'l1', level: 'error', realm: null });
    });

    it('workspaces and scopes map Core rows', async () => {
        const w = core((p) => p === '/v1/daemons/get' ? { ok: true, data: { items: [{ id: 'd1', name: 'mac' }], total: 1 } } : { ok: true, workspaces: [{ id: 'w1', path: '/src/app', daemon_id: 'd1', teams: [{ scope: 'acme', slug: 'recon' }], active_runs: [{}], latest_run: { run_id: 'x', state: 'running', started_at: 2 }, updated_at: 3 }], total: 1 });
        const wd = await new AdminPageService(new CoreReadRepository(w.client), compat(3)).list({ kind: 'workspaces', filter: 'all', limit: 25, offset: 0 }, 'tok');
        expect(wd.items[0]).toMatchObject({ id: 'w1', daemon_name: 'mac', teams: ['@acme/recon'], active_runs: 1 });
        const s = core((p) => p === '/v1/orgs/get' ? { ok: true, data: { orgs: [{ id: 'o1', slug: 'acme', display_name: 'Acme' }], total: 1 } } : { ok: true, data: { scopes: [{ id: 's1', slug: 'acme', display_name: 'Acme', org_id: 'o1', owner_username: 'ana', visibility: 'private', scope_type: 'org', team_count: '4', created_at: '2026-01-01' }], total: 1 } });
        const sd = await new AdminPageService(new CoreReadRepository(s.client), compat(2)).list({ kind: 'scopes', filter: 'all', limit: 25, offset: 0 }, 'tok');
        expect(sd.items[0]).toMatchObject({ slug: 'acme', org_slug: 'acme', team_count: 4 });
    });
});

describe('AdminPageService.list — search and sort reach Core in Core\'s names', () => {
    const empty = (path: string) => (path === '/v1/orgs/get' ? { ok: true, data: { orgs: [], total: 0 } } : { ok: true, data: { items: [], total: 0, scopes: [] } });
    const svc = (c: ReturnType<typeof core>) => new AdminPageService(new CoreReadRepository(c.client), compat(3), () => NOW);

    it('realms: Core-supported sort is forwarded; without one the page default (created_at desc) is sent', async () => {
        const c = core(empty);
        const dto = await svc(c).list({ kind: 'realms', filter: 'all', query: 'pay', sort_by: 'slug', sort_dir: 'asc', limit: 25, offset: 0 }, 'tok');
        expect(c.calls.find((x) => x.path === '/v1/realms/get' && x.body.limit === 25)?.body)
            .toEqual({ all: true, query: 'pay', sort_by: 'slug', sort_dir: 'asc', limit: 25, offset: 0 });
        expect(dto.sortable).toEqual(['slug', 'name', 'created_at', 'updated_at', 'created_by']);

        const c2 = core(empty);
        await svc(c2).list({ kind: 'realms', filter: 'all', limit: 25, offset: 50 }, 'tok');
        expect(c2.calls.find((x) => x.path === '/v1/realms/get' && x.body.limit === 25)?.body)
            .toEqual({ all: true, sort_by: 'created_at', sort_dir: 'desc', limit: 25, offset: 50 });
    });

    it('runs: sort_by team desc is forwarded to runs/get', async () => {
        const c = core(empty);
        const dto = await svc(c).list({ kind: 'runs', filter: 'all', range: 'all', sort_by: 'team', sort_dir: 'desc', limit: 25, offset: 0 }, 'tok');
        const page = c.calls.find((x) => x.path === '/v1/runs/get' && x.body.limit === 25)!;
        expect(page.body).toEqual({ all: true, sort_by: 'team', sort_dir: 'desc', limit: 25, offset: 0 });
        expect(dto.sortable).toContain('team');
    });

    it('on a Core older than API 6 the new sort keys are not sent and sortable is empty', async () => {
        for (const kind of ['accounts', 'daemons', 'teams', 'workspaces', 'scopes', 'audit'] as const) {
            const c = core(empty);
            const sort_by = { accounts: 'username', daemons: 'name', teams: 'name', workspaces: 'name', scopes: 'slug', audit: 'action' }[kind];
            const filter = kind === 'teams' ? 'listed' : 'all';
            const dto = await svc(c).list({ kind, filter, sort_by, sort_dir: 'asc', limit: 25, offset: 0 } as never, 'tok');
            expect(c.calls.some((x) => 'sort_by' in x.body || 'sort_dir' in x.body), kind).toBe(false);
            expect(dto.sortable, kind).toEqual([]);
        }
    });

    it.each([
        ['accounts', 'all', '/v1/users/get', 'username', ['username', 'role', 'created_at', 'suspended_at']],
        ['daemons', 'all', '/v1/daemons/get', 'last_heartbeat', ['name', 'status', 'last_heartbeat']],
        ['teams', 'listed', '/v1/teams/get', 'install_count', ['name', 'install_count', 'created_at', 'updated_at']],
        ['workspaces', 'all', '/v1/workspaces/get', 'name', ['name', 'created_at']],
        ['scopes', 'all', '/v1/orgs/get_scopes', 'team_count', ['slug', 'visibility', 'team_count', 'created_at']],
        ['audit', 'all', '/internal/reports/audit', 'action', ['created_at', 'action']],
    ] as const)('Core API 6: %s sends sort_by / sort_dir to Core and lists its sortable keys', async (kind, filter, path, sort_by, keys) => {
        const c = core(empty);
        const dto = await new AdminPageService(new CoreReadRepository(c.client), compat(6), () => NOW)
            .list({ kind, filter, sort_by, sort_dir: 'desc', limit: 25, offset: 50 } as never, 'tok');
        const page = c.calls.find((x) => x.path === path && x.body.limit === 25);
        expect(page?.body, kind).toMatchObject({ sort_by, sort_dir: 'desc', limit: 25, offset: 50 });
        // Chip counts never carry a sort.
        expect(c.calls.filter((x) => x.body.limit === 1).some((x) => 'sort_by' in x.body), kind).toBe(false);
        expect(dto.sortable).toEqual(keys);
    });

    it('scopes: the search goes to orgs/get_scopes as query', async () => {
        const c = core(empty);
        await svc(c).list({ kind: 'scopes', filter: 'all', query: 'acme', limit: 25, offset: 0 }, 'tok');
        expect(c.calls.find((x) => x.path === '/v1/orgs/get_scopes')?.body).toEqual({ query: 'acme', limit: 25, offset: 0 });
    });
});
