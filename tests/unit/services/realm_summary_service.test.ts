import { describe, it, expect, vi } from 'vitest';
import { RealmSummaryService } from '../../../src/services/realm_summary_service.js';

const REF = { org_slug: 'acme', slug: 'prod' };
const VIEWER = { user_id: 'u1', site_admin: false };

function mocks() {
    return {
        control: { realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme', description: 'Delivery', created_at: 1, updated_at: 2, created_by_username: 'sapan' }) },
        teams: { get: vi.fn().mockResolvedValue({ total: 2, items: [
            { scope: 'cliq', slug: 'hello-world', label: '@cliq/hello-world', version: '1.0.0', missing_agents: [], last_run_at: 100, origin: 'hub', update_available: true, latest_version: '1.1.0' },
            { scope: 'acme', slug: 'review', label: '@acme/review', version: null, missing_agents: ['coder'], last_run_at: 500, origin: 'cli', update_available: false, latest_version: null },
        ] }) },
        catalog: { get_by_id: vi.fn().mockResolvedValue({ description: 'Says hello' }) },
        daemons: { get: vi.fn().mockResolvedValue({ counts: { all: 3, online: 2, stale: 0, offline: 1 }, truncated: false, items: [
            { id: 'd1', name: 'mac', hostname: 'h', status: 'online' }, { id: 'd2', name: null, hostname: 'box', status: 'offline' },
        ] }) },
        settings: { get: vi.fn().mockResolvedValue({
            you: { role: 'admin', is_admin: true },
            members: [{ member_id: 'u1', username: 'sapan', role: 'admin', is_you: true }, { member_id: 'u2', username: 'lena', role: 'operator', is_you: false }, { member_id: 'u3', username: 'bo', role: 'operator', is_you: false }],
            invites: [{ invite_id: 'i1' }],
            sections: { members: { status: 'ok' }, invites: { status: 'ok' }, tokens: { status: 'ok' } },
        }) },
    };
}
const svc = (m: ReturnType<typeof mocks>) => new RealmSummaryService(m.control as any, m.teams as any, m.daemons as any, m.settings as any, m.catalog as any);

describe('RealmSummaryService', () => {
    it('header details, teams (with how many miss an agent), daemons online, people by role', async () => {
        const m = mocks();
        const s = await svc(m).get(REF, 'tok', VIEWER);
        expect(m.teams.get).toHaveBeenCalledWith({ ...REF, limit: 100 }, 'tok');
        expect(s.realm).toEqual({ description: 'Delivery', created_at: 1, updated_at: 2, created_by_username: 'sapan' });
        expect(s.teams).toMatchObject({ total: 2, missing_agents: 1, offset: 0, limit: 5 });
        // Most recently run first; the description comes from the catalog (Hub teams only), plus a newer version when there is one.
        expect(s.teams!.items.map((r) => [r.slug, r.last_run_at, r.description, r.latest_version])).toEqual([['review', 500, null, null], ['hello-world', 100, 'Says hello', '1.1.0']]);
        expect(m.catalog.get_by_id).toHaveBeenCalledTimes(1);
        expect(m.catalog.get_by_id).toHaveBeenCalledWith({ name: 'hello-world', scope: 'cliq' }, 'tok');
        expect(s.daemons).toEqual({ online: 2, total: 3, truncated: false, items: [{ id: 'd1', name: 'mac', status: 'online' }, { id: 'd2', name: 'box', status: 'offline' }] });
        expect(s.people).toMatchObject({ total: 3, offset: 0, limit: 5, by_role: { admin: 1, operator: 2 }, pending_invites: 1 });
        expect(s.people!.items.map((p) => p.username)).toEqual(['sapan', 'bo', 'lena']);
        expect(s.you).toEqual({ role: 'admin', is_admin: true });
    });

    it('pages: teams and members come 5 at a time from the offset; a missing description is just null', async () => {
        const m = mocks();
        m.teams.get.mockResolvedValue({ total: 7, items: Array.from({ length: 7 }, (_, i) => ({ scope: 'acme', slug: `t${i}`, label: `@acme/t${i}`, version: '1', missing_agents: [], last_run_at: 100 - i, origin: 'hub', update_available: false, latest_version: null })) });
        m.catalog.get_by_id.mockRejectedValueOnce(new Error('gone')).mockResolvedValue({ description: 'd' });
        const s = await svc(m).get(REF, 'tok', VIEWER, { teams_offset: 5, members_offset: 0 });
        expect(s.teams!.items.map((r) => [r.slug, r.description])).toEqual([['t5', null], ['t6', 'd']]);
        expect(s.teams).toMatchObject({ total: 7, offset: 5 });
    });

    it('a part that fails is null; invites the viewer can’t see are null; the realm gate still fails the call', async () => {
        const m = mocks();
        m.daemons.get.mockRejectedValue(new Error('down'));
        m.settings.get.mockResolvedValue({ ...(await m.settings.get()), sections: { members: { status: 'ok' }, invites: { status: 'error' }, tokens: { status: 'error' } } });
        const s = await svc(m).get(REF, 'tok', VIEWER);
        expect(s.daemons).toBeNull();
        expect(s.people?.pending_invites).toBeNull();
        m.control.realm_by_slug.mockRejectedValue(Object.assign(new Error('no'), { status: 404 }));
        await expect(svc(m).get(REF, 'tok', VIEWER)).rejects.toMatchObject({ status: 404 });
    });
});
