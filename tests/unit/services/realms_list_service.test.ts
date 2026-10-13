import { describe, it, expect, vi } from 'vitest';
import { RealmsListService } from '../../../src/services/realms_list_service.js';

const page = () => ({ ok: true, data: { total: 3, offset: 0, limit: 25, items: [
    { id: 'r-a', slug: 'a', online_daemons: 2 },
    { id: 'r-b', slug: 'b', online_daemons: 0 },
    { id: 'r-c', slug: 'c', online_daemons: 1 },
] } });

function mocks() {
    return {
        proxy: { forward: vi.fn().mockResolvedValue(page()) },
        teams: { get: vi.fn().mockImplementation(async ({ realm_id }: { realm_id: string }) => {
            if (realm_id === 'r-c') throw new Error('down');
            return { total: 3, items: [{ missing_agents: ['codex'] }, { missing_agents: [] }, { missing_agents: ['a', 'b'] }] };
        }) },
    };
}

describe('RealmsListService', () => {
    it('with_stats: realms with a daemon online gain teams_missing_agents; none online are skipped; a failed read leaves it out', async () => {
        const m = mocks();
        const res = await new RealmsListService(m.proxy as any, m.teams as any).get({ org_id: 'o1', with_stats: true }, 'tok', 'o1');
        expect(m.proxy.forward).toHaveBeenCalledWith('/v1/realms/get', { org_id: 'o1', with_stats: true }, 'tok', 'o1');
        expect(m.teams.get.mock.calls.map((c) => c[0])).toEqual([{ realm_id: 'r-a', limit: 100 }, { realm_id: 'r-c', limit: 100 }]);
        const items = (res.data as any).items;
        expect(items.map((r: any) => r.teams_missing_agents)).toEqual([2, undefined, undefined]);
        expect((res.data as any).total).toBe(3);
    });

    it('without with_stats (CLI, other callers): Core’s answer unchanged, no team reads', async () => {
        const m = mocks();
        const res = await new RealmsListService(m.proxy as any, m.teams as any).get({ query: 'a' }, 'tok');
        expect(res).toEqual(page());
        expect(m.teams.get).not.toHaveBeenCalled();
    });
});
